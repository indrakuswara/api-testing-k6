/*
 * K6-01 · Smoke test
 * Purpose: validate the scripts and capture a performance baseline.
 * Polite by design: 1 VU against the public demo API.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.API_BASE_URL || 'https://api.restful-api.dev';

export default function () {
  const list = http.get(`${BASE}/objects`);
  check(list, {
    'list: status 200': (r) => r.status === 200,
    'list: non-empty array': (r) => Array.isArray(r.json()) && r.json().length > 0,
  });

  const single = http.get(`${BASE}/objects/7`);
  check(single, {
    'single: status 200': (r) => r.status === 200,
    'single: id matches': (r) => r.json().id === '7',
  });

  sleep(1);
}
