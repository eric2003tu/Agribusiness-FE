const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:8000/api/v1/";
const API_ORIGIN = new URL(API_BASE_URL).origin;

const ACCESS_TOKEN_KEY = "agribridge.auth.access";
const REFRESH_TOKEN_KEY = "agribridge.auth.refresh";

/** Media file fields (listing/product photos) come back as an absolute URL
 * from a create/update response but a relative `/media/...` path from
 * list/retrieve — confirmed by directly testing the live server. This
 * normalizes either into a URL that's always safe to use as an `<img src>`. */
export function resolveMediaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, API_ORIGIN).toString();
}

export interface Tokens {
  access: string;
  refresh: string;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function getTokens(): Tokens | null {
  const access = readStorage(ACCESS_TOKEN_KEY);
  const refresh = readStorage(REFRESH_TOKEN_KEY);
  return access && refresh ? { access, refresh } : null;
}

export function setTokens(tokens: Tokens) {
  writeStorage(ACCESS_TOKEN_KEY, tokens.access);
  writeStorage(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function clearTokens() {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
}

/** Fired once the client has given up on a session — an authenticated call
 * 401'd and the refresh token also failed (expired/blacklisted), so the stored
 * tokens were cleared. The workspace store listens for this to tear down the
 * in-memory session so the user is actually signed out instead of stranded on
 * pages whose API calls keep failing. */
export const SESSION_EXPIRED_EVENT = "agribridge:session-expired";

function emitSessionExpired() {
  try {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  } catch {
    /* event unavailable */
  }
}

/** DRF's error shape is either field-level ({"field": ["msg", ...]}) or a
 * non-field {"detail": "msg"} — callers inspect `.body` for either. */
export class ApiError extends Error {
  status: number;
  body: Record<string, unknown> | null;

  constructor(status: number, body: Record<string, unknown> | null) {
    super(apiErrorMessage(body) ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** DRF's default message for every permission-class rejection (staff-only,
 * owner-only, etc.) — deliberately generic on the server side. The API never
 * exposes an `is_staff`/ownership field for the frontend to check in advance,
 * so this is the only signal a caller ever gets; expand it into something
 * actionable rather than relaying the bare sentence everywhere it's used. */
const GENERIC_PERMISSION_DENIED = "You do not have permission to perform this action.";

export function apiErrorMessage(
  body: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!body) return undefined;
  if (typeof body["detail"] === "string") {
    const detail = body["detail"];
    if (detail === GENERIC_PERMISSION_DENIED) {
      return `${detail} This usually means the signed-in account needs additional access (e.g. staff permissions) on the AgriBridge API — ask an administrator to grant it.`;
    }
    return detail;
  }
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/** Field-level DRF errors ({"phone": ["already registered"]}) as a flat
 * field -> first-message map, for inline form validation. Excludes `detail`. */
export function apiFieldErrors(
  body: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!body) return {};
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "detail") continue;
    if (Array.isArray(value) && typeof value[0] === "string") fields[key] = value[0];
    else if (typeof value === "string") fields[key] = value;
  }
  return fields;
}

/** Cursor-paginated list response shape used by every list endpoint. */
export interface ApiPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Builds a query string from a params object, skipping undefined/null/""
 * values and coercing booleans/numbers to strings — shared by every
 * resource's `list*Api` function. */
export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** Set internally to prevent infinite refresh loops. */
  _isRetry?: boolean;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<Tokens | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  try {
    const res = await fetch(new URL("auth/token/refresh/", API_BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!res.ok) return null;
    const body = await parseJsonSafe(res);
    const access = body?.["access"];
    const refresh = body?.["refresh"];
    if (typeof access !== "string" || typeof refresh !== "string") return null;
    const rotated = { access, refresh };
    setTokens(rotated);
    return rotated;
  } catch {
    return null;
  }
}

/**
 * Thin fetch wrapper for the AgriBridge API: joins the base URL, attaches the
 * bearer token, parses JSON, and throws a typed ApiError on non-2xx. On a 401
 * from an authenticated call it silently refreshes the access token once and
 * retries — if refresh also fails, clears the stored tokens so the app treats
 * the session as signed out.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, _isRetry = false } = options;
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData) headers["Content-Type"] = "application/json";

  if (auth) {
    const tokens = getTokens();
    if (tokens) headers["Authorization"] = `Bearer ${tokens.access}`;
  }

  const res = await fetch(new URL(path, API_BASE_URL), {
    method,
    headers,
    body: body === undefined ? null : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !_isRetry) {
    const rotated = await refreshAccessToken();
    if (rotated) {
      return apiRequest<T>(path, { ...options, _isRetry: true });
    }
    clearTokens();
    emitSessionExpired();
  }

  if (!res.ok) {
    const errBody = await parseJsonSafe(res);
    throw new ApiError(res.status, errBody);
  }

  if (res.status === 204) return undefined as T;
  return (await parseJsonSafe(res)) as T;
}
