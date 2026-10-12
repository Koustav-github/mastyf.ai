import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    entries: [
      {
        id: 'fixture-ai-001',
        title: 'Recursive Base64 Env Var Exfiltration via Subshell',
        category: 'credential_harvesting',
        severity: 'critical',
        confidence: 0.98,
        discoveredAt: new Date(Date.now() - 1800000).toISOString(),
        status: 'pending',
      },
      {
        id: 'fixture-ai-002',
        title: 'MCP Multi-Tool Chain Loophole with Direct IPC Spoofing',
        category: 'mcp_tool_tampering',
        severity: 'high',
        confidence: 0.92,
        discoveredAt: new Date(Date.now() - 5400000).toISOString(),
        status: 'pending',
      },
      {
        id: 'fixture-ai-003',
        title: 'Hex Unicode Obfuscated Webhook Egress',
        category: 'ssrf_bypass',
        severity: 'medium',
        confidence: 0.89,
        discoveredAt: new Date(Date.now() - 14400000).toISOString(),
        status: 'pending',
      },
    ],
  });
}
