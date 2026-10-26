# @mastyf_ai/openai-agents-middleware

OpenAI Agents SDK middleware for mastyf.ai — the open-source MCP runtime security proxy.

Every tool call your agent makes is checked by a running Mastyf proxy before the tool executes.

## Install

```bash
npm install @mastyf_ai/openai-agents-middleware
```

## Usage

Start a Mastyf proxy (it listens on `http://localhost:4000` by default), then add the guard:

```ts
import { createMastyfGuardMiddleware } from '@mastyf_ai/openai-agents-middleware';

const guard = createMastyfGuardMiddleware({
  proxyUrl: 'http://localhost:4000',
  apiKey: process.env.MASTYF_AI_API_KEY,
});

const agent = new Agent({
  name: 'assistant',
  tools: [searchTool, fileReadTool],
  middleware: [guard],
});
```

Or wrap the tools themselves; a denied call throws an error with `mastyfBlocked: true`:

```ts
import { wrapToolsWithMastyfGuard } from '@mastyf_ai/openai-agents-middleware';

const tools = wrapToolsWithMastyfGuard([searchTool, fileReadTool], { proxyUrl: 'http://localhost:4000' });
```

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
