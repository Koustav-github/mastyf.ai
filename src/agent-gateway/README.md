# Agent Gateway external processing service

A Google Agent Gateway Service Extension that authorizes MCP tool calls using the
existing Mastyf policy engine. Runs as its own container on Cloud Run.

## What it speaks

```
package:  envoy.service.ext_proc.v3
service:  ExternalProcessor
method:   Process(stream ProcessingRequest) returns (stream ProcessingResponse)
```

`CONTENT_AUTHZ` is Google's profile name for wiring an external authorizer in at
this point. It is not a field in the Envoy proto; the wire contract above is
standard `ext_proc`.

## Target: MCP egress (`AGENT_TO_ANYWHERE`)

Agent Gateway has two paths, and they carry different payloads:

| Gateway path | Traffic | Tool-call shape | Fit |
| --- | --- | --- | --- |
| `AGENT_TO_ANYWHERE` egress, `protocols: [MCP]` | agent -> MCP server | MCP JSON-RPC `tools/call` | **Target.** `parseToolCall` is written for this. |
| `CLIENT_TO_AGENT` ingress | client -> agent | ADK `reasoningEngines.streamQuery` or OpenAI chat completions | Not implemented. |

This service authorizes **egress** tool calls only. Point it at a gateway
configured for `AGENT_TO_ANYWHERE` with `protocols: [MCP]`. Ingress traffic is a
different payload shape and this extension will deny it as `unrecognised-payload`
until an extractor is added.

## Authorization surface: identity is NOT enforced here

An earlier draft of this README treated caller identity as an unsolved blocker
and planned to pull an mTLS SPIFFE ID into `CallContext.agentIdentity.sub` via
`AuthzExtension.forwardAttributes` / `ProcessingRequest.attributes`. Researching
the current docs (2026-09) retired that plan. Three independent reasons:

1. **`forwardAttributes` is not an Agent Gateway feature.** It is documented for
   Application Load Balancers only; Agent Gateway is absent from the supported
   attributes list. The Agent Gateway delegate-authorization page contains no
   occurrence of `forwardAttributes`, `client_cert`, or `spiffe` at all.
2. **The gateway terminates mTLS.** Google states that when the agent reaches
   Agent Gateway it authenticates with mTLS, but "the gateway terminates mTLS, so
   DPoP must be used" for anything beyond it. Client-certificate attributes
   ("populated only if you have enabled mTLS and the client presents a
   certificate") are therefore not a reliable input at the extension.
3. **Agent Identity is enforced upstream, not here.** Each agent holds a
   first-class SPIFFE ID (`spiffe://agents.global.org-<org>.system.id.goog/...`)
   backed by a Google-minted 24h X.509 cert, and
   `identity_type = "AGENT_IDENTITY"` is *required* whenever
   `agent_gateway_config` is set. In egress, the enforced order is:

   ```
   IAM + IAP policy verification  ->  Agent Registry  ->  content (this service)
   ```

   IAP evaluates IAM Unified Access Policies against the agent's
   `principal://` SPIFFE ID, and traffic from unidentified agents is blocked by
   default. So *which agent is calling* is already settled fail-closed before a
   single byte reaches this extension.

**Consequence for the design.** This service is a **content** authorizer, and only
a content authorizer. It answers "is this tool call, with these arguments,
permitted?" -- not "who is calling?". Per-agent authorization belongs in IAM
Unified Access Policies (`principal://agents.global...`) evaluated by IAP, where
the agent identity is a first-class policy principal.

`agentIdentity` therefore stays **optional and best-effort**, used for audit
attribution only. It is never a precondition for a verdict, and its absence must
never turn into a denial. `flowSessionIsUnattributed()` already covers that: an
unattributed caller degrades to `anon` and the loop-guard's deny is downgraded to
flag rather than blocking pooled traffic. Nothing in `server.ts` populates it
today, and that is the correct state -- do not add a speculative header parse to
"fix" it.

The one thing genuinely worth confirming with Google is whether Agent Gateway
ever populates *any* caller-identity field for a custom `CONTENT_AUTHZ`
extension. The docs do not say either way, which is a documentation gap rather
than a stated limitation.

## Compliance requirements from Google's docs

Custom, user-managed `CONTENT_AUTHZ` ext_proc authorization **is supported and
documented** -- this is a supported deployment shape, not a workaround. Two
things are **mandatory** for the `CONTENT_AUTHZ` profile and drove the design:

1. **`FULL_DUPLEX_STREAMED` for body events.** The gateway requires it. (An
   earlier version of this service used a request-only `BUFFERED` flow and would
   have been rejected.)
2. **Handle every `ext_proc` event** -- request headers, request body, response
   headers, response body, and trailers. Response events are acknowledged, not
   inspected.

The stream therefore stays open across the whole exchange:

```
requestHeaders -> requestBody* -> [decision] -> responseHeaders -> responseBody* -> trailers
```

Properties this relies on:

- **One response per message, in order.** Messages are handled on a serial queue so
  an async policy decision cannot let a later response overtake an earlier one.
- **The whole request is buffered, then the verdict is emitted as an ordered
  sequence.** A `tools/call` is a bounded JSON document that can span chunks, so a
  decision is only reachable once the terminal signal arrives. The cap is applied
  *incrementally*, so an oversized stream is refused while arriving rather than
  after it is fully in memory.
- **The terminal signal is either `end_of_stream` or request trailers**, and the two
  are mutually exclusive. Either one triggers the decision; the other is the
  stream's terminator.
- **An allowed request is replayed, not skipped.** The buffered body is sent back
  as `BodyMutation.streamed_response`, and the buffered headers as
  `request_headers`. An empty `ProcessingResponse` is *not* a pass-through for body
  events -- it forwards an empty body, silently discarding the request.
- **Response events are echoed, not inspected.** The upstream body is replayed
  verbatim; content is never read for policy purposes, so this service cannot
  become a response-exfiltration path.
- **A body reply is capped at 64 KiB** per `ProcessingResponse`, and Google caps
  `ProcessingResponse` at 128 KiB. Re-chunking is explicitly permitted, so the
  buffered body is re-split rather than echoed in the inbound chunk boundaries.

## Decisions

| Situation | Response | HTTP status |
| --- | --- | --- |
| Policy allows the tool call | ordered `request_headers` + `streamed_response` | request proceeds with original bytes |
| Policy blocks the tool call | `ImmediateResponse` | mapped from the verdict, default `403` |
| Payload is not a `tools/call` | `ImmediateResponse` | `403` (`unauthorised-method`) |
| Payload unparseable or unrecognised | `ImmediateResponse` | `403` (`unrecognised-payload`) |
| Streamed body over 8 MiB | `ImmediateResponse` | `403` (`payload-too-large`) |
| Policy engine throws | `ImmediateResponse` | `403` (`POLICY_ENGINE_ERROR`) |
| Decision exceeds the timeout | `ImmediateResponse` | `403` (`DECISION_TIMEOUT`) |
| Arguments over the scan cap | `ImmediateResponse` | `403` (`arguments-too-large-for-authorization`) |
| Data plane ends the stream before a verdict | `ImmediateResponse` | `403` (`STREAM_CLOSED_MID_REQUEST`) |
| Flow-control-only message | `server_window_update` only | no spurious `ProcessingResponse` |
| `request_trailers` arriving after the body already completed | `request_trailers` | no stall |

**Allow is a replay, not silence.** The `ProcessingResponse` for an allowed request
is never empty: an empty body ack would forward an empty body. The response phase
echoes headers, body, and trailers without inspecting content, so it cannot be
repurposed as a response-exfiltration path.

**Unknown means deny.** An unrecognised payload is not "not a tool call, so
fine" -- it is a payload this service cannot reason about. Each case has its own
rule string so it shows up in logs rather than passing silently.

**The orchestrator's exit code is not an HTTP status.** `evaluateToolCallDefense`
is transport-agnostic and reports MCP/JSON-RPC codes such as `-32001`, which are
not valid HTTP statuses. `toHttpStatus` maps anything outside `400..599` to `403`
and preserves the original code in the response body for traceability.

**`HttpStatus` is a message.** `ImmediateResponse.status` wraps the `StatusCode`
enum, so the wire form is `status: { code: 403 }`. A bare `status: 403` fails at
serialisation time with `Error 13 INTERNAL: ...status: object expected`.

## Fail-closed

Three layers:

1. **In-process:** engine errors, malformed verdicts, timeouts, the streamed body
   cap, and a stream that ends before a verdict all produce a deny.
2. **Fallback policy:** with no `MASTYF_AI_POLICY_PATH`, the built-in policy is
   deny-all (`default_action: block`), not allow-all. The engine resolves an
   unmatched call to `default_action`, so a `pass` default here would authorise
   everything. A loud startup error makes the deny-all state obvious.
3. **Envoy-side:** the Agent Gateway extension is registered with `failOpen: false`.

A denial is returned as `403` even for internal faults, matching the stdio
transport's existing fail-closed behaviour so the two transports agree on
verdicts. The trade-off is that `403` and a genuine policy denial look alike
from outside; the distinguishing `details` string is what to read in logs.

### What was verified against a real Envoy

`tests/agent-gateway/envoy-integration.test.ts` runs `envoyproxy/envoy:v1.34` in
Docker with this service as the real `ext_proc` filter and a recording upstream,
so a bypass is observable rather than inferred. Measured, not read from docs:

| Scenario | `failure_mode_allow: false` | `failure_mode_allow: true` |
| --- | --- | --- |
| Allowed call | request forwarded, upstream sees the original bytes, upstream response returned | -- |
| Denied call | `403`, upstream never reached | -- |
| Body over 400 kB (multi-chunk) | reassembled byte-for-byte | -- |
| Authorizer unreachable | **`500` -- request refused** | **`200` -- request admitted** |
| Authorizer closes the stream cleanly | **`200` -- request admitted** | -- |
| Authorizer never answers | **hangs indefinitely -- no response at all** | hangs indefinitely |
| Authorizer process dies mid-decision (real shutdown path) | **`500` -- request refused** | -- |

Three of those rows are surprises, and two of them are the reason this section
exists.

**A clean close is admitted.** `failure_mode_allow: false` covers establishment
failure, error closes, timeouts, and spurious responses -- but the `ext_proc`
contract defines a *cleanly* closed stream as "the data plane proceeds without
consulting the server". A shutdown that ends the gRPC stream cleanly therefore
admits the in-flight request, and the flag does not protect it.

**Destroying the stream is not enough.** Calling `call.destroy(error)` on an
undecided call does *not* register as a failure. Envoy's `streams_failed` counter
stays at `0` and the request parks in `upstream_rq_pending` forever -- so a
destroy on its own trades a bypass for an outage. What actually fails the request
closed is the **connection dying**, which the data plane sees as a transport
failure. That is why shutdown destroys the undecided calls *and then* exits: the
destroy keeps the stream from being closed cleanly, and the exit is what Envoy
notices. `destroyUndecidedCalls` is covered by the last row above.

**There is no data-plane ceiling.** A silent authorizer is never timed out --
`grpc_service.timeout` (10 s in the test config) is not honoured and
`message_timeout` does not apply in `FULL_DUPLEX_STREAMED`, which Envoy's own
`message_timeouts` counter confirms by staying at `0`. Only `MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS`
bounds a decision, and it is enforced in-process because it has to be.

Consequences for the rollout:

- `MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS` is a security control, not a tuning
  knob. It is the only thing standing between a hung policy engine and an
  indefinite hang.
- On SIGTERM the process destroys undecided calls before draining, so a redeploy
  fails in-flight requests closed instead of admitting them.
- Treat a Cloud Run instance draining as a signal to stop accepting new work, so
  undecided requests are re-sent rather than refused.
- Do not rely on `failOpen: false` alone as the control in a security review; the
  flag bounds *connection* failures, not the clean-close path.

> **Still unverified:** Google's `FULL_DUPLEX_STREAMED` docs note the proxy
> "fail-opens up to the first chunk of body data". That describes the `failOpen:
> true` path, and every official Google sample uses `false`, but the exact
> gateway-side boundary has not been exercised against a live Agent Gateway --
> only against Envoy directly. Envoy's behaviour cannot settle Google's.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Cloud Run sets this |
| `MASTYF_AI_POLICY_PATH` | *(deny-all fallback)* | Mastyf policy YAML |
| `MASTYF_AGENT_GATEWAY_SERVER_NAME` | `agent-gateway` | Fallback MCP server name |
| `MASTYF_AI_TENANT` | `default` | Fallback tenant |
| `MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS` | `5000` | Ceiling on one decision |
| `MASTYF_AGENT_GATEWAY_MAX_SCANNED_ARGUMENT_BYTES` | `32768` | Largest argument set sent to the engine (see below) |

Per-request overrides: `x-mastyf-tenant`, `x-mastyf-server`, `x-request-id`.
The MCP server name is otherwise derived from the `:path` segment.

### Keep the extension timeout above the decision timeout

If the extension timeout fires before our decision finishes, the gateway returns an
opaque 5xx. If ours fires first, the caller gets a `403` whose `details` say
`DECISION_TIMEOUT`. The second is a diagnosable refusal; the first reads like a
gateway fault. Google's samples use a 1s extension timeout against our 5s default,
so the extension timeout has to be raised before this ships.

**But do not count on it.** The measurement above says `grpc_service.timeout` is not
honoured at all in `FULL_DUPLEX_STREAMED` against Envoy: a silent authorizer hangs
forever with a 10s timeout configured. Treat the extension timeout as defence in
depth against an unusually slow proxy, not as the enforcement mechanism. The
enforcement is `MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS`, running in our process.

### Argument size drives authorization cost

`scanForSecrets` runs 268 rules as 268 independent full-string passes over the
stringified arguments, so decision cost is linear in argument size with a large
constant. Measured end to end on this machine, through a real `PolicyEngine`:

| Serialized arguments | Decision time | Outcome |
| --- | --- | --- |
| ~1 kB | ~131 ms | allowed |
| ~8 kB | ~646 ms | allowed |
| ~32 kB (just under the cap) | **~3.6 s** | allowed |
| over the 32 KiB cap | ~0 ms | denied, engine never consulted |

That table is the whole argument for `MAX_SCANNED_ARGUMENT_BYTES`. Without the cap
the tail is unbounded: 50 kB took ~6.5 s and 200 kB had not finished in 40 s. With
it, the worst case is a measured ~3.6 s and an oversized call is refused in
milliseconds without the engine ever running.

Two things follow, and both are prerequisites rather than follow-ups:

- **The guard is a `Promise.race` on a timer, and the scan is synchronous.** It
  blocks the event loop, so the timeout *cannot fire while the scan runs*. Bounding
  the input is what makes the timeout meaningful; the timeout alone never was.
- **The worst case is ~3.6 s against a 5 s decision timeout.** That leaves ~1.4 s of
  headroom, which is thin. The 32 KiB cap and the 5 s timeout are only safe together
  because the cap was chosen from this measurement; changing either one invalidates
  the other. Raise the extension timeout to at least 10 s for margin, but note it is
  not what bounds the work.

The cap is a real cost: a legitimate `write_file` or long query over 32 KiB of
arguments is refused with `arguments-too-large-for-authorization`. That is
deliberately a *refusal* and not a truncation -- scanning a prefix would leave the
tail uninspected, which is a security hole wearing a performance fix's clothing.
Raising the cap means re-measuring, and raising the decision and extension timeouts
with it. The better fix is bounding the scanner itself (a worker thread with a hard
terminate, or a prefilter that provably cannot drop a rule).

Note this cost is in *arguments*, not body size. A 400 kB body with a small
`arguments` object authorizes in ~120 ms, which is why the Envoy multi-chunk test
pads outside `arguments`.

## Running locally

```bash
npx tsc --project tsconfig.json
MASTYF_AI_POLICY_PATH=default-policy.yaml PORT=8099 node dist/agent-gateway/index.js
```

gRPC only, so there is no HTTP/1.1 listener to `curl`. An agent binds to a gateway
at creation, so end-to-end validation needs a real bound agent rather than a
hand-crafted request.

## Tests

```bash
npx vitest run tests/agent-gateway/
```

`ext-proc-grpc.test.ts` drives a real client against a real server over the real
vendored protos. It is the only kind of test that can catch a malformed
`ImmediateResponse` or a mishandled oneof, because both only fail when protobufjs
serialises the bytes. In particular, request headers and request body must be
written as two separate messages -- `ProcessingRequest` carries one field of the
`request` oneof, so combining them silently drops one.

`envoy-integration.test.ts` needs Docker and runs the real Envoy filter. It is the
only kind of test that can catch a fail-open, because fail-open is a property of
what the data plane does with a bad or absent answer, not of the answer itself.

Test doubles passed to `evaluateToolCallDefense` must expose `evaluateAsync`, not
the sync `evaluate`. A double exposing only `evaluate` still fails closed, but
through a `TypeError` for a missing method -- so it would prove nothing about the
throw and malformed-decision paths it appears to cover.

## Deploying

The gateway targets a **fully qualified domain name** over HTTP/2 TLS on port
443, and does **not** validate the server certificate. Google recommends keeping
the extension endpoint inside the VPC with DNS peering. A public Cloud Run
`run.app` URL technically satisfies "FQDN on 443" but leaves the authorizer
reachable by anyone who can intercept the path -- a poor look in a security
review. Prefer private ingress / PSC or a VPC-scoped FQDN.

```bash
gcloud run deploy mastyf-agent-gateway \
  --image=REGION-docker.pkg.dev/mastyf/agent-gateway/agw:latest \
  --region=REGION \
  --port=8080 \
  --ingress=internal-and-cloud-load-balancing \
  --no-allow-unauthenticated \
  --set-env-vars MASTYF_AI_POLICY_PATH=/app/default-policy.yaml
```

Cloud Run health checks must be TCP; there is no HTTP listener.

Register the extension and the authorization policy with `failOpen: false`,
scoped to tool-call traffic only. Ready-to-edit manifests are checked in:

- `deploy/agent-gateway-authz-extension.yaml`
- `deploy/agent-gateway-authz-policy.yaml`

A broad `/` match also sends sessions, telemetry, and unrelated calls -- and
because this service denies anything it cannot parse, that would break the MCP
handshake outright. The checked-in policy forwards `tools/call` only, so
base-protocol RPCs negotiate normally and never reach the authorizer.

```bash
# The extension import is beta; the policy import is not.
gcloud beta service-extensions authz-extensions import mastyf-agw \
  --source=deploy/agent-gateway-authz-extension.yaml --location=LOCATION
gcloud network-security authz-policies import mastyf-agw \
  --source=deploy/agent-gateway-authz-policy.yaml --location=LOCATION
```

Model Armor must **not** also be enabled on this gateway: Google reserves
`CONTENT_AUTHZ` for a single provider per gateway, and for ingress the supported
providers are Model Armor or the Semantic Governance policy engine.

The extension's `timeout` must exceed `MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS`
(see Configuration) -- the two are separate deadlines and the gateway's must be
the outer one.

### Which gateway mode

Use **`AGENT_TO_ANYWHERE` (egress)**, which this service targets. Beyond the
payload shape, it is also the mode that supports this authorization design:
egress allows up to four custom authorization policies per gateway, whereas
ingress allows a single `CONTENT_AUTHZ` policy and Google states that "other
types of service extensions are not supported for ingress".

## Open questions for Google

All three are **live-infrastructure** questions, not support blockers. Nothing
here prevents deploying: custom `CONTENT_AUTHZ` ext_proc authorization is
documented and supported, and this service already implements the mandated
`FULL_DUPLEX_STREAMED` protocol.

- The gateway-side fail-open window (see Fail-closed). Envoy's behaviour is now
  measured, but the proxy in front of it is not, and Google's own docs describe a
  first-body-chunk boundary that only a live Agent Gateway can confirm.
- Whether the gateway ever presents the MCP body unwrapped in egress mode, or
  whether ingress uses a different envelope. The extractor in
  `decision-core.ts` (`parseToolCall`) is the single place to widen.
- Whether Agent Gateway populates **any** caller-identity field for a custom
  `CONTENT_AUTHZ` extension. This is the one real documentation gap: identity is
  enforced upstream by IAP, so it is not needed for the security guarantee, but
  it would let audit logs attribute a verdict to a specific agent.
- Whether a public Cloud Run endpoint is accepted for a `CONTENT_AUTHZ` extension
  target, or whether the endpoint must be VPC-internal. Prefer VPC-internal
  either way, since the gateway does not validate the server certificate.

## Known issues, measured

- **`failure_mode_allow: false` does not cover a clean stream close.** Proven, not
  theorised: the request is admitted. Shut down by destroying undecided calls and
  then exiting, which fails the request closed instead. See Fail-closed.
- **Nothing in the extension config bounds a hung authorizer.** Proven: a silent
  authorizer with a 10s `grpc_service.timeout` hangs forever, and `message_timeout`
  does not apply in `FULL_DUPLEX_STREAMED`. The in-process decision timeout is the
  only ceiling that exists.
- **Destroying an undecided stream is not sufficient on its own** -- Envoy does not
  register it as a failure and parks the request indefinitely. The process exit that
  follows is what fails the request closed. See Fail-closed.
- **Authorization cost scales with argument size**, and the decision timeout cannot
  interrupt the synchronous scan. Bounded by a 32 KiB cap, worst case measured at
  ~3.6 s against a 5 s timeout. See Configuration.
- **`policy_decision` audit logs contain the full tool arguments.** The decision is
  written to the structured log and SIEM with `context`, arguments included, so
  every MCP call through this gateway puts its arguments into the log stream and
  the SIEM. If arguments can carry customer data or credentials, that is a data
  exposure created by routing all agent traffic through this path, and it needs
  redaction before production.
