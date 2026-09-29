import { test, expect, type APIRequestContext } from '@playwright/test';
import { newApiContext, endpoints, createObject, deleteObject } from '../utils/api-client';
import { apiObjectSchema } from '../utils/schemas';

let ctx: APIRequestContext;
const createdIds: string[] = [];

test.beforeAll(async () => {
  ctx = await newApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.afterEach(async () => {
  // Keep the public demo API clean — remove everything this run created.
  while (createdIds.length) {
    const id = createdIds.pop() as string;
    await deleteObject(ctx, id);
  }
});

test('TC-API-008 [@smoke] POST valid payload returns 200/201 with generated id', async () => {
  const payload = {
    name: 'Apple MacBook Pro 16',
    data: { year: 2024, price: 2499.99, 'CPU model': 'Apple M4', colors: ['Silver', 'Black'] },
  };
  const res = await ctx.post(endpoints.objects, { data: payload });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  expect(typeof body.id).toBe('string');
  expect(body.name).toBe(payload.name);
  createdIds.push(body.id);
});

test('TC-API-009 [@regression] created object is retrievable via GET', async () => {
  const created = await createObject(ctx, { name: 'TC-009 persistence check', data: { tag: 'tc-009' } });
  createdIds.push(created.id);
  const res = await ctx.get(endpoints.objectById(created.id));
  expect(res.status()).toBe(200);
  expect((await res.json()).name).toBe('TC-009 persistence check');
});

test('TC-API-010 [@regression] nested data structure is preserved', async () => {
  const payload = {
    name: 'TC-010 nested',
    data: { specs: { ram: '16GB', storage: ['512GB', '1TB'] }, inStock: true },
  };
  const created = await createObject(ctx, payload);
  createdIds.push(created.id);
  expect(created.data).toMatchObject(payload.data as Record<string, unknown>);
});

test('TC-API-011 [@regression] POST without "name" still creates (name defaults to null)', async () => {
  const res = await ctx.post(endpoints.objects, { data: { data: { price: 10 } } });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  createdIds.push(body.id);
  expect(body.name).toBeNull();
});

test('TC-API-012 [@regression] POST with empty body creates an object with null name', async () => {
  const res = await ctx.post(endpoints.objects, { data: {} });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  createdIds.push(body.id);
  expect(body.name).toBeNull();
});

test('TC-API-013 [@regression] POST malformed JSON returns 400', async () => {
  const res = await ctx.post(endpoints.objects, {
    headers: { 'Content-Type': 'application/json' },
    data: '{not-valid-json',
  });
  expect(res.status()).toBe(400);
});

test('TC-API-014 [@regression] POST with XSS payload in name is stored as plain text', async () => {
  const payload = { name: '<script>alert(1)</script>', data: null };
  const created = await createObject(ctx, payload);
  createdIds.push(created.id);
  expect(created.name).toBe(payload.name); // stored literally, not executed/stripped
  const parsed = apiObjectSchema.safeParse(created);
  expect(parsed.success).toBe(true);
});

test("TC-API-015 [@regression] POST with SQL-like string in name does not 500", async () => {
  const res = await ctx.post(endpoints.objects, {
    data: { name: "' OR '1'='1", data: null },
  });
  expect(res.status()).toBeLessThan(500);
  if ([200, 201].includes(res.status())) createdIds.push((await res.json()).id);
});
