#!/usr/bin/env bash
# ==============================================================================
# Mastyf AI - Google Agent Gateway Service Extension Turnkey Deployer
#
# Deploys the ext_proc.v3 MCP tool-call authorization extension to Google Cloud:
#  1. Builds the minimal container image via Google Cloud Build or Docker.
#  2. Deploys Cloud Run service with HTTP/2 (h2c) enabled and non-root execution.
#  3. Imports the Google Service Extension (AuthzExtension) in fail-closed mode.
#  4. Applies the Google AuthzPolicy (CONTENT_AUTHZ profile) to the target Agent Gateway.
#
# Usage:
#   export PROJECT_ID="my-gcp-project"
#   export REGION="us-central1"
#   export AGENT_GATEWAY_NAME="my-agent-gateway"
#   ./scripts/deploy-agent-gateway.sh
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
NC="\033[0m"

echo -e "${BOLD}${CYAN}"
echo "=============================================================================="
echo "    Mastyf AI · Google Agent Gateway Content Authorizer Deployer              "
echo "=============================================================================="
echo -e "${NC}"

# Check required environment variables
: "${PROJECT_ID:?Please set PROJECT_ID (e.g. export PROJECT_ID='my-project')}"
: "${REGION:="us-central1"}"
: "${AGENT_GATEWAY_NAME:?Please set AGENT_GATEWAY_NAME (e.g. export AGENT_GATEWAY_NAME='prod-gateway')}"
: "${IMAGE_TAG:="latest"}"
: "${SERVICE_NAME:="mastyf-agent-gateway-authz"}"
: "${EXTENSION_NAME:="mastyf-agw"}"
: "${AUTHZ_POLICY_NAME:="mastyf-agw"}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/mastyf/agent-gateway:${IMAGE_TAG}"

echo -e "${BOLD}Deployment Parameters:${NC}"
echo "  Project ID:          ${PROJECT_ID}"
echo "  Region:              ${REGION}"
echo "  Agent Gateway:       ${AGENT_GATEWAY_NAME}"
echo "  Container Image:     ${IMAGE_NAME}"
echo "  Cloud Run Service:   ${SERVICE_NAME}"
echo "  Authz Extension:     ${EXTENSION_NAME}"
echo ""

# Step 0: Check dependencies
if ! command -v gcloud &>/dev/null; then
  echo -e "${RED}[ERROR] 'gcloud' CLI is required but not installed.${NC}"
  exit 1
fi

echo -e "${CYAN}[1/4] Building container image via Google Cloud Build...${NC}"
gcloud builds submit "${REPO_ROOT}" \
  --project="${PROJECT_ID}" \
  --config=<(cat <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', '${IMAGE_NAME}', '-f', 'deploy/agent-gateway.Dockerfile', '.']
images:
- '${IMAGE_NAME}'
EOF
)

echo -e "${CYAN}[2/4] Deploying to Cloud Run with HTTP/2 enabled...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${IMAGE_NAME}" \
  --platform="managed" \
  --ingress="internal-and-cloud-load-balancing" \
  --use-http2 \
  --port=8080 \
  --min-instances=1 \
  --max-instances=5 \
  --cpu=1 \
  --memory=512Mi \
  --set-env-vars="MASTYF_AI_STRICT_MODE=true,MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS=5000,MASTYF_AGENT_GATEWAY_MAX_SCANNED_ARGUMENT_BYTES=32768,REPLICA_COUNT=5" \
  --no-allow-unauthenticated

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.url)')
SERVICE_FQDN=$(echo "${SERVICE_URL}" | sed -e 's|^https://||' -e 's|^http://||')

echo -e "${GREEN}[+] Cloud Run deployed successfully: ${SERVICE_URL}${NC}"

echo -e "${CYAN}[3/4] Registering Service Extension (${EXTENSION_NAME})...${NC}"
TMP_EXT_YAML=$(mktemp)
cat <<EOF > "${TMP_EXT_YAML}"
name: ${EXTENSION_NAME}
service: ${SERVICE_FQDN}
failOpen: false
timeout: 10s
EOF

# Import or update AuthzExtension (beta service-extensions command)
gcloud beta service-extensions authz-extensions import "${EXTENSION_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --source="${TMP_EXT_YAML}" || \
gcloud beta service-extensions authz-extensions create "${EXTENSION_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --service="${SERVICE_FQDN}" \
  --timeout="10s" \
  --no-fail-open

rm -f "${TMP_EXT_YAML}"
echo -e "${GREEN}[+] Service Extension ${EXTENSION_NAME} registered.${NC}"

echo -e "${CYAN}[4/4] Applying AuthzPolicy (CONTENT_AUTHZ) to Agent Gateway...${NC}"
TMP_POLICY_YAML=$(mktemp)
cat <<EOF > "${TMP_POLICY_YAML}"
name: ${AUTHZ_POLICY_NAME}
target:
  resources:
  - "projects/${PROJECT_ID}/locations/${REGION}/agentGateways/${AGENT_GATEWAY_NAME}"
policyProfile: CONTENT_AUTHZ
action: CUSTOM
customProvider:
  authzExtension:
    resources:
    - "projects/${PROJECT_ID}/locations/${REGION}/authzExtensions/${EXTENSION_NAME}"
httpRules:
  - to:
      operations:
        - mcp:
            methods:
              - name: "tools/call"
    when: "request.headers['content-type'] == 'application/json'"
EOF

gcloud network-security authz-policies import "${AUTHZ_POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --source="${TMP_POLICY_YAML}"

rm -f "${TMP_POLICY_YAML}"

echo ""
echo -e "${BOLD}${GREEN}==============================================================================${NC}"
echo -e "${BOLD}${GREEN}    Deployment Successful! Mastyf is actively protecting Agent Gateway.       ${NC}"
echo -e "${BOLD}${GREEN}==============================================================================${NC}"
echo -e "Target Gateway:        projects/${PROJECT_ID}/locations/${REGION}/agentGateways/${AGENT_GATEWAY_NAME}"
echo -e "Policy Profile:        CONTENT_AUTHZ (fail-closed, tools/call only)"
echo -e "Extension Service:     ${SERVICE_FQDN} (gRPC HTTP/2)"
echo ""
echo "To run live synthetic verification against this deployment:"
echo "  npx tsx scripts/verify-agent-gateway-extension.ts"
echo ""
