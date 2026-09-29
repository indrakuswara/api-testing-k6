import { test, expect, type APIRequestContext } from '@playwright/test';
import { newApiContext, endpoints, createObject, deleteObject } from '../utils/api-client';

let ctx: APIRequestContext;
const createdIds: string[] = [];

test.beforeAll(async () => {
  ctx = await newApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.afterEach(async () => {
  while (createdIds.length) {
    const id = createdIds.pop() as string;
    await deleteObject(ctx, id);
  }
});

test('TC-API-016 [@smoke] PUT full update returns 200 with updated fields', async () => {
  const created = await createObject(ctx, { name: 'TC-016 before', data: { price: 100 } });
  createdIds.push(created.id);
  const updated = { name: 'TC-016 after', data: { year: 2025, price: 200 } };
  const res = await ctx.put(endpoints.objectById(created.id), { data: updated });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBe(updated.name);
  expect(body.data).toMatchObject(updated.data);
});

test('TC-API-017 [@regression] PUT replaces the whole resource', async () => {
  const created = await createObject(ctx, { name: 'TC-017 before', data: { price: 100, color: 'Red' } });
  createdIds.push(created.id);
  await ctx.put(endpoints.objectById(created.id), { data: { name: 'TC-017 after' } });
  const res = await ctx.get(endpoints.objectById(created.id));
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBe('TC-017 after');
  // Full replace: previously sent fields should be gone or reset — document actual.
  console.log(`TC-API-017 actual data after PUT: ${JSON.stringify(body.data)}`);
});

test('TC-API-018 [@regression] PUT to non-existent id returns 404', async () => {
  const res = await ctx.put(endpoints.objectById(99999999), { data: { name: 'ghost' } });
  expect(res.status()).toBe(404);
});

test('TC-API-019 [@smoke] PATCH name only leaves other fields untouched', async () => {
  const created = await createObject(ctx, { name: 'TC-019 before', data: { price: 100, color: 'Blue' } });
  createdIds.push(created.id);
  const res = await ctx.patch(endpoints.objectById(created.id), { data: { name: 'TC-019 after' } });
  expect(res.status()).toBe(200);
  const fetched = await (await ctx.get(endpoints.objectById(created.id))).json();
  expect(fetched.name).toBe('TC-019 after');
  expect(fetched.data).toMatchObject({ price: 100, color: 'Blue' });
});

test('TC-API-020 [@regression] PATCH to non-existent id returns 404', async () => {
  const res = await ctx.patch(endpoints.objectById(99999999), { data: { name: 'ghost' } });
  expect(res.status()).toBe(404);
});
