import { test, expect, type APIRequestContext } from '@playwright/test';
import { newApiContext, endpoints } from '../utils/api-client';

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await newApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test('TC-API-026 [@regression] successful responses use JSON content type', async () => {
  for (const path of [endpoints.objects, endpoints.objectById(7)]) {
    const res = await ctx.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
  }
});

test('TC-API-027 [@regression] POST to /objects/{id} returns 405 Method Not Allowed', async () => {
  const res = await ctx.post(endpoints.objectById(7), { data: { name: 'wrong place' } });
  expect(res.status()).toBe(405);
});

test('TC-API-028 [@regression] GET unknown route is rejected with 401', async () => {
  // The demo API guards unknown paths with 401 "Unauthorized path" — documented here.
  const res = await ctx.get('/this-route-does-not-exist');
  expect(res.status()).toBe(401);
});
