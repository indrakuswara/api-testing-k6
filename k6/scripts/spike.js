/*
 * K6-03 · Spike test
 * Purpose: verify the API survives a sudden traffic spike and recovers.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // baseline
    { duration: '1m', target: 100 },  // spike!
    { duration: '1m', target: 10 },   // recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],          // under 5% errors even during spike
    http_req_duration: ['p(95)<1500'],       // degraded but bounded during spike
  },
};

const BASE = __ENV.API_BASE_URL || 'https://api.restful-api.dev';

export default function () {
  const res = http.get(`${BASE}/objects`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
