/**
 * Egress classifier — tells harmless outbound calls apart from real data egress, so the
 * session exfil-chain detectors (session-flow-guard, session-chain-detector) don't block
 * ordinary agent work such as "read a file, then look something up on GitHub" or "read a
 * file, then post a status message".
 *
 * It only ever *relaxes* a block, so it is deliberately conservative: a call is
 * 'safe-read' or 'messaging' only when every condition below holds, and anything
 * ambiguous is 'egress' (the callers keep blocking it).
 *
 *  - 'safe-read'  A bounded GET/HEAD to a well-known, public, read-only host: HTTPS, exact
 *                 host match, no credentials or custom port in the URL, no request body,
 *                 and little room in the query string, headers or other arguments to smuggle
 *                 data out. `strict` (set after a sensitive read in the same session)
 *                 tightens every limit.
 *  - 'messaging'  A message to a person or channel (it names a recipient) with no URL
 *                 anywhere in its arguments and no attachments: nothing is sent to an
 *                 arbitrary destination. Callers decide what to allow; session-flow-guard
 *                 only lets it through after a non-sensitive read.
 *  - 'egress'     Everything else.
 *
 * Note: this file was missing from commit 6d9905f6, which added its two callers. It was
 * rewritten from the callers' contract: they relax a block only for 'safe-read' and
 * (after a plain read) 'messaging'.
 */
import { walkStringLeaves } from './arg-leaf-walker.js';

export type EgressClass = 'safe-read' | 'messaging' | 'egress';

export interface EgressClassifyOptions {
  /** A sensitive read already happened in this session: judge GETs more harshly. */
  strict?: boolean;
}

/**
 * Public hosts whose GET/HEAD endpoints only return data. Exact hostname match, so
 * `api.github.com.evil.example` or `evil.github.io` never qualify. Deliberately absent:
 * Google (a GET to Google Forms submits data), localhost (local services may act on a GET),
 * and echo/test services (httpbin, request bins).
 */
const READ_ONLY_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'raw.githubusercontent.com',
  'registry.npmjs.org',
  'www.npmjs.com',
  'registry.yarnpkg.com',
  'pypi.org',
  'docs.python.org',
  'developer.mozilla.org',
  'stackoverflow.com',
]);

/** Tools that fetch with GET when no method is given. Others (e.g. http_request) must say GET. */
const GET_BY_DEFAULT_TOOLS = new Set(['fetch', 'fetch_url', 'http_get', 'web_fetch', 'get_url', 'read_url']);

/** A tool name with one of these can't be a read, whatever its arguments say. */
const WRITE_VERB = /(?:^|[_\-.])(?:post|put|patch|delete|upload|send|webhook|submit|create|write|forward|transmit|publish)(?:$|[_\-.])/i;

const METHOD_KEYS = ['method', 'httpMethod', 'http_method', 'verb'];
const BODY_KEY = /^(?:body|data|json|payload|form|form_data|formData|content|files?|attachments?|raw)$/i;
const HEADER_KEY = /^headers?$/i;
const PARAMS_KEY = /^(?:params|query|query_params|queryParams|search_params|searchParams)$/i;
const SAFE_HEADER_NAMES = new Set([
  'accept',
  'accept-language',
  'accept-encoding',
  'user-agent',
  'if-none-match',
  'if-modified-since',
  'cache-control',
  'authorization',
]);

const MESSAGING_TOOL =
  /(?:^|[_\-.])(?:message|messages|email|mail|dm|chat|reply|comment|notify|notification|slack|teams)(?:$|[_\-.])/i;
const NOT_MESSAGING_TOOL = /(?:^|[_\-.])(?:webhook|http|https|request|fetch|url|upload|callback|curl)(?:$|[_\-.])/i;
const RECIPIENT_KEY =
  /^(?:to|cc|bcc|recipients?|channel|channel_id|channelId|chat_id|chatId|conversation|conversation_id|thread|thread_id|user|user_id|userId|email|address)$/i;
const DESTINATION_KEY = /^(?:url|uri|endpoint|webhook|webhook_url|webhookUrl|callback|callback_url|host|server)$/i;
const ATTACHMENT_KEY = /^(?:attachments?|files?|file_path|filePath|path|paths|blocks_url|image_url|media_url)$/i;

/** Any "scheme://" (http, https, ftp, …): the argument names a destination. */
const HAS_SCHEME = /[a-z][a-z0-9+.-]*:\/\//i;
/**
 * The only URL shape accepted for a safe read: https, then a hostname made of hostname
 * characters only, then the end or a path/query/fragment. No userinfo ("@"), port, backslash
 * or punctuation in the authority, which different URL parsers split differently
 * ("https://api.github.com,@evil.example/x" is evil.example to some of them).
 */
const STRICT_HTTPS_URL = /^https:\/\/([a-z0-9.-]+)(?:[/?#][^\s\\]*)?$/i;

type Limits = {
  maxUrlLength: number;
  maxQueryLength: number;
  /** Longest run of base64/hex-looking characters allowed anywhere in the URL. */
  maxOpaqueRun: number;
  /** Combined length of argument text other than the URL, method and headers. */
  maxOtherText: number;
  maxHeaderText: number;
};

const NORMAL: Limits = { maxUrlLength: 2048, maxQueryLength: 512, maxOpaqueRun: 63, maxOtherText: 256, maxHeaderText: 512 };
const STRICT: Limits = { maxUrlLength: 512, maxQueryLength: 128, maxOpaqueRun: 23, maxOtherText: 64, maxHeaderText: 256 };

export function classifyEgress(
  toolName: string,
  args: Record<string, unknown> | undefined,
  options: EgressClassifyOptions = {},
): EgressClass {
  if (isSafeRead(toolName, args ?? {}, options.strict ? STRICT : NORMAL, !!options.strict)) return 'safe-read';
  if (isMessaging(toolName, args ?? {})) return 'messaging';
  return 'egress';
}

// ------------------------------------------------------------------ safe-read

function isSafeRead(toolName: string, args: Record<string, unknown>, limits: Limits, strict: boolean): boolean {
  const name = toolName.toLowerCase();
  if (WRITE_VERB.test(name)) return false;

  const method = readMethod(args);
  if (method === null) {
    if (!GET_BY_DEFAULT_TOOLS.has(name)) return false;
  } else if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  // No request body of any kind.
  for (const [key, value] of Object.entries(args)) {
    if (BODY_KEY.test(key) && !isEmpty(value)) return false;
  }

  // Every argument that names a destination must be exactly one allowed read URL and nothing
  // else (no URL inside other text, which a tool may parse differently); at least one.
  const leaves = walkStringLeaves(args);
  const urlLeaves = leaves.filter((leaf) => HAS_SCHEME.test(leaf.value));
  if (urlLeaves.length === 0) return false;
  if (!urlLeaves.every((leaf) => isBoundedReadUrl(leaf.value.trim(), limits))) return false;

  // Query parameters passed as an object count against the query budget.
  let paramsText = 0;
  for (const [key, value] of Object.entries(args)) {
    if (PARAMS_KEY.test(key) && !isEmpty(value)) paramsText += JSON.stringify(value).length;
  }
  if (paramsText > limits.maxQueryLength) return false;

  if (!headersAreBounded(args, limits, strict)) return false;

  // Whatever else is in the arguments could be sent along; keep it small, and no second
  // destination hiding without a scheme ("//evil.example/x").
  let otherText = 0;
  for (const leaf of leaves) {
    if (urlLeaves.includes(leaf)) continue;
    const top = topKey(leaf.path);
    if (METHOD_KEYS.includes(top) || HEADER_KEY.test(top) || PARAMS_KEY.test(top)) continue;
    if (leaf.value.includes('//') || leaf.value.includes('\\')) return false;
    otherText += leaf.value.length;
  }
  return otherText <= limits.maxOtherText;
}

function readMethod(args: Record<string, unknown>): string | null {
  for (const key of METHOD_KEYS) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase();
  }
  return null;
}

function isBoundedReadUrl(raw: string, limits: Limits): boolean {
  if (raw.length > limits.maxUrlLength) return false;
  // The whole value must be one plain https URL, and both readings of its host must agree.
  const strict = STRICT_HTTPS_URL.exec(raw);
  if (!strict) return false;
  const host = strict[1]!.toLowerCase();
  if (!READ_ONLY_HOSTS.has(host)) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password || url.port) return false;
  if (url.hostname.toLowerCase() !== host) return false;
  if (url.search.length > limits.maxQueryLength) return false;

  let decoded = url.pathname + url.search + url.hash;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return false;
  }
  return longestOpaqueRun(decoded) <= limits.maxOpaqueRun;
}

/** Longest run of characters that could be encoded data (base64, base64url, hex). */
function longestOpaqueRun(text: string): number {
  let longest = 0;
  for (const match of text.matchAll(/[A-Za-z0-9+/=_-]+/g)) {
    // Path separators split ordinary paths; only an unbroken run counts.
    for (const segment of match[0].split('/')) longest = Math.max(longest, segment.length);
  }
  return longest;
}

function headersAreBounded(args: Record<string, unknown>, limits: Limits, strict: boolean): boolean {
  for (const [key, value] of Object.entries(args)) {
    if (!HEADER_KEY.test(key) || isEmpty(value)) continue;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    if (JSON.stringify(value).length > limits.maxHeaderText) return false;
    if (strict && !Object.keys(value as object).every((h) => SAFE_HEADER_NAMES.has(h.toLowerCase()))) return false;
  }
  return true;
}

// ------------------------------------------------------------------ messaging

function isMessaging(toolName: string, args: Record<string, unknown>): boolean {
  const name = toolName.toLowerCase();
  if (!MESSAGING_TOOL.test(name) || NOT_MESSAGING_TOOL.test(name)) return false;

  const keys = Object.keys(args);
  if (!keys.some((key) => RECIPIENT_KEY.test(key) && !isEmpty(args[key]))) return false;
  if (keys.some((key) => DESTINATION_KEY.test(key) && !isEmpty(args[key]))) return false;
  if (keys.some((key) => ATTACHMENT_KEY.test(key) && !isEmpty(args[key]))) return false;

  // "No URL destination": not in any field, including the message text.
  return !walkStringLeaves(args).some((leaf) => HAS_SCHEME.test(leaf.value));
}

// ------------------------------------------------------------------ helpers

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/** First key of a leaf path from walkStringLeaves ("headers.Accept" → "headers", "$" → "$"). */
function topKey(path: string): string {
  return path.split(/[.[]/)[0] ?? path;
}
