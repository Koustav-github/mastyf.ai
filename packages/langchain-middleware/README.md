# @mastyf_ai/langchain-middleware

LangChain middleware adapter for mastyf.ai — the open-source MCP runtime security proxy.

Every tool call your LangChain agent makes is checked by a running Mastyf proxy before the tool executes.

## Install

```bash
npm install @mastyf_ai/langchain-middleware
```

## Usage

Start a Mastyf proxy (it listens on `http://localhost:4000` by default), then wrap your tools:

```ts
import { createMastyfToolWrapper } from '@mastyf_ai/langchain-middleware';

const secureTools = tools.map((tool) =>
  createMastyfToolWrapper(tool, {
    proxyUrl: 'http://localhost:4000',
    apiKey: process.env.MASTYF_AI_API_KEY,
  }),
);
```

A denied call throws an error whose `mastyfEvaluation` explains why. To check calls from a callback instead, use `createMastyfAgentCallback(config)`.

## Modes and failure behaviour

| Option | Default | Meaning |
|---|---|---|
| `mode` | `'block'` | `block`: run only what the policy allows. `warn`: log denials and run anyway. `audit`: don't check. |
| `failOpen` | `false` | When the proxy is unreachable, errors, times out or answers unexpectedly, the call is **blocked**. Set `true` to let it run instead. |
| `skipTools` | `[]` | Tool names that are not checked. |
| `timeoutMs` | `10000` | How long to wait for the proxy. |

## Related

- [mastyf.ai](https://github.com/mastyf-ai/mastyf.ai) — Main project
- [Cloud dashboard](https://www.mastyf.ai/dashboard) — Policy editor and fleet management
- [Python SDK](https://pypi.org/project/mastyf-ai/)
