/**
 * Mastyf Shield Desktop — 1-Click Agent Auto-Discovery & Mediation Engine.
 *
 * Scans host AI developer tools (Claude Desktop, Cursor, Windsurf, Cline)
 * for MCP configurations, inspects server mediation state, and performs
 * atomic 1-click protection with timestamped backups and zero config loss.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const KNOWN_CLIENTS = [
  {
    id: 'claude',
    name: 'Claude Desktop',
    paths: [
      path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
      path.join(os.homedir(), '.config/Claude/claude_desktop_config.json'),
      path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'), 'Claude/claude_desktop_config.json'),
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    paths: [
      path.join(os.homedir(), '.cursor/mcp.json'),
      path.join(os.homedir(), 'Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json'),
      path.join(os.homedir(), '.config/Cursor/User/globalStorage/cursor.mcp/mcp.json'),
      path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'), 'Cursor/User/globalStorage/cursor.mcp/mcp.json'),
    ],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    paths: [
      path.join(os.homedir(), '.codeium/windsurf/mcp_config.json'),
      path.join(os.homedir(), '.config/windsurf/mcp_config.json'),
    ],
  },
  {
    id: 'cline',
    name: 'Cline (VS Code)',
    paths: [
      path.join(
        os.homedir(),
        'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      ),
      path.join(
        os.homedir(),
        '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      ),
      path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'),
        'Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      ),
    ],
  },
];

function resolveActiveConfigPath(clientDef) {
  for (const candidate of clientDef.paths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolvePolicyPath(repoRoot) {
  const candidates = [
    process.env.MASTYF_SHIELD_POLICY,
    path.join(os.homedir(), '.mastyf/active_policy.yaml'),
    path.join(repoRoot, 'default-policy.yaml'),
    path.join(os.homedir(), '.mastyf/default-policy.yaml'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0] || path.join(os.homedir(), '.mastyf/active_policy.yaml');
}

function isServerProtected(server) {
  if (!server || typeof server !== 'object') return false;
  
  // 1. Explicit Mastyf marker check
  if (server._mastyf && server._mastyf.managed === true) {
    return true;
  }

  // 2. Command check
  const cmd = String(server.command || '').trim().toLowerCase();
  const args = Array.isArray(server.args) ? server.args.map((a) => String(a).trim().toLowerCase()) : [];

  if (cmd === 'mastyf' && args[0] === 'proxy') {
    return true;
  }
  if (cmd.includes('mastyf-ai-proxy') || cmd.includes('mastyf_ai_proxy')) {
    return true;
  }
  if (args.includes('proxy') && (args.includes('--policy') || args.includes('-p'))) {
    return true;
  }

  return false;
}

function extractServers(raw) {
  if (raw && typeof raw === 'object') {
    if (raw.mcpServers && typeof raw.mcpServers === 'object') {
      return raw.mcpServers;
    }
    if (raw.servers && typeof raw.servers === 'object') {
      return raw.servers;
    }
  }
  return {};
}

function setServers(raw, servers) {
  if ('servers' in raw && !('mcpServers' in raw)) {
    raw.servers = servers;
  } else {
    raw.mcpServers = servers;
  }
}

function findBackupsForFile(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter((f) => f.startsWith(`${base}.bak.`))
      .map((f) => path.join(dir, f))
      .sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        } catch {
          return 0;
        }
      });
  } catch {
    return [];
  }
}

/**
 * Scan host system for all AI developer clients and return protection status.
 */
function discoverAllAgents(opts = {}) {
  const results = [];

  for (const clientDef of KNOWN_CLIENTS) {
    const configPath = resolveActiveConfigPath(clientDef);
    if (!configPath) {
      results.push({
        id: clientDef.id,
        name: clientDef.name,
        installed: false,
        configPath: clientDef.paths[0],
        totalServers: 0,
        protectedServers: 0,
        unprotectedServers: 0,
        unprotectedNames: [],
        urlOnlyServers: 0,
        isFullyProtected: false,
        servers: [],
        backups: [],
      });
      continue;
    }

    try {
      const rawContent = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawContent);
      const serverMap = extractServers(parsed);
      const serverNames = Object.keys(serverMap);

      const serverDetails = [];
      let protectedCount = 0;
      let unprotectedCount = 0;
      let urlOnlyCount = 0;
      const unprotectedNames = [];

      for (const name of serverNames) {
        const s = serverMap[name];
        const isUrl = Boolean(s.url && !s.command);
        const isProt = isServerProtected(s);

        if (isUrl) {
          urlOnlyCount++;
        } else if (isProt) {
          protectedCount++;
        } else {
          unprotectedCount++;
          unprotectedNames.push(name);
        }

        serverDetails.push({
          name,
          command: s.command || null,
          isProtected: isProt,
          isUrlOnly: isUrl,
          args: Array.isArray(s.args) ? s.args : [],
          hasEnv: Boolean(s.env && Object.keys(s.env).length > 0),
          managedMarker: s._mastyf || null,
        });
      }

      const backups = findBackupsForFile(configPath);

      results.push({
        id: clientDef.id,
        name: clientDef.name,
        installed: true,
        configPath,
        totalServers: serverNames.length,
        protectedServers: protectedCount,
        unprotectedServers: unprotectedCount,
        unprotectedNames,
        urlOnlyServers: urlOnlyCount,
        isFullyProtected: unprotectedCount === 0 && serverNames.length > 0,
        servers: serverDetails,
        backups,
      });
    } catch (err) {
      results.push({
        id: clientDef.id,
        name: clientDef.name,
        installed: true,
        configPath,
        error: String(err.message || err),
        totalServers: 0,
        protectedServers: 0,
        unprotectedServers: 0,
        unprotectedNames: [],
        urlOnlyServers: 0,
        isFullyProtected: false,
        servers: [],
        backups: [],
      });
    }
  }

  return results;
}

/**
 * Atomic file writer with sync.
 */
function atomicWriteJsonSync(targetPath, data) {
  const tmpPath = `${targetPath}.tmp.${Date.now()}`;
  const serialized = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmpPath, serialized, 'utf-8');
  try {
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    // Fallback if cross-device or permission hiccup
    fs.copyFileSync(tmpPath, targetPath);
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
  }
}

/**
 * 1-Click Protect an agent client.
 * Injects Mastyf proxy with policy and creates timestamped backup.
 */
function protectAgent(clientId, opts = {}) {
  const repoRoot = opts.repoRoot || path.resolve(__dirname, '../..');
  const policyPath = opts.policyPath || resolvePolicyPath(repoRoot);
  const clientDef = KNOWN_CLIENTS.find((c) => c.id === clientId);

  if (!clientDef) {
    return { ok: false, error: `Unknown client identifier "${clientId}"` };
  }

  const configPath = resolveActiveConfigPath(clientDef);
  if (!configPath) {
    return { ok: false, error: `${clientDef.name} configuration not found on this system.` };
  }

  try {
    const rawContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(rawContent);
    const serverMap = extractServers(parsed);
    const serverNames = Object.keys(serverMap);

    if (serverNames.length === 0) {
      return {
        ok: true,
        clientId,
        clientName: clientDef.name,
        configPath,
        protectedCount: 0,
        alreadyProtectedCount: 0,
        message: 'No MCP servers defined in configuration.',
      };
    }

    // Create timestamped backup before any modifications
    const timestamp = Date.now();
    const backupPath = `${configPath}.bak.${timestamp}`;
    fs.copyFileSync(configPath, backupPath);

    let newlyProtected = 0;
    let alreadyProtected = 0;
    let skippedUrlOnly = 0;
    const modifiedServers = { ...serverMap };

    for (const name of serverNames) {
      const server = serverMap[name];

      // Skip remote SSE / URL-only servers
      if (server.url && !server.command) {
        skippedUrlOnly++;
        continue;
      }

      if (isServerProtected(server)) {
        alreadyProtected++;
        continue;
      }

      const origCommand = server.command;
      const origArgs = Array.isArray(server.args) ? [...server.args] : [];
      const origSha = crypto.createHash('sha256').update(JSON.stringify(server)).digest('hex');

      const wrappedEntry = {
        command: 'mastyf',
        args: ['proxy', '--policy', policyPath, '--', origCommand, ...origArgs],
        _mastyf: {
          managed: true,
          version: 1,
          original_command: origCommand,
          original_args: origArgs,
          original_sha256: origSha,
          policy_path: policyPath,
          timestamp: new Date().toISOString(),
        },
      };

      if (server.env && Object.keys(server.env).length > 0) {
        wrappedEntry.env = { ...server.env };
      }

      modifiedServers[name] = wrappedEntry;
      newlyProtected++;
    }

    setServers(parsed, modifiedServers);
    atomicWriteJsonSync(configPath, parsed);

    return {
      ok: true,
      clientId,
      clientName: clientDef.name,
      configPath,
      backupPath,
      newlyProtected,
      alreadyProtected,
      skippedUrlOnly,
      totalServers: serverNames.length,
      policyPath,
      message: `Successfully protected ${newlyProtected} MCP servers in ${clientDef.name}.`,
    };
  } catch (err) {
    return {
      ok: false,
      clientId,
      clientName: clientDef.name,
      error: `Failed to protect ${clientDef.name}: ${err.message || String(err)}`,
    };
  }
}

/**
 * 1-Click Revert an agent client from its Mastyf proxy wrapping.
 */
function unprotectAgent(clientId, opts = {}) {
  const clientDef = KNOWN_CLIENTS.find((c) => c.id === clientId);
  if (!clientDef) {
    return { ok: false, error: `Unknown client identifier "${clientId}"` };
  }

  const configPath = resolveActiveConfigPath(clientDef);
  if (!configPath) {
    return { ok: false, error: `${clientDef.name} configuration not found on this system.` };
  }

  try {
    // Check if user requested restoring from backup directly
    if (opts.useBackup) {
      const backups = findBackupsForFile(configPath);
      if (backups.length === 0) {
        return { ok: false, error: `No backup files found for ${clientDef.name}` };
      }
      const targetBackup = backups[0]; // most recent
      // Save current as pre-revert safety
      fs.copyFileSync(configPath, `${configPath}.pre-revert.${Date.now()}`);
      fs.copyFileSync(targetBackup, configPath);
      return {
        ok: true,
        clientId,
        clientName: clientDef.name,
        restoredFromBackup: targetBackup,
        message: `Restored ${clientDef.name} configuration from ${path.basename(targetBackup)}`,
      };
    }

    // In-place clean unwrap
    const rawContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(rawContent);
    const serverMap = extractServers(parsed);
    const serverNames = Object.keys(serverMap);

    let revertedCount = 0;
    const modifiedServers = { ...serverMap };

    for (const name of serverNames) {
      const s = serverMap[name];
      if (!isServerProtected(s)) continue;

      let restoredCommand = null;
      let restoredArgs = [];

      // 1. From _mastyf marker
      if (s._mastyf && s._mastyf.original_command) {
        restoredCommand = s._mastyf.original_command;
        restoredArgs = s._mastyf.original_args || [];
      } else if (Array.isArray(s.args)) {
        // 2. Parse from argv after '--'
        const dashIdx = s.args.indexOf('--');
        if (dashIdx !== -1 && dashIdx + 1 < s.args.length) {
          restoredCommand = s.args[dashIdx + 1];
          restoredArgs = s.args.slice(dashIdx + 2);
        }
      }

      if (restoredCommand) {
        const unwrapped = {
          command: restoredCommand,
          args: restoredArgs,
        };
        if (s.env) unwrapped.env = { ...s.env };
        delete unwrapped._mastyf;
        modifiedServers[name] = unwrapped;
        revertedCount++;
      }
    }

    if (revertedCount > 0) {
      // Save safety backup before writing unwrap
      fs.copyFileSync(configPath, `${configPath}.pre-revert.${Date.now()}`);
      setServers(parsed, modifiedServers);
      atomicWriteJsonSync(configPath, parsed);
    }

    return {
      ok: true,
      clientId,
      clientName: clientDef.name,
      revertedCount,
      message: `Reverted ${revertedCount} MCP servers in ${clientDef.name} to direct execution.`,
    };
  } catch (err) {
    return {
      ok: false,
      clientId,
      clientName: clientDef.name,
      error: `Failed to revert ${clientDef.name}: ${err.message || String(err)}`,
    };
  }
}

/**
 * Protect all discovered clients in one shot.
 */
function protectAllAgents(opts = {}) {
  const discovered = discoverAllAgents(opts);
  const installed = discovered.filter((c) => c.installed && c.totalServers > 0);
  const results = [];

  for (const client of installed) {
    const res = protectAgent(client.id, opts);
    results.push(res);
  }

  return {
    ok: true,
    clients: results,
    totalNewlyProtected: results.reduce((acc, r) => acc + (r.newlyProtected || 0), 0),
    totalAlreadyProtected: results.reduce((acc, r) => acc + (r.alreadyProtected || 0), 0),
  };
}

module.exports = {
  KNOWN_CLIENTS,
  discoverAllAgents,
  protectAgent,
  unprotectAgent,
  protectAllAgents,
  isServerProtected,
  resolveActiveConfigPath,
  resolvePolicyPath,
};
