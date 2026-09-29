/*
 * K6-02 · Load test
 * Purpose: validate SLOs under normal-to-high traffic.
 * Read-heavy mix (80% list / 20% single) mirrors realistic API usage.
 * Kept modest out of respect for the free public demo API.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // ramp up
    { duration: '3m', target: 20 }, // steady
    { duration: '1m', target: 50 }, // ramp to peak
    { duration: '2m', target: 50 }, // peak hold
    { duration: '1m', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // error rate under 1%
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

const BASE = __ENV.API_BASE_URL || 'https://api.restful-api.dev';

export default function () {
  let res;
  if (Math.random() < 0.8) {
    res = http.get(`${BASE}/objects`);
    check(res, {
      'list: status 200': (r) => r.status === 200,
      'list: valid schema': (r) => Array.isArray(r.json()) && typeof r.json()[0].id === 'string',
    });
  } else {
    const id = 1 + Math.floor(Math.random() * 13); // seeded ids on the demo API
    res = http.get(`${BASE}/objects/${id}`);
    check(res, {
      'single: status 200': (r) => r.status === 200,
      'single: id matches': (r) => r.json().id === String(id),
    });
  }
  sleep(1);
}
