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
 *  - 'safe-read'  A bounded GET/HEAD to a well-known, public, read-only host: exactly one URL
 *                 argument, which is the whole value and a plain https URL (exact host match,
 *                 no credentials, port, backslash or punctuation in the authority); no
 *                 second destination anywhere (host/proxy/server-like keys, hostnames or IPs
 *                 in other text, routing headers); no request body; and little room in the
 *                 query, params, headers, key names or other arguments to smuggle data out.
 *                 `strict` (set after a sensitive read in the same session) tightens every
 *                 limit and allows only content-negotiation headers.
 *  - 'messaging'  A short message to a person or channel (it names a recipient) with no URL
 *                 anywhere in its arguments, no destination key and no attachments, at any
 *                 depth. Callers decide what to allow; session-flow-guard only lets it
 *                 through (flagged for review) after a non-sensitive read, and
 *                 MASTYF_AI_FLOW_STRICT_MESSAGING=true turns that off.
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
]);

const MESSAGING_TOOL =
  /(?:^|[_\-.])(?:message|messages|email|mail|dm|chat|reply|comment|notify|notification|slack|teams)(?:$|[_\-.])/i;
const NOT_MESSAGING_TOOL = /(?:^|[_\-.])(?:webhook|http|https|request|fetch|url|upload|callback|curl)(?:$|[_\-.])/i;
const RECIPIENT_KEY =
  /^(?:to|cc|bcc|recipients?|channel|channel_id|channelId|chat_id|chatId|conversation|conversation_id|thread|thread_id|user|user_id|userId|email|address)$/i;
const DESTINATION_KEY = /^(?:url|uri|endpoint|webhook|webhook_url|webhookUrl|callback|callback_url|host|server)$/i;
const ATTACHMENT_KEY = /^(?:attachments?|files?|file_path|filePath|path|paths|blocks_url|image_url|media_url)$/i;
/** All text in a message, recipients included. A status update fits; a pasted file doesn't. */
const MAX_MESSAGE_TEXT = 1000;

/** Any "scheme://" (http, https, ftp, …): the argument names a destination. */
const HAS_SCHEME = /[a-z][a-z0-9+.-]*:\/\//i;
/**
 * The only URL shape accepted for a safe read: https, then a hostname made of hostname
 * characters only, then the end or a path/query/fragment. No userinfo ("@"), port, backslash
 * or punctuation in the authority, which different URL parsers split differently
 * ("https://api.github.com,@evil.example/x" is evil.example to some of them).
 */
const STRICT_HTTPS_URL = /^https:\/\/([a-z0-9.-]+)(?:[/?#][^\s\\]*)?$/i;

/** Arguments that can point a request somewhere other than its URL. Any non-empty one disqualifies a safe read. */
const SECOND_DESTINATION_KEY =
  /^(?:urls|uris?|endpoints?|hosts?|hostname|server|servers|base_?url|baseUrl|proxy|proxies|proxy_url|proxyUrl|webhooks?|webhook_?url|callbacks?|callback_?url|domain|origin|target|targets|to|redirect|redirect_?url|forward|forward_to|mirror)$/i;
/** Text that names a host without a scheme: "evil.example", "evil.example:8080/x", an IPv4 or [IPv6] address. */
const HOST_LIKE =
  /(?:^|[\s@=])(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#\s]|$)|\b\d{1,3}(?:\.\d{1,3}){3}\b|\[[0-9a-f:]+\]/i;
/** Headers that change where, or through what, a request is sent. */
const ROUTING_HEADER = /^(?:host|forwarded|x-forwarded-.*|x-original-.*|x-host|proxy-.*|via)$/i;

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
  // Exactly one destination: the URL. A second one (another URL, or a host/proxy/server
  // argument without a scheme) could send the request elsewhere.
  if (urlLeaves.length !== 1) return false;
  const urlLeaf = urlLeaves[0]!;
  if (!isBoundedReadUrl(urlLeaf.value.trim(), limits)) return false;
  const urlPath = new Set(pathSegments(urlLeaf.path));

  // Query parameters passed as an object count against the query budget, keys included,
  // and may not carry encoded data either.
  let paramsText = 0;
  for (const [key, value] of Object.entries(args)) {
    if (!PARAMS_KEY.test(key) || isEmpty(value)) continue;
    const serialized = JSON.stringify(value);
    if (longestOpaqueRun(serialized) > limits.maxOpaqueRun) return false;
    paramsText += serialized.length;
  }
  if (paramsText > limits.maxQueryLength) return false;

  if (!headersAreBounded(args, limits, strict)) return false;

  // Everything else (values and key names, at any depth) could be sent along or name a
  // second destination: keep it small, with no destination-like key, host or "//" in it.
  let otherText = 0;
  for (const [key, value] of Object.entries(args)) {
    if (METHOD_KEYS.includes(key) || HEADER_KEY.test(key) || PARAMS_KEY.test(key)) continue;
    for (const k of [key, ...nestedKeys(value)]) {
      if (urlPath.has(k)) continue;
      if (SECOND_DESTINATION_KEY.test(k) || looksLikeDestination(k)) return false;
      otherText += k.length;
    }
  }
  for (const leaf of leaves) {
    if (leaf === urlLeaf) continue;
    const top = topKey(leaf.path);
    if (METHOD_KEYS.includes(top) || HEADER_KEY.test(top) || PARAMS_KEY.test(top)) continue;
    if (looksLikeDestination(leaf.value)) return false;
    otherText += leaf.value.length;
  }
  return otherText <= limits.maxOtherText;
}

function looksLikeDestination(text: string): boolean {
  return text.includes('//') || text.includes('\\') || HOST_LIKE.test(text);
}

/** Every object key below a value, at any depth. */
function nestedKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(nestedKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [k, ...nestedKeys(v)]);
  }
  return [];
}

/** "request.options[0].url" → ["request", "options", "url"]. */
function pathSegments(path: string): string[] {
  return path.split(/[.[\]]/).filter((s) => s && !/^\d+$/.test(s));
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
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.some(([h]) => ROUTING_HEADER.test(h))) return false;
    // After a sensitive read only plain content-negotiation headers (no Authorization).
    if (strict && !entries.every(([h]) => SAFE_HEADER_NAMES.has(h.toLowerCase()))) return false;
    for (const [h, v] of entries) {
      // A credential is long and opaque by nature, and only reaches the read-only host.
      if (h.toLowerCase() === 'authorization') continue;
      if (longestOpaqueRun(`${h} ${String(v)}`) > limits.maxOpaqueRun) return false;
    }
  }
  return true;
}

// ------------------------------------------------------------------ messaging

function isMessaging(toolName: string, args: Record<string, unknown>): boolean {
  const name = toolName.toLowerCase();
  if (!MESSAGING_TOOL.test(name) || NOT_MESSAGING_TOOL.test(name)) return false;

  const keys = Object.keys(args);
  if (!keys.some((key) => RECIPIENT_KEY.test(key) && !isEmpty(args[key]))) return false;
  const allKeys = [...keys, ...keys.flatMap((key) => nestedKeys(args[key]))];
  if (allKeys.some((key) => DESTINATION_KEY.test(key) || ATTACHMENT_KEY.test(key))) return false;

  // "No URL destination": not in any field, including the message text. And short: a status
  // update fits easily, a file's contents pasted into the body does not.
  const leaves = walkStringLeaves(args);
  if (leaves.some((leaf) => HAS_SCHEME.test(leaf.value))) return false;
  return leaves.reduce((sum, leaf) => sum + leaf.value.length, 0) <= MAX_MESSAGE_TEXT;
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
