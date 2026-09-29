import { request, type APIRequestContext } from '@playwright/test';

export const BASE_URL = process.env.API_BASE_URL ?? 'https://api.restful-api.dev';

export const endpoints = {
  objects: '/objects',
  objectById: (id: string | number) => `/objects/${id}`,
  objectByIds: (ids: Array<string | number>) =>
    `/objects?${ids.map((id) => `id=${encodeURIComponent(String(id))}`).join('&')}`,
} as const;

export async function newApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    proxy: proxyFromEnv(),
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Playwright does not read proxy env vars on its own, so corporate proxies
 * are picked up explicitly here (server + optional basic-auth credentials).
 */
function proxyFromEnv():
  | { server: string; username?: string; password?: string }
  | undefined {
  const raw = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const proxy: { server: string; username?: string; password?: string } = {
      server: `${url.protocol}//${url.host}`,
    };
    if (url.username) {
      proxy.username = decodeURIComponent(url.username);
      proxy.password = decodeURIComponent(url.password);
    }
    return proxy;
  } catch {
    return undefined;
  }
}

export interface ApiObject {
  id: string;
  name: string;
  data?: Record<string, unknown> | null;
}

/** POST /objects — accepts 200 or 201, throws otherwise. */
export async function createObject(
  ctx: APIRequestContext,
  payload: Record<string, unknown>,
): Promise<ApiObject> {
  const res = await ctx.post(endpoints.objects, { data: payload });
  if (![200, 201].includes(res.status())) {
    throw new Error(`POST /objects failed with ${res.status()}: ${await res.text()}`);
  }
  return (await res.json()) as ApiObject;
}

/** DELETE /objects/{id} — best effort, never throws (used for cleanup). */
export async function deleteObject(ctx: APIRequestContext, id: string | number): Promise<void> {
  try {
    await ctx.delete(endpoints.objectById(id));
  } catch {
    // cleanup only — ignore
  }
}
