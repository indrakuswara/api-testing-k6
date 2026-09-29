/*
 * K6-04 · Soak test (OPTIONAL — local mock only)
 * Purpose: detect degradation / memory leaks over a long run.
 *
 * NEVER run this against the public demo API. It refuses to start unless
 * API_BASE_URL points somewhere else.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.API_BASE_URL || '';
if (!BASE || BASE.includes('restful-api.dev')) {
  throw new Error(
    'Refusing to soak-test the public demo API. Set API_BASE_URL to a local mock, e.g. API_BASE_URL=http://localhost:3000',
  );
}

export const options = {
  vus: 20,
  duration: '30m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // no hard p95 gate here — instead watch the trend across the run
  },
};

export default function () {
  const res = http.get(`${BASE}/objects`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
