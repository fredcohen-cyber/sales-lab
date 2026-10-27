// Every request is bounded: nothing in the interface waits forever.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function api(path, { method = 'GET', body, timeoutMs = 20000, raw = false, quiet401 = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        'x-requested-with': 'SalesLab',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new ApiError(0, 'timeout', 'Sales Lab took too long to respond. Check your connection and try again.');
    }
    throw new ApiError(0, 'network', 'Sales Lab could not be reached. Check your connection and try again.');
  }
  clearTimeout(timer);
  if (raw && res.ok) return res;
  let data = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401 && !quiet401) onUnauthorized();
    throw new ApiError(res.status, err.code || 'error', err.message || `Request failed (${res.status}).`, err.details);
  }
  return data;
}

export const get = (p, o) => api(p, o);
export const post = (p, body = {}, o) => api(p, { ...o, method: 'POST', body });
export const put = (p, body = {}, o) => api(p, { ...o, method: 'PUT', body });
export const patch = (p, body = {}, o) => api(p, { ...o, method: 'PATCH', body });
export const del = (p, o) => api(p, { ...o, method: 'DELETE' });

export function newRequestId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
