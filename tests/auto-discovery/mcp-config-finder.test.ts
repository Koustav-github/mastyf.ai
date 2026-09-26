import { describe, it, expect } from 'vitest';
import { McpConfigFinder } from '../../src/auto-discovery/mcp-config-finder.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('McpConfigFinder', () => {
  it('generates valid candidate config search paths across known clients', () => {
    const finder = new McpConfigFinder();
    const paths = finder.getCandidatePaths();

    expect(paths.some((p) => p.client === 'Cursor')).toBe(true);
    expect(paths.some((p) => p.client === 'Claude Desktop')).toBe(true);
    expect(paths.some((p) => p.client === 'Cline')).toBe(true);
  });

  it('parses valid MCP JSON configuration files correctly', () => {
    const finder = new McpConfigFinder();
    const tempConfig = path.join(os.tmpdir(), `test-mcp-config-${Date.now()}.json`);

    const mockContent = JSON.stringify({
      mcpServers: {
        'filesystem-daemon': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          transport: 'stdio',
        },
        'remote-api': {
          url: 'http://localhost:8080/sse',
          transport: 'sse',
        },
      },
    });

    fs.writeFileSync(tempConfig, mockContent, 'utf8');

    try {
      const parsed = finder.parseConfigFile('Cursor', tempConfig);
      expect(parsed).not.toBeNull();
      expect(parsed!.servers.length).toBe(2);
      expect(parsed!.servers[0]!.name).toBe('filesystem-daemon');
      expect(parsed!.servers[0]!.command).toBe('npx');
      expect(parsed!.servers[1]!.transport).toBe('sse');
    } finally {
      if (fs.existsSync(tempConfig)) fs.unlinkSync(tempConfig);
    }
  });
});
