/*
 * K6-05 · Stress / breakpoint test (OPTIONAL — local mock only)
 * Purpose: find the breaking point — how much load until errors spike.
 *
 * NEVER run this against the public demo API. It refuses to start unless
 * API_BASE_URL points somewhere else.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.API_BASE_URL || '';
if (!BASE || BASE.includes('restful-api.dev')) {
  throw new Error(
    'Refusing to stress-test the public demo API. Set API_BASE_URL to a local mock, e.g. API_BASE_URL=http://localhost:3000',
  );
}

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // Intentionally no failure gate — the point is to observe WHERE it breaks.
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const res = http.get(`${BASE}/objects`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.5);
}
