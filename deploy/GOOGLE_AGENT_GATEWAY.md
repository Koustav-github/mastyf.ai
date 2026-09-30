# Google Cloud Agent Gateway · Mastyf Service Extension Integration Guide

This guide documents the end-to-end production deployment and client configuration of the Mastyf Shield Authorization Extension (`CONTENT_AUTHZ` / `ext_proc.v3`) on Google Cloud Platform.

---

## 1. Architecture Overview

Google Cloud Agent Gateway delegates runtime authorization decisions to Mastyf via the Envoy External Processing protocol (`envoy.service.ext_proc.v3.ExternalProcessor/Process`) over HTTP/2 gRPC.

```
┌─────────────────────────────────┐
│ AI Agent / MCP Client (Vertex)  │
└────────────────┬────────────────┘
                 │ mTLS (Port 443) + CA Cert
                 ▼
┌─────────────────────────────────┐
│ Private Service Connect (PSC)   │  10.128.0.2 (VPC default, us-central1)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Google Cloud Agent Gateway      │  projects/mastyf/locations/us-central1/
│ (mastyf-agent-gateway)          │  agentGateways/mastyf-agent-gateway
└────────────────┬────────────────┘
                 │ Intercepts MCP "tools/call" (AuthzPolicy: mastyf-agw)
                 │ HTTP/2 gRPC (ext_proc.v3)
                 ▼
┌─────────────────────────────────┐
│ Mastyf Shield Authz Extension   │  Cloud Run: mastyf-agent-gateway-authz
│ (Fail-Closed, 10s ceiling)      │  Region: us-central1
└────────────────┬────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   [200 OK / ALLOW]   [403 FORBIDDEN / BLOCK]
   (Body Mutation)    (ImmediateResponse: Sensitive Path,
                       Secret Leak, Spend Quota, etc.)
```

---

## 2. Deployed GCP Infrastructure Inventory

| Resource Type | GCP Resource Name | Location / Details |
| :--- | :--- | :--- |
| **Artifact Registry** | `us-central1-docker.pkg.dev/mastyf/mastyf/agent-gateway:v4.1.14` | Docker Image (built via Cloud Build) |
| **Cloud Run Service** | `mastyf-agent-gateway-authz` | FQDN: `mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app` (`--use-http2`) |
| **AuthzExtension** | `projects/mastyf/locations/us-central1/authzExtensions/mastyf-agw` | `failOpen: false`, `timeout: 10s` |
| **Agent Gateway** | `projects/mastyf/locations/us-central1/agentGateways/mastyf-agent-gateway` | Protocols: `[MCP]`, Governed Path: `AGENT_TO_ANYWHERE` |
| **Gateway Attachment**| `projects/a967ddc2fb4dc3100p-tp/regions/us-central1/serviceAttachments/unitkind1-swp-mtls-psc-sa` | Producer mTLS Service Attachment |
| **VPC PSC Endpoint** | `projects/mastyf/regions/us-central1/forwardingRules/mastyf-agw-psc-endpoint` | Internal IP: `10.128.0.2` in `default` VPC |
| **AuthzPolicy** | `projects/mastyf/locations/us-central1/authzPolicies/mastyf-agw` | Profile: `CONTENT_AUTHZ`, Action: `CUSTOM` |
| **Memorystore Redis** | `projects/mastyf/locations/us-central1/instances/mastyf-redis` | `10.15.114.187:6379` (Direct VPC Egress) |
| **BigQuery Audit DB** | `mastyf:mastyf_security_audit.run_googleapis_com_stderr` | Real-time immutable audit ledger |
| **Logging Sink** | `projects/mastyf/sinks/mastyf-agw-audit-sink` | Streams `policy_decision` & `tool_blocked` |
| **Gateway IAM** | `service-460068841296@gcp-sa-dep.iam.gserviceaccount.com` | `roles/run.invoker` on Cloud Run |

---

## 3. Security Posture & Guardrails

1. **Zero-Trust Fail-Closed (`failOpen: false`):**
   If the authorization extension is unreachable or crashes, Google Agent Gateway immediately denies tool execution with an HTTP 403 response rather than allowing uninspected calls.
2. **Deep Semantic Content Inspection:**
   Unlike basic header-only proxies, `policyProfile: CONTENT_AUTHZ` grants Mastyf full access to streaming request bodies. Mastyf inspects the extracted MCP JSON-RPC payload (`method: tools/call`, `params.name`, `params.arguments`).
3. **Active Protections Enforced:**
   - **Semantic Path Guard:** Blocks directory traversal, access to `/etc/passwd`, sensitive keys, and environment files.
   - **Secret Exfiltration Shield:** Scans tool arguments in real time for AWS keys, GCP credentials, OAuth tokens, and private keys.
   - **Tenant Spend & Rate Limits:** Enforces per-tenant token allowances and execution frequency.
   - **Loop & Recursion Detection:** Prevents runaway agent execution cycles.

---

## 4. Verification & Testing

### Test 1: Benign MCP Tool Call (Allowed)
```bash
npx tsx scripts/send-mcp-ext-proc.ts \
  --host mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app \
  --port 443 --tls \
  --tool get_weather --args '{"city":"Tokyo"}'
```
**Result:** `[VERDICT: ALLOWED (PERMITTED)]`  
100% byte-matched body mutation re-injected into the gateway pipeline.

### Test 2: Path Traversal Attack (Blocked)
```bash
npx tsx scripts/send-mcp-ext-proc.ts \
  --host mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app \
  --port 443 --tls \
  --tool read_file --args '{"path":"/etc/passwd"}'
```
**Result:** `[VERDICT: DENIED (FAIL-CLOSED)]`  
**HTTP Status:** `403 Forbidden`  
**Reason:** `policy:semantic-path-guard:Sensitive path blocked: /etc/passwd`

### Test 3: Secret Exfiltration Attempt (Blocked)
```bash
npx tsx scripts/send-mcp-ext-proc.ts \
  --host mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app \
  --port 443 --tls \
  --tool send_webhook --args '{"key":"AKIAIOSFODNN7EXAMPLE","secret":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}'
```
**Result:** `[VERDICT: DENIED (FAIL-CLOSED)]`  
**HTTP Status:** `403 Forbidden`  
**Reason:** `policy:secret-scan:2 secret(s) in tool arguments: aws-access-key, aws-access-token`

---

## 5. Client Integration Guide

To connect client agents (Claude Desktop, Cursor, LangChain, Vertex AI agent workhorses) through the Agent Gateway:

1. **Install Gateway Root Certificate:**
   The root CA certificate is saved at `deploy/mastyf-agent-gateway-ca.crt`. Ensure your agent runtime trusts this certificate for HTTPS/TLS verification.
2. **Point Client to Gateway PSC IP:**
   Route MCP requests to `https://10.128.0.2:443/mcp/...` inside the VPC.
3. **Gateway Logs & Auditing:**
   View real-time authorization events in Google Cloud Logging:
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="mastyf-agent-gateway-authz"' --limit=20 --project=mastyf
   ```

---

## 6. Multi-Tenant Attribution & BigQuery SIEM Analytics

Each request passing through the gateway carries organizational tenant identity and target MCP server routing headers:
* `x-mastyf-tenant`: Caller department or client tenant (e.g. `engineering-team`, `finance-dept`, `sales`).
* `x-mastyf-server`: Target MCP server (e.g. `mcp-engineering`, `mcp-finance`, `mcp-bigquery`).
* `x-request-id`: End-to-end trace correlation ID.

### Querying the Live BigQuery Audit Ledger
Run standard SQL to inspect security decisions, blocked tools, and latency in real time:

```sql
SELECT
  timestamp,
  jsonPayload.toolName AS tool,
  jsonPayload.context.tenantId AS tenant,
  jsonPayload.serverName AS server,
  jsonPayload.decision.action AS action,
  jsonPayload.decision.reason AS reason
FROM
  `mastyf.mastyf_security_audit.run_googleapis_com_stderr`
WHERE
  jsonPayload.event = "policy_decision"
ORDER BY
  timestamp DESC
LIMIT 50;
```

