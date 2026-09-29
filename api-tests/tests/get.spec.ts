import { test, expect, type APIRequestContext } from '@playwright/test';
import { newApiContext, endpoints } from '../utils/api-client';
import { apiObjectListSchema, apiObjectSchema } from '../utils/schemas';

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await newApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test('TC-API-001 [@smoke] GET /objects returns 200 with a JSON array', async () => {
  const res = await ctx.get(endpoints.objects);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
});

test('TC-API-002 [@regression] every item matches the object schema', async () => {
  const res = await ctx.get(endpoints.objects);
  expect(res.status()).toBe(200);
  const parsed = apiObjectListSchema.safeParse(await res.json());
  expect(parsed.success, JSON.stringify(parsed).slice(0, 500)).toBe(true);
});

test('TC-API-003 [@regression] GET /objects responds within 2 seconds', async () => {
  const started = Date.now();
  const res = await ctx.get(endpoints.objects);
  const elapsed = Date.now() - started;
  expect(res.status()).toBe(200);
  expect(elapsed).toBeLessThan(2000);
});

test('TC-API-004 [@regression] GET /objects?id=3&id=5 returns only requested ids', async () => {
  const res = await ctx.get(endpoints.objectByIds([3, 5]));
  expect(res.status()).toBe(200);
  const body = await res.json();
  const ids = (body as Array<{ id: string }>).map((o) => o.id).sort();
  expect(ids).toEqual(['3', '5']);
});

test('TC-API-005 [@smoke] GET /objects/7 returns the object with id "7"', async () => {
  const res = await ctx.get(endpoints.objectById(7));
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.id).toBe('7');
  const parsed = apiObjectSchema.safeParse(body);
  expect(parsed.success).toBe(true);
});

test('TC-API-006 [@regression] GET non-existent id returns 404', async () => {
  const res = await ctx.get(endpoints.objectById(99999999));
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain('not found');
});

test('TC-API-007 [@regression] GET non-numeric id returns 404', async () => {
  const res = await ctx.get(endpoints.objectById('abc'));
  expect(res.status()).toBe(404);
});
