import type { IncomingMessage, ServerResponse } from 'http';
import type { ProxyManager } from '../proxy/proxy-manager.js';
import { Logger } from './logger.js';
import { RequestIdLock } from './request-id-lock.js';

const mcpSerialQueue = new RequestIdLock();

export async function relayMcpHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  proxyManager: ProxyManager,
): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString('utf-8').trim();

  if (!body) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Empty request body' } }));
    return;
  }

  let parsed: { id?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
    return;
  }

  const proxies = proxyManager.getProxies();
  if (proxies.length === 0) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id ?? null, error: { code: -32003, message: 'No proxy available' } }));
    return;
  }

  const proxy = proxies[0];
  const requestId = parsed.id;

  // A notification (no id) and a batch get no single reply with a matching id. Waiting for
  // one held the serial queue for the full timeout and made every request behind it time
  // out too. Notifications get 202 Accepted (MCP Streamable HTTP); a batch gets the replies
  // to its requests, as a JSON array.
  if (Array.isArray(parsed)) {
    await relayBatch(body, parsed as unknown[], res, proxy);
    return;
  }
  if (requestId === undefined || requestId === null) {
    await mcpSerialQueue.enqueue(undefined, async () => {
      await proxy.handleClientInput(body);
    });
    res.writeHead(202);
    res.end();
    return;
  }

  await mcpSerialQueue.enqueue(undefined, async () => {
    const originalWrite = process.stdout.write.bind(process.stdout);
    let capturedResponse: string | null = null;
    let resolvePromise: ((val: string) => void) | null = null;
    const responsePromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    const interceptedWrite = (chunk: unknown) => {
      const str = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : String(chunk);
      const lines = str.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === requestId || msg.id == requestId) {
            capturedResponse = line;
            if (resolvePromise) resolvePromise(line);
            break;
          }
        } catch {
          /* not json */
        }
      }
      return true;
    };

    const timeoutMs = 15000;
    try {
      process.stdout.write = interceptedWrite as typeof process.stdout.write;
      void proxy.handleClientInput(body);

      const result = await Promise.race([
        responsePromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeoutMs),
        ),
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(result);
    } catch {
      if (capturedResponse) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(capturedResponse);
      } else {
        Logger.warn(`[mcp-relay] Request ${JSON.stringify(requestId)} timed out after ${timeoutMs}ms`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: requestId ?? null,
            error: { code: -32003, message: 'No response from proxy' },
          }),
        );
      }
    } finally {
      process.stdout.write = originalWrite;
    }
  });
}

/** Forward a batch and answer with the replies to its requests (notifications get none). */
async function relayBatch(
  body: string,
  entries: unknown[],
  res: ServerResponse,
  proxy: { handleClientInput(raw: string): Promise<void> },
): Promise<void> {
  const ids = entries
    .map((entry) => (entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined))
    .filter((id): id is string | number => id !== undefined && id !== null);
  const replies = new Map<string, string>();

  await mcpSerialQueue.enqueue(undefined, async () => {
    const originalWrite = process.stdout.write.bind(process.stdout);
    let done: (() => void) | null = null;
    const allReplied = new Promise<void>((resolve) => {
      done = resolve;
    });
    process.stdout.write = ((chunk: unknown) => {
      const str = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : String(chunk);
      for (const line of str.split('\n').filter((l) => l.trim())) {
        try {
          const msg = JSON.parse(line) as { id?: unknown };
          const key = JSON.stringify(msg.id);
          if (ids.some((id) => JSON.stringify(id) === key)) replies.set(key, line);
        } catch {
          /* not json */
        }
      }
      if (replies.size >= ids.length && done) done();
      return true;
    }) as typeof process.stdout.write;

    try {
      await proxy.handleClientInput(body);
      if (ids.length > 0 && replies.size < ids.length) {
        await Promise.race([allReplied, new Promise((resolve) => setTimeout(resolve, 15000))]);
      }
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  if (ids.length === 0) {
    res.writeHead(202);
    res.end();
    return;
  }
  const answered = ids.map((id) => replies.get(JSON.stringify(id))).filter((line): line is string => !!line);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(`[${answered.join(',')}]`);
}
