# @mastyf_ai/openai-agents-middleware

OpenAI Agents SDK middleware for mastyf.ai — the open-source MCP runtime security proxy.

Every tool call your agent makes is checked by a running Mastyf proxy before the tool executes.

## Install

```bash
npm install @mastyf_ai/openai-agents-middleware
```

## Usage

Start a Mastyf proxy (it listens on `http://localhost:4000` by default), then wrap your tool
**definitions** and build the tools from them. A denied call throws an error with
`mastyfBlocked: true` inside the tool instead of running it.

```ts
import { Agent, tool } from '@openai/agents';
import { z } from 'zod';
import { wrapToolsWithMastyfGuard } from '@mastyf_ai/openai-agents-middleware';

const definitions = wrapToolsWithMastyfGuard(
  [
    {
      name: 'read_file',
      description: 'Read a file from the project',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => readFile(path, 'utf8'),
    },
  ],
  { proxyUrl: 'http://localhost:4000', apiKey: process.env.MASTYF_AI_API_KEY },
);

const agent = new Agent({ name: 'assistant', tools: definitions.map((d) => tool(d)) });
```

Wrap the definitions, not the tools `tool()` returns: the SDK runs a tool through its own
`invoke`, so replacing `execute` on a built tool has no effect.

`createMastyfGuardMiddleware` returns a `beforeToolCall(...)` check you can call yourself.
The OpenAI Agents SDK has no `middleware` option, so passing it as
`new Agent({ middleware: [guard] })` does nothing.

## Modes and failure behaviour

| Option | Default | Meaning |
|---|---|---|
| `mode` | `'block'` | `block`: run only what the policy allows. `warn`: log denials and run anyway. `audit`: don't check. |
| `failOpen` | `false` | When the proxy is unreachable, errors, times out or answers unexpectedly, the call is **blocked**. Set `true` to let it run instead. |
| `blockedTools` | `[]` | Tool names that are always denied, without asking the proxy. |
| `timeoutMs` | `10000` | How long to wait for the proxy. |

## Related

- [mastyf.ai](https://github.com/mastyf-ai/mastyf.ai) — Main project
- [Cloud dashboard](https://www.mastyf.ai/dashboard) — Policy editor and fleet management
- [Python SDK](https://pypi.org/project/mastyf-ai/)
