# API Testing + k6 Performance Testing

Functional API automation (**Playwright + TypeScript**) and load/performance testing
(**k6**) against the free public demo API
[restful-api.dev](https://restful-api.dev) — no auth, no signup, real CRUD.

## Quick start

```bash
npm install

# functional API suite (no browser binaries needed — request context only)
npm test                 # all 28 tests
npm run test:smoke       # @smoke only
npm run test:regression  # @regression only
npm run test:e2e         # @e2e only
npm run test:report      # open the HTML report

# typecheck
npm run typecheck
```

Target a different API (e.g. a local mock) with:

```bash
API_BASE_URL=http://localhost:3000 npm test
```

## k6 performance tests

[Install k6](https://grafana.com/docs/k6/latest/set-up/install-k6/), then:

```bash
npm run k6:smoke   # 1 VU baseline
npm run k6:load    # ramp to 50 VU, SLO thresholds
npm run k6:spike   # 100 VU spike + recovery check

# heavy tests — local mock ONLY, they refuse to run against the public API
API_BASE_URL=http://localhost:3000 k6 run k6/scripts/soak.js
API_BASE_URL=http://localhost:3000 k6 run k6/scripts/stress.js
```

| Script | Load profile | Key thresholds |
|--------|--------------|----------------|
| `smoke.js` | 1 VU, 1 min | p95 < 1000 ms, errors < 1% |
| `load.js` | ramp 0→20→50 VU, ~8 min | p95 < 800 ms, p99 < 1500 ms, errors < 1% |
| `spike.js` | 10 → 100 → 10 VU | errors < 5% during spike, p95 recovers < 800 ms |
| `soak.js` | 20 VU, 30 min (local only) | errors < 1%, flat p95 trend |
| `stress.js` | ramp to 300 VU (local only) | observes the breaking point |

> **Etiquette:** restful-api.dev is a free service run by someone else. The CI
> workflow only runs k6 on manual trigger (`workflow_dispatch`) — never on every
> push. Keep local runs modest.

## CI

- `api-tests.yml` — runs the Playwright suite on push/PR, uploads the HTML report.
- `k6.yml` — manual trigger with a script picker (`smoke` / `load` / `spike`),
  uploads the JSON results.

## Test inventory

28 functional cases in `api-tests/tests/` (see
[`docs/test-cases.md`](docs/test-cases.md) for the full matrix):

| File | Covers | IDs |
|------|--------|-----|
| `get.spec.ts` | list, filtering, single, schema, timing | TC-API-001 – 007 |
| `post.spec.ts` | create incl. negative & security-ish inputs | TC-API-008 – 015 |
| `put-patch.spec.ts` | full vs partial update semantics | TC-API-016 – 020 |
| `delete.spec.ts` | delete + idempotency | TC-API-021 – 023 |
| `e2e.spec.ts` | chained lifecycle flows | TC-API-024 – 025 |
| `contract.spec.ts` | headers, wrong method, unknown route | TC-API-026 – 028 |

Every test that creates data deletes it afterwards (`afterEach` cleanup), so the
public API is left as found. Cases marked *(document actual)* assert loosely and
log the real response — the demo API occasionally behaves non-standardly, and
documenting that is part of the test value.

## Project structure

```
api-testing-k6/
├── api-tests/
│   ├── tests/          # spec files per area
│   └── utils/          # api-client (request wrapper) + zod schemas
├── k6/scripts/         # smoke / load / spike / soak / stress
├── .github/workflows/  # api-tests.yml, k6.yml
├── playwright.config.ts
└── package.json
```

## License

MIT
