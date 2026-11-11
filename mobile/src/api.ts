import { API_URL } from "./config";

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setToken = (t: string | null) => (token = t);
export const getToken = () => token;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok) throw new ApiError(res.status, data.error || "error");
  return data as T;
}

export const fetcher = (path: string) => api(path);
