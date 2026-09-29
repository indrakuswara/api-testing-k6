import { test, expect, type APIRequestContext } from '@playwright/test';
import { newApiContext, endpoints, createObject, deleteObject } from '../utils/api-client';

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await newApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test('TC-API-024 [@e2e @smoke] full lifecycle: POST → GET → PATCH → GET → DELETE → GET(404)', async () => {
  // Create
  const created = await createObject(ctx, { name: 'TC-024 lifecycle', data: { price: 50 } });
  expect(typeof created.id).toBe('string');

  // Read
  let res = await ctx.get(endpoints.objectById(created.id));
  expect(res.status()).toBe(200);
  expect((await res.json()).name).toBe('TC-024 lifecycle');

  // Partial update
  res = await ctx.patch(endpoints.objectById(created.id), { data: { name: 'TC-024 updated' } });
  expect(res.status()).toBe(200);

  // Verify update persisted
  res = await ctx.get(endpoints.objectById(created.id));
  expect((await res.json()).name).toBe('TC-024 updated');

  // Delete
  res = await ctx.delete(endpoints.objectById(created.id));
  expect(res.status()).toBe(200);

  // Gone
  res = await ctx.get(endpoints.objectById(created.id));
  expect(res.status()).toBe(404);
});

test('TC-API-025 [@e2e @regression] create 3 objects, verify in list, then clean up', async () => {
  const ids: string[] = [];
  try {
    for (let i = 1; i <= 3; i++) {
      const created = await createObject(ctx, { name: `TC-025 bulk ${i}`, data: { batch: 'tc-025' } });
      ids.push(created.id);
    }
    const res = await ctx.get(endpoints.objectByIds(ids));
    expect(res.status()).toBe(200);
    const returnedIds = ((await res.json()) as Array<{ id: string }>).map((o) => o.id).sort();
    expect(returnedIds).toEqual([...ids].sort());
  } finally {
    for (const id of ids) await deleteObject(ctx, id);
  }
});
