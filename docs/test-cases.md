# Test Cases — Project API + k6 (`api-testing-k6`)

Target API: **https://api.restful-api.dev** (free, no auth, real CRUD)
Base path: `/objects`
Tags: `@smoke` (critical path) · `@regression` (full) · `@e2e` (chained flows)

> Note: beberapa ekspektasi bertanda *(document actual)* — API publik kadang perilakunya
> di luar standar (mis. tetap 200 untuk ID ngaco). Test-nya ditulis untuk
> mendokumentasikan perilaku aktual, bukan memaksakan ekspektasi.

---

## A. Functional API Tests (Playwright + TypeScript)

### A1. GET /objects — List

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-001 | GET /objects | 200, body berupa JSON array | @smoke |
| TC-API-002 | Validasi schema tiap item | Setiap item punya `id` (string) dan `name` (string); `data` boleh null/object | @regression |
| TC-API-003 | Response time list | < 2000 ms | @regression |
| TC-API-004 | GET /objects?id=3&id=5 | 200, hanya id 3 dan 5 yang kembali | @regression |

### A2. GET /objects/{id} — Single

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-005 | GET /objects/7 | 200, `id` = "7" | @smoke |
| TC-API-006 | GET /objects/99999999 (tidak ada) | 404 *(document actual)* | @regression |
| TC-API-007 | GET /objects/abc (non-numeric) | *(document actual — catat status & body)* | @regression |

### A3. POST /objects — Create

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-008 | POST payload valid `{name, data:{price, color}}` | 200, response ada `id` baru + `name` sesuai kiriman | @smoke |
| TC-API-009 | GET /objects/{id-baru} setelah create | 200, data tersimpan (persist) | @regression |
| TC-API-010 | POST dengan nested data (array colors, spec object) | Struktur nested utuh tersimpan | @regression |
| TC-API-011 | POST tanpa field `name` | *(document actual)* | @regression |
| TC-API-012 | POST body kosong `{}` | *(document actual)* | @regression |
| TC-API-013 | POST body JSON malformed | 4xx | @regression |
| TC-API-014 | POST `name` berisi `<script>alert(1)</script>` | Tersimpan sebagai teks biasa, tidak tereksekusi (catat perilaku) | @regression |
| TC-API-015 | POST `name` berisi `' OR '1'='1` | Tidak menyebabkan 500 (catat perilaku) | @regression |

### A4. PUT /objects/{id} — Full Update

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-016 | PUT payload lengkap ke id valid | 200, semua field ter-update | @smoke |
| TC-API-017 | PUT lalu GET — cek full replace | Field yang tidak dikirim ikut ke-reset/hilang (verifikasi via GET) | @regression |
| TC-API-018 | PUT ke id yang tidak ada | *(document actual)* | @regression |

### A5. PATCH /objects/{id} — Partial Update

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-019 | PATCH hanya `name` | 200, `name` berubah, field lain tetap (verifikasi via GET) | @smoke |
| TC-API-020 | PATCH ke id yang tidak ada | *(document actual)* | @regression |

### A6. DELETE /objects/{id}

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-021 | DELETE id valid | 200 + pesan konfirmasi; GET setelahnya → 404 | @smoke |
| TC-API-022 | DELETE id yang tidak ada | *(document actual)* | @regression |
| TC-API-023 | DELETE id yang sudah dihapus | 404 (cek idempotency) | @regression |

### A7. E2E Chaining

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-024 | Lifecycle penuh: POST → GET → PATCH → GET → DELETE → GET | Tiap step 200 sesuai harapan; GET terakhir 404 | @e2e @smoke |
| TC-API-025 | Create 3 objects → GET list → cleanup (delete ketiganya) | Ketiganya muncul di list, lalu bersih terhapus | @e2e @regression |

### A8. Contract & Negative Umum

| ID | Test Case | Expected Result | Tags |
|----|-----------|-----------------|------|
| TC-API-026 | Semua response sukses | Header `Content-Type: application/json` | @regression |
| TC-API-027 | POST ke /objects/7 (method salah tempat) | *(document actual)* | @regression |
| TC-API-028 | GET /route-ngaco | 404 | @regression |

**Total functional: 28 test cases** (5 smoke · 21 regression · 2 e2e — sebagian overlap tag)

---

## B. Performance Tests (k6)

Etika: API publik milik orang — VU dijaga sopan. Test berat (soak/stress) hanya
boleh jalan ke mock lokal, bukan ke api.restful-api.dev.

### K6-01 · Smoke — `scripts/smoke.js`

| Item | Detail |
|------|--------|
| Tujuan | Validasi skrip & dapat baseline |
| Load | 1 VU, 1 menit |
| Skenario | GET /objects + GET /objects/7 |
| Checks | status 200; body tidak kosong |
| Threshold | p(95) < 1000 ms |

### K6-02 · Load — `scripts/load.js`

| Item | Detail |
|------|--------|
| Tujuan | Validasi SLO di beban normal–tinggi |
| Load | ramp 0→20 (1 mnt) → tahan 20 (3 mnt) → ramp 20→50 (1 mnt) → tahan 50 (2 mnt) → turun (1 mnt) |
| Skenario | 80% GET /objects, 20% GET /objects/{id} (read-heavy, realistis) |
| Checks | status 200; schema dasar (ada field `id`) |
| Threshold | `http_req_failed` < 1%; p(95) < 800 ms; p(99) < 1500 ms |

### K6-03 · Spike — `scripts/spike.js`

| Item | Detail |
|------|--------|
| Tujuan | Uji ketahanan lonjakan trafik + recovery |
| Load | 10 VU (30 dtk) → spike 100 VU (1 mnt) → kembali 10 VU (1 mnt) |
| Skenario | GET /objects |
| Checks | status 200 |
| Threshold | error rate < 5% selama spike; p(95) kembali < 800 ms dalam 1 menit setelah spike |

### K6-04 · Soak — `scripts/soak.js` (opsional, mock lokal saja)

| Item | Detail |
|------|--------|
| Tujuan | Deteksi degradasi / memory leak jangka panjang |
| Load | 20 VU konstan, 30 menit |
| Threshold | error rate < 1%; tidak ada tren naik pada p(95) dari waktu ke waktu |

### K6-05 · Stress / Breakpoint — `scripts/stress.js` (opsional, mock lokal saja)

| Item | Detail |
|------|--------|
| Tujuan | Cari titik patah (breaking point) |
| Load | ramp bertahap 10 → 200 VU sampai error rate > 5% |
| Output | VU & RPS saat sistem mulai gagal |

**Total k6: 3 skrip utama + 2 opsional.** Semua skrip menghasilkan HTML report +
summary JSON, dijalankan via GitHub Actions (job terpisah dari functional).

---

## C. Struktur Repo yang Direncanakan

```
api-testing-k6/
├── api-tests/                  # Playwright functional (TypeScript)
│   ├── tests/
│   │   ├── get.spec.ts         # TC-API-001 s.d. 007
│   │   ├── post.spec.ts        # TC-API-008 s.d. 015
│   │   ├── put-patch.spec.ts   # TC-API-016 s.d. 020
│   │   ├── delete.spec.ts      # TC-API-021 s.d. 023
│   │   ├── e2e.spec.ts         # TC-API-024, 025
│   │   └── contract.spec.ts    # TC-API-026 s.d. 028
│   ├── utils/
│   │   ├── api-client.ts       # wrapper request + base URL
│   │   └── schemas.ts          # zod schemas
│   └── playwright.config.ts
├── k6/
│   └── scripts/
│       ├── smoke.js            # K6-01
│       ├── load.js             # K6-02
│       ├── spike.js            # K6-03
│       ├── soak.js             # K6-04 (opsional)
│       └── stress.js           # K6-05 (opsional)
├── .github/workflows/
│   ├── api-tests.yml
│   └── k6.yml
├── package.json
└── README.md                   # cara jalanin + tabel hasil + penjelasan threshold
```

---

*Disusun untuk direview — kasih tau kalau ada yang mau ditambah/dikurang/diubah,
baru gua scaffold repo-nya.*
