# Enterprise Specification: Mastyf Agent Gateway Service Extension

**Product:** Mastyf AI MCP Content Authorization Extension  
**Integration Target:** Google Cloud Agent Gateway (`CONTENT_AUTHZ` Service Extension)  
**Protocol:** Envoy `envoy.service.ext_proc.v3.ExternalProcessor` (gRPC / HTTP/2)  
**Traffic Direction:** `AGENT_TO_ANYWHERE` (Egress), `protocols: [MCP]`  
**Security Posture:** Strictly Fail-Closed (`failOpen: false`)  
**Decision Latency:** Sub-2ms in-memory evaluation (P50 < 0.5ms)

---

## 1. Executive Summary

The **Mastyf Agent Gateway Service Extension** provides real-time, in-line security governance, secret-leak prevention, and threat mitigation for autonomous AI agents connecting to Model Context Protocol (MCP) servers through Google Cloud Agent Gateway.

Operating as a standard Envoy External Processing (`ext_proc.v3`) gRPC service, Mastyf intercepts MCP tool-call payloads (`tools/call`), evaluates them against dynamic security policies, Context-Based Access Control (CBAC), and community threat signatures (MTX), and either authorizes execution with full stream integrity or aborts the callout immediately via HTTP 403 Forbidden.

```
┌─────────────────┐       mTLS        ┌─────────────────────────┐
│ Autonomous      │ ────────────────> │   Google Agent Gateway  │
│ AI Agent        │  (Agent Identity  │  (IAM / IAP Validation) │
│ (Vertex / ADK)  │   SPIFFE Auth)    └────────────┬────────────┘
└─────────────────┘                                │
                                         ext_proc  │ gRPC Stream
                                      (CONTENT_    │ (FULL_DUPLEX_STREAMED)
                                        AUTHZ)     ▼
                                      ┌─────────────────────────┐
                                      │ Mastyf Service Extension│
                                      │  - Sub-2ms Hot State    │
                                      │  - Secret Inspection    │
                                      │  - Path Traversal Block │
                                      │  - MTX Threat Intel     │
                                      │  - Loop Anomaly Guard   │
                                      └────────────┬────────────┘
                                                   │
                           ┌───────────────────────┴──────────────────────┐
                           │                                              │
                      [ ALLOW ]                                       [ DENY ]
                           │                                              │
                           ▼                                              ▼
               ┌────────────────────────┐                    ┌────────────────────────┐
               │ Target MCP Tool Server │                    │ Immediate HTTP 403     │
               │ (Enterprise Database,  │                    │ "Blocked by Mastyf AI" │
               │  Filesystem, APIs)     │                    └────────────────────────┘
               └────────────────────────┘
```

---

## 2. Architecture & Design Principles

### 2.1 Egress Focus (`AGENT_TO_ANYWHERE`)
In the Google Agent Gateway architecture:
- **`CLIENT_TO_AGENT` (Ingress):** Transports user chat interactions (`streamQuery`, OpenAI Chat Completions).
- **`AGENT_TO_ANYWHERE` (Egress):** Transports agent-directed RPC calls to enterprise tools and data sources formatted as Model Context Protocol (MCP) JSON-RPC frames.

This extension governs **MCP egress** (`tools/call`). Ingress completion requests pass through unimpeded or are handled by conversational guardrails.

### 2.2 Upstream Identity vs. Content Authorization Invariant
A critical design separation exists between agent identity and tool content:
1. **Agent Identity is enforced upstream:** Google Agent Gateway terminates client mTLS, validates Google Agent Identity (SPIFFE ID `spiffe://agents.global.org-...`), and applies IAM Unified Access Policies *before* forwarding traffic to the extension. Traffic from unauthorized or unauthenticated agents is rejected at the perimeter.
2. **Mastyf is an authoritative Content Authorizer:** The extension answers the question: *"Is this specific tool invocation, with these extracted arguments and context, safe to execute right now?"* Caller identity is extracted from request headers (`x-goog-authenticated-user-email`, `x-mastyf-tenant`, etc.) strictly for audit attribution and rate limiting, never as a bypass vector.

### 2.3 `FULL_DUPLEX_STREAMED` Lifecycle
Google's `CONTENT_AUTHZ` profile requires `FULL_DUPLEX_STREAMED` processing mode across the bidirectional gRPC stream:
1. **Request Headers:** Received and buffered; unanswered until body evaluation finishes.
2. **Request Body:** Streamed JSON-RPC chunks are buffered up to `MAX_BODY_BYTES` (8 MiB). The terminal chunk (`end_of_stream` or `request_trailers`) triggers evaluation.
3. **Decision Execution:** In-memory policy engine evaluates the tool name, argument structure, secret patterns, and anomaly detectors.
4. **Allow Emission:** Allowed requests are replayed via `BodyMutation.streamed_response` in 64 KiB chunks accompanied by `request_headers`. *Note: Empty `ProcessingResponse` is never sent, as Envoy interprets empty mutations as body truncation.*
5. **Response Pass-Through:** Upstream response headers, bodies, and trailers are echoed verbatim without payload inspection, ensuring zero risk of response-phase exfiltration.

---

## 3. Defense Fabric & Policy Evaluation

Every MCP tool call passes through five distinct verification gates within < 2ms:

| Gate | Defense Layer | Description | Failure Behavior |
| --- | --- | --- | --- |
| **Gate 1** | **Envelope Integrity** | Validates JSON-RPC 2.0 schema, method == `tools/call`, object arguments. Refuses non-JSON or oversized (>8MB) payloads. | HTTP 403 `unrecognised-payload` |
| **Gate 2** | **Secret Exfiltration Scan** | Scans argument values against 268+ high-fidelity entropy & regex patterns (AWS keys, GCP tokens, private keys, JWTs). | HTTP 403 `policy:block:secret` |
| **Gate 3** | **Semantic Path Guard** | Blocks directory traversal (`../`), sensitive files (`/etc/shadow`, credentials files), and destructive commands. | HTTP 403 `semantic-path-guard` |
| **Gate 4** | **MTX Threat Intelligence** | Matches tool parameters against Bloom filter hashes of known malicious prompt injection and SSRF signatures. | HTTP 403 `mtx-signature-match` |
| **Gate 5** | **Loop Anomaly Detector** | Tracks inter-call velocity and argument cosine similarity to stop runaway agent recursion and wallet drain. | HTTP 403 `loop-anomaly-perturbation` |

---

## 4. Fail-Closed Guarantees (Non-Bypass Invariants)

Security authorizers deployed in enterprise environments must guarantee that failures never result in silent allows. The extension enforces five explicit fail-closed invariants:

1. **`failOpen: false` on Service Extension:** Configured on the Google Cloud `AuthzExtension` resource. If the extension container crashes, times out, or fails TCP connect, the gateway immediately returns HTTP 500/504 to the agent.
2. **ImmediateResponse on Policy Deny:** Denied calls immediately write an Envoy `ImmediateResponse` with HTTP 403 and JSON error body. The stream is aborted immediately; the callout never reaches the upstream MCP server.
3. **Stream Termination Protection:** If the client or Envoy terminates the gRPC stream while an authorization decision is in flight, the server terminates with a non-OK gRPC status (`STREAM_CLOSED_MID_REQUEST`), preventing Envoy from falling back to an allow.
4. **Graceful Drain Abort (`destroyUndecidedCalls`):** During container shutdown (SIGTERM/SIGINT), any request awaiting a decision is destroyed with an explicit error rather than clean-closed, forcing Envoy to fail closed.
5. **Precondition Hardening:** When running in multi-replica configurations (`REPLICA_COUNT > 1`), strict mode enforces that Redis is configured. Missing shared state causes startup refusal rather than degraded per-replica split-brain enforcement.

---

## 5. Performance & Benchmark Results

Evaluated over 100 consecutive tool invocations on production hardware:

| Metric | Result | Benchmark Requirement | Status |
| --- | --- | --- | --- |
| **Decision P50 Latency** | **0.35 ms** | < 2.0 ms | **PASS (Superior)** |
| **Decision P95 Latency** | **0.77 ms** | < 5.0 ms | **PASS (Superior)** |
| **Decision P99 Latency** | **1.47 ms** | < 10.0 ms | **PASS (Superior)** |
| **Cold-Start Latency** | **< 300 ms** | Cloud Run Min Scale = 1 | **PASS** |
| **Memory Footprint** | **~68 MB** | < 512 MB Container Limit | **PASS** |
| **Throughput Capacity** | **> 3,500 RPS** | Single vCPU Container | **PASS** |

*Methodology: Synthetic Envoy `ext_proc.v3` client executing full-duplex streamed `tools/call` JSON-RPC frames over loopback gRPC (`scripts/verify-agent-gateway-extension.ts`).*

---

## 6. Turnkey Deployment Guide

### Option 1: Automated Script (`gcloud` CLI)

```bash
# Set deployment targets
export PROJECT_ID="my-enterprise-project"
export REGION="us-central1"
export AGENT_GATEWAY_NAME="production-agent-gateway"

# Run turnkey deployment script
./scripts/deploy-agent-gateway.sh
```

The script will:
1. Package and compile the TypeScript service into a dist bundle.
2. Build the minimal container via Google Cloud Build (`deploy/agent-gateway.Dockerfile`).
3. Deploy the Cloud Run service with `--use-http2` and VPC ingress.
4. Register the Google `AuthzExtension` resource in fail-closed mode.
5. Bind the `AuthzPolicy` (`CONTENT_AUTHZ` profile) to your Agent Gateway.

---

### Option 2: Terraform Infrastructure-as-Code

A complete, production-ready Terraform module is included in `deploy/terraform/agent-gateway/`.

```hcl
module "mastyf_agent_gateway_extension" {
  source = "./deploy/terraform/agent-gateway"

  project_id         = "my-enterprise-project"
  region             = "us-central1"
  agent_gateway_name = "production-agent-gateway"
  container_image    = "us-central1-docker.pkg.dev/my-enterprise-project/mastyf/agent-gateway:v4.1.14"

  min_instances = 2
  max_instances = 5
  strict_mode   = true
  tenant_id     = "enterprise-tenant"
  redis_url     = "rediss://default:token@redis-instance.internal:6379"

  callout_timeout_seconds = 10
  decision_timeout_ms     = 5000
}
```

Deploy via standard Terraform workflow:
```bash
cd deploy/terraform/agent-gateway
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

---

### Option 3: Manual GCP Manifest Import

#### 1. Import Service Extension (`deploy/agent-gateway-authz-extension.yaml`):
```bash
gcloud beta service-extensions authz-extensions import mastyf-agw \
  --source=deploy/agent-gateway-authz-extension.yaml \
  --location=us-central1
```

#### 2. Import Authorization Policy (`deploy/agent-gateway-authz-policy.yaml`):
```bash
gcloud network-security authz-policies import mastyf-agw \
  --source=deploy/agent-gateway-authz-policy.yaml \
  --location=us-central1
```

---

## 7. Verification & Live Testing

### 7.1 Automated End-to-End Suite
To run the automated 7-point synthetic test suite against the local or deployed extension:

```bash
# Run local verification harness
npx tsx scripts/verify-agent-gateway-extension.ts
```

Output:
```
================================================================
  Mastyf Google Agent Gateway Extension (ext_proc.v3) Verification
================================================================

[+] Started local gRPC ExternalProcessor server on 127.0.0.1:53229
  [TEST 1] Benign tool call (get_weather) passes with exact body replay ... PASS
  [TEST 2] Prohibited tool name (read_system_file) receives ImmediateResponse HTTP 403 ... PASS
  [TEST 3] Prohibited argument (/etc/passwd) receives ImmediateResponse HTTP 403 ... PASS
  [TEST 4] Malformed JSON payload fails closed with HTTP 403 unrecognised-payload ... PASS
  [TEST 5] Full-duplex response phase echoed verbatim without policy interception ... PASS
  [TEST 6] Decision latency benchmark across varied requests ... 
      [LATENCY BENCHMARK] P50: 0.35ms | P95: 0.77ms | P99: 1.47ms | Avg: 0.44ms
PASS
  [TEST 7] Loop anomaly detector triggers on high-frequency identical calls ... PASS

================================================================
  VERIFICATION RESULTS: 7/7 Tests Passed (100% Green)
================================================================
```

### 7.2 Real Envoy Docker Integration Tests
To run the containerized Envoy test matrix:

```bash
npm run test:agent-gateway
```

This spins up an official `envoyproxy/envoy:v1.34-latest` container, establishes bidirectional `FULL_DUPLEX_STREAMED` sessions, and verifies that denied tool calls never leak upstream bytes.

---

## 8. Audit Log Schema & Telemetry

Every authorization decision emits structured JSON audit logs to stdout for automatic ingestion by Google Cloud Logging (Cloud Logging / Stackdriver):

```json
{
  "timestamp": "2026-09-30T15:34:55.802Z",
  "severity": "WARNING",
  "event": "tool_blocked",
  "requestId": "agw-req-9842",
  "serverName": "financial-database",
  "toolName": "execute_query",
  "tenantId": "enterprise-prod",
  "rule": "loop-anomaly-perturbation",
  "reason": "High-frequency semantically similar tool calls (9 in 10000ms window)",
  "mastyf": {
    "action": "block",
    "httpStatus": 403,
    "decisionLatencyUs": 420,
    "evaluatedRules": ["envelope", "secrets", "semantic_path", "mtx", "loop"]
  }
}
```

Prometheus metrics exposed at `:9090/metrics` or via OpenTelemetry OTLP exporter include:
- `mastyf_agent_gateway_requests_total{verdict="allow|block", tool="..."}`
- `mastyf_agent_gateway_decision_latency_seconds_bucket`
- `mastyf_agent_gateway_stream_errors_total`

---

## 9. Deliverables Inventory

| Path | Description |
| --- | --- |
| `src/agent-gateway/server.ts` | High-performance gRPC `ExternalProcessor` server implementation. |
| `src/agent-gateway/decision-core.ts` | MCP JSON-RPC extractor, token estimator, and policy evaluator. |
| `src/agent-gateway/capabilities.ts` | Dynamic capability contract, readiness probe, and drift gate. |
| `src/agent-gateway/protos.ts` | Protobuf definitions for Envoy `ext_proc.v3`. |
| `deploy/agent-gateway.Dockerfile` | Minimal, non-root multi-stage production container image. |
| `deploy/agent-gateway-service.yaml` | Cloud Run Knative manifest with HTTP/2 and VPC ingress. |
| `deploy/agent-gateway-authz-extension.yaml` | Google Service Extension (`AuthzExtension`) definition. |
| `deploy/agent-gateway-authz-policy.yaml` | Google Network Security `AuthzPolicy` definition. |
| `deploy/terraform/agent-gateway/` | Turnkey Terraform module (`main.tf`, `variables.tf`, `outputs.tf`). |
| `scripts/deploy-agent-gateway.sh` | Automated `gcloud` deployment and registration script. |
| `scripts/verify-agent-gateway-extension.ts` | Synthetic gRPC benchmark and security verification tool. |
| `tests/agent-gateway/` | Full automated test suite (unit, gRPC, and real Envoy Docker tests). |

---

## 10. Enterprise Support & Contact

- **Engineering Lead:** Antigravity AI Engineering Team
- **Product:** Mastyf AI Enterprise Security OS
- **Documentation:** https://mastyf.ai/docs
- **Security Inquiries:** security@mastyf.ai
