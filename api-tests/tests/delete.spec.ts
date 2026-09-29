import { test, expect, type APIRequestContext } from '@playwright/test';
import { newApiContext, endpoints, createObject } from '../utils/api-client';
import { deleteResponseSchema } from '../utils/schemas';

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await newApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test('TC-API-021 [@smoke] DELETE removes the object; GET afterwards is 404', async () => {
  const created = await createObject(ctx, { name: 'TC-021 doomed', data: null });
  const del = await ctx.delete(endpoints.objectById(created.id));
  expect(del.status()).toBe(200);
  const parsed = deleteResponseSchema.safeParse(await del.json());
  expect(parsed.success).toBe(true);
  const get = await ctx.get(endpoints.objectById(created.id));
  expect(get.status()).toBe(404);
});

test('TC-API-022 [@regression] DELETE non-existent id returns 404', async () => {
  const res = await ctx.delete(endpoints.objectById(99999999));
  expect(res.status()).toBe(404);
});

test('TC-API-023 [@regression] DELETE twice — second call is 404', async () => {
  const created = await createObject(ctx, { name: 'TC-023 twice', data: null });
  const first = await ctx.delete(endpoints.objectById(created.id));
  expect(first.status()).toBe(200);
  const second = await ctx.delete(endpoints.objectById(created.id));
  expect(second.status()).toBe(404); // not idempotent — already gone
});
