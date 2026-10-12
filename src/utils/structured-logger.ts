import pino from 'pino';
import { PolicyDecision, CallContext } from '../policy/policy-types.js';
import { Logger } from './logger.js';
import { getTraceLogFields } from './tracing.js';
import { redactEphemeralSecrets } from '../security/ephemeral-credential-vault.js';

/**
 * Structured JSON logger for enterprise SIEM ingestion.
 * Always writes to stderr — stdout is reserved for MCP JSON-RPC in proxy mode.
 */
const level = process.env.LOG_LEVEL || 'info';

const logger = pino(
  {
    level: level.toLowerCase(),
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.destination({ fd: 2, sync: false }),
);

function withTraceCorrelation<T extends object>(entry: T): T & { trace_id?: string; span_id?: string } {
  const merged = { ...entry, ...getTraceLogFields() };
  if (typeof merged === 'object' && merged !== null && 'message' in merged && typeof merged.message === 'string') {
    (merged as { message: string }).message = redactEphemeralSecrets(merged.message);
  }
  return merged as T & { trace_id?: string; span_id?: string };
}

function logObject(levelFn: (obj: object) => void, msg: object | string): void {
  if (typeof msg === 'string') {
    levelFn(withTraceCorrelation({ message: msg }));
    return;
  }
  levelFn(withTraceCorrelation(msg));
}

export interface AuditLogEntry {
  event: 'policy_decision';
  requestId: string | number;
  serverName: string;
  toolName: string;
  decision: PolicyDecision;
  context: CallContext;
}

export interface BlockLogEntry {
  event: 'tool_blocked';
  requestId: string | number;
  serverName: string;
  toolName: string;
  reason: string;
  rule: string;
}

export interface ErrorLogEntry {
  event: 'proxy_error' | 'oidc_discovery_error' | 'oidc_auth_error' | 'oidc_introspection_error';
  requestId?: string | number;
  serverName: string;
  error: string;
  stack?: string;
}

/**
 * Recursively sanitizes data structures for BigQuery and SIEM export.
 * BigQuery does not support nested arrays (lists of lists / ARRAY<ARRAY<T>>).
 * Any array containing another array is safely transformed so inner arrays are serialized to JSON strings.
 */
export function sanitizeForLogIngestion(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    if (value.some((item) => Array.isArray(item))) {
      return value.map((item) => (Array.isArray(item) ? JSON.stringify(item) : sanitizeForLogIngestion(item)));
    }
    return value.map((item) => sanitizeForLogIngestion(item));
  }
  if (typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitizedObj[k] = sanitizeForLogIngestion(v);
    }
    return sanitizedObj;
  }
  return value;
}

export class StructuredLogger {
  static logPolicyDecision(entry: AuditLogEntry): void {
    const rawArgs = entry.context?.arguments;
    const sanitizedEntry = {
      ...entry,
      context: entry.context
        ? {
            ...entry.context,
            arguments: {},
            arguments_json: rawArgs ? JSON.stringify(rawArgs) : '{}',
          }
        : entry.context,
    };
    logger.info(withTraceCorrelation(sanitizedEntry));
    import('./enterprise-bootstrap.js').then(({ exportSiemEvent }) => {
      exportSiemEvent('policy_decision', withTraceCorrelation(sanitizedEntry) as unknown as Record<string, unknown>).catch((e: unknown) => {
        Logger.error(`[structured-logger] SIEM export failed: ${e instanceof Error ? e.message : String(e)}`);
      });
    }).catch((e: unknown) => {
      Logger.error(`[structured-logger] enterprise-bootstrap import failed: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  static logBlocked(entry: BlockLogEntry): void {
    logger.warn(withTraceCorrelation(entry));
    import('./enterprise-bootstrap.js').then(({ exportSiemEvent }) => {
      exportSiemEvent('tool_blocked', withTraceCorrelation(entry) as unknown as Record<string, unknown>).catch((e: unknown) => {
        Logger.error(`[structured-logger] SIEM export failed: ${e instanceof Error ? e.message : String(e)}`);
      });
    }).catch((e: unknown) => {
      Logger.error(`[structured-logger] enterprise-bootstrap import failed: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  static logError(entry: ErrorLogEntry): void {
    logger.error(withTraceCorrelation(entry));
  }

  static info(msg: object | string): void {
    logObject((obj) => logger.info(obj), msg);
  }

  static warn(msg: object | string): void {
    logObject((obj) => logger.warn(obj), msg);
  }

  static debug(msg: object | string): void {
    logObject((obj) => logger.debug(obj), msg);
  }
}
