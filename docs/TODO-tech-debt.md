# Tech Debt TODO

Audit: 2026-06-23 | Last updated: 2026-06-24

---

## 🔴 SECURITY — Vulnerabilities

| Severity | Package                                   | Issue                                                             | Status                                                                                                                                                                                                                |
| -------- | ----------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | `multer` (via `@nestjs/platform-express`) | DoS via deeply nested field names                                 | ✅ `fieldNestingDepth: 10, files: 1` added to `case-file.controller.ts:84`. `@ts-expect-error` added — `@types/multer@2.1.0` (latest) missing the field. Root override `multer ~2.1.1` confirmed resolving correctly. |
| HIGH     | `hono`                                    | Path traversal via `%5C` on Windows (CVE, `serve-static`)         | ✅ Override `"hono": ">=4.12.25"` added to root `package.json`. Resolves to 4.12.27 (patched). Not used in source — transitive via `memory-mcp → @modelcontextprotocol/sdk`.                                          |
| HIGH     | `@nestjs/testing`                         | Transitive via `multer`                                           | ✅ Resolved by multer fix above.                                                                                                                                                                                      |
| MODERATE | `@opentelemetry/core` <2.8.0              | Unbounded memory allocation in W3C Baggage propagation (CVSS 5.3) | ✅ `@sentry/nextjs` + `@sentry/node` bumped to `^10.60.0`. Direct override `"@opentelemetry/core": ">=2.8.0"` added — sentry 10.60.0 doesn't pull 2.8.0 yet. Resolves to 2.8.0.                                       |

---

## 🟠 MAJOR VERSION UPGRADES (breaking changes — plan carefully)

| Package                       | Current      | Latest         | Used In                                      | Notes                                                                                                                                                                            |
| ----------------------------- | ------------ | -------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod`                         | 3.25.76      | **4.4.3**      | everywhere                                   | Low actual risk — only `z.coerce.number()` in 3 places (settings page); no `errorMap`/`ZodError` usage. Codemod: `npx zod-v3-to-v4`.                                             |
| `inngest`                     | 3.54.2       | **4.11.0**     | `apps/inngest`, `apps/web`                   | Medium risk — 11 functions + 2 `serve()` sites need mechanical rewrites (triggers→options object, serve API changed). Test each function registers after upgrade.                |
| `googleapis`                  | 140.0.1      | **173.0.0**    | `apps/api`, `apps/inngest`, `packages/video` | Low risk — only uses `calendar.v3`, `drive.v3`, `gmail.v1`; these APIs are stable. Semver major was bumped for internal reasons, not breaking surface changes.                   |
| `express`                     | 4.22.2       | **5.2.1**      | `apps/inngest`                               | Blocked — root `overrides` pins `express: ~4.22.2` for NestJS. Upgrading inngest independently requires workspace-level override strategy. Skip until NestJS supports Express 5. |
| ~~`@stripe/stripe-js`~~       | ~~5.10.0~~   | ~~**9.8.0**~~  | ~~`apps/web`~~                               | ✅ Upgraded to 9.8.0                                                                                                                                                             |
| ~~`@stripe/react-stripe-js`~~ | ~~3.10.0~~   | ~~**6.6.0**~~  | ~~`apps/web`~~                               | ✅ Upgraded to 6.6.0                                                                                                                                                             |
| ~~`ical-generator`~~          | ~~8.1.1~~    | ~~**11.0.0**~~ | ~~`packages/shared`~~                        | ✅ Upgraded to 11.0.0                                                                                                                                                            |
| ~~`lucide-react`~~            | ~~0.475.0~~  | ~~**1.21.0**~~ | ~~`apps/web`~~                               | ✅ Upgraded to 1.21.0. No renamed icons in use.                                                                                                                                  |
| ~~`uuid`~~                    | ~~11.1.1~~   | ~~**14.0.1**~~ | ~~`packages/video`~~                         | ✅ Upgraded to 14.0.1                                                                                                                                                            |
| ~~`vitest`~~                  | ~~3.2.6~~    | ~~**4.1.9**~~  | ~~`apps/api`~~                               | ✅ Upgraded to 4.1.9. All 19 tests pass.                                                                                                                                         |
| ~~`typescript`~~              | ~~5.9.3~~    | ~~**6.0.3**~~  | ~~everywhere~~                               | ✅ Upgraded to 6.0.3. Fixed TS6059 (`rootDir: "../../"` in api+inngest tsconfigs) and TS2883 (removed `declaration: true` from inngest tsconfig — it's an app, not a library).   |
| ~~`eslint`~~                  | ~~9.39.4~~   | ~~**10.5.0**~~ | ~~`apps/web`~~                               | ✅ Upgraded to 10.5.0. 3 pre-existing warnings, 0 errors.                                                                                                                        |
| ~~`@types/node`~~             | ~~22.19.20~~ | ~~**26.0.0**~~ | ~~everywhere~~                               | ✅ Upgraded to 26.0.0                                                                                                                                                            |
| ~~`class-validator`~~         | ~~0.14.4~~   | ~~**0.15.1**~~ | ~~`apps/api`~~                               | ✅ Upgraded to 0.15.1                                                                                                                                                            |

---

## 🟡 MINOR VERSION BUMPS (safe, batch-update)

~~Run `npm update` for these~~ ✅ `npm update` run 2026-06-24 — all in-range patches applied.

- ~~`@aws-sdk/client-s3` 3.1063 → 3.1075~~ ✅
- ~~`@aws-sdk/s3-request-presigner` 3.1063 → 3.1075~~ ✅
- ~~`@playwright/mcp` 0.0.75 → 0.0.76~~ ✅
- ~~`@playwright/test` 1.60.0 → 1.61.0~~ ✅
- ~~`@radix-ui/*`~~ ✅
- ~~`@react-email/render` 2.0.8 → 2.0.9~~ ✅
- ~~`@sentry/nextjs` + `@sentry/node` 10.57.0 → 10.60.0~~ ✅ Done (also fixed otel CVE)
- ~~`@supabase/ssr` 0.10.3 → 0.12.0~~ ✅ Done (version skew fix)
- ~~`@supabase/supabase-js` 2.107.0 → 2.108.2~~ ✅ Done (version skew fix)
- ~~`@tailwindcss/postcss` + `tailwindcss` 4.3.0 → 4.3.1~~ ✅
- ~~`@tanstack/react-query` 5.101.0 → 5.101.1~~ ✅
- ~~`@types/pg` 8.15.6 → 8.20.0~~ ✅
- ~~`eslint-config-next` 16.2.7 → 16.2.9~~ ✅
- ~~`joi` 18.2.1 → 18.2.3~~ ✅
- ~~`lint-staged` 17.0.7 → 17.0.8~~ ✅
- ~~`pdfkit` 0.19.0 → 0.19.1~~ ✅ Done (version skew fix — `packages/prescription` aligned to `^0.19.0`)
- ~~`pg` 8.21.0 → 8.22.0~~ ✅
- ~~`prettier` 3.8.3 → 3.8.4~~ ✅
- ~~`react-hook-form` 7.79.0 → 7.80.0~~ ✅
- ~~`recharts` 3.8.1/2.15.4 → 3.9.0~~ ✅ Done (version skew fix — `apps/web` bumped to v3, `chart.tsx` updated for v3 types)
- ~~`shadcn` 4.10.0 → 4.11.0~~ ✅
- ~~`stripe` 22.2.0 → 22.2.3~~ ✅
- ~~`turbo` 2.9.16 → 2.10.0~~ ✅

---

## 🟡 DEPRECATED API USAGE

| File                                           | Issue                                                       | Status                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/utils/api.ts`                    | `getSession()` without server validation                    | ✅ `getUser()` called first; returns `null` on error/no user. `getSession()` retained only for `access_token` extraction. |
| `apps/web/src/app/dashboard/settings/page.tsx` | Same `getSession()` in Google connect handler               | ✅ `getUser()` guard added before `getSession()`. Uses `currentUser` to avoid scope shadowing.                            |
| `apps/web/src/utils/supabase/server.ts`        | `SUPABASE_SECRET_KEY` — wrong env var, silently `undefined` | ✅ Renamed to `SUPABASE_SERVICE_ROLE_KEY`.                                                                                |
| `apps/web/src/app/dashboard/layout.tsx`        | Same wrong env var in admin check guard                     | ✅ Renamed to `SUPABASE_SERVICE_ROLE_KEY`.                                                                                |
| `apps/api/src/main.ts`                         | `snapshot: true` — NestJS DevTools overhead in production   | ✅ Gated: `snapshot: process.env.NODE_ENV !== "production"`.                                                              |
| `packages/shared/src/stripe/index.ts`          | `{} as any` bypasses required `apiVersion`                  | ✅ Replaced with `{ apiVersion: "2025-11-17.clover" as any }`.                                                            |

---

## 🟢 CODE OPTIMIZATIONS (dead code, duplication, over-engineering)

### Dead Code — delete

| File                                            | What                                                               | Why it's dead                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `apps/api/src/google/retry.ts`                  | `withRetry`                                                        | Exported, never imported anywhere                                        |
| `apps/api/src/google/google-audit.ts`           | `logGoogleAction`                                                  | Exported, never imported anywhere                                        |
| `apps/inngest/src/google-helper.ts`             | `getDoctorAuthClient` export                                       | Only `createOAuth2Client` is used; `getDoctorAuthClient` is never called |
| `apps/inngest/src/database.ts`                  | `closeDb` export                                                   | No shutdown hook calls it                                                |
| `packages/shared/src/stripe/index.ts`           | `stripe` named export (the singleton `any`)                        | Only `getStripe()` is used; the bare export is never imported            |
| `apps/api/src/booking/state-machine.service.ts` | `getTransitionsFrom`, `canTransition`, `isTerminal` public methods | Never called externally                                                  |
| `apps/api/src/booking/state-machine.service.ts` | `autoExpireBookings`                                               | Never called; callers use `getExpiredBookings` directly                  |

### Duplicate Logic — consolidate

| Files                                                                                 | Duplication                                                                           | Fix                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/api/src/google/google.service.ts` + `apps/inngest/src/google-helper.ts`         | Near-identical Google OAuth2 client creation                                          | Extract to `packages/shared` or `packages/video`                     |
| `apps/api/src/booking/booking.service.ts` `approve` + `approveAsAgreed`               | Same flow: fetch → `transitionTo("CONFIRMED")` → insert `case_file` → 2 notifications | Extract shared `_confirmBooking(bookingId, doctorId)` private method |
| `apps/api/src/booking/booking.service.ts` `getConsultations` + `getPatientHistory`    | Identical JOIN + SELECT column list; differ only in WHERE                             | Extract shared query builder                                         |
| `apps/api/src/payment/payment.service.ts` + `apps/api/src/booking/booking.service.ts` | `case_file` insert logic duplicated in 3 places                                       | Move to `CaseFileService.createForBooking(bookingId)`                |
| `apps/api/src/payment/payment.service.ts` `capturePayment` / `voidPayment`            | Directly writes `booking.status` + `payment` table, bypassing `StateMachineService`   | Route through state machine or use shared DB write helper            |

### Over-engineering — simplify

| File                                             | Issue                                                               | Fix                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/middleware.ts`                     | Entire file just re-exports `updateSession` as `middleware`         | ✅ Renamed `updateSession`→`middleware` at source; wrapper file replaced with re-export + config.                                            |
| `apps/api/src/common/guards/ownership.helper.ts` | 5 structurally identical `assert*Ownership` functions (71 lines)    | ✅ Collapsed to generic `assertOwnership(db, type, entityId, doctorId)` with config map. All 4 service files updated.                        |
| `apps/api/src/utils/error-filter.ts`             | `AllExceptionsFilter` only adds `Logger.error` before `super.catch` | ❌ **Kept intentionally** — logs HTTP status + stack trace that `BaseExceptionFilter` alone omits. Removing it would silence all error logs. |
| `apps/api/src/booking/booking.service.ts`        | Dynamic `import("bcrypt")` inside method body                       | ✅ Replaced with static `import bcrypt from "bcrypt"`. Both dynamic imports removed.                                                         |

### Version Skew — fix consistency

| Issue                                                               | Status                                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/prescription` pins `pdfkit: ^0.15.0`; root pins `^0.19.0` | ✅ Aligned to `^0.19.0` — single install (0.19.1)                                                                                                                        |
| `apps/web` has `recharts: ^2.15.4`; root has `recharts: ^3.8.1`     | ✅ Web bumped to `^3.9.0`. `chart.tsx` updated for v3 type changes: explicit `TooltipPayloadItem`/`LegendPayloadItem` types replace removed recharts internal type refs. |
| `@supabase/ssr`: root `^0.10.3`, `apps/web` `^0.6.0`                | ✅ Web aligned to `^0.12.0`. `supabase-js` also aligned: `^2.49.0` → `^2.108.2`.                                                                                         |

---

## Priority Order

1. ~~**Security**~~ ✅ Done — all CVEs addressed
2. ~~**Deprecated APIs**~~ ✅ Done — all 6 fixes applied
3. ~~**Version skew**~~ ✅ Done — pdfkit, recharts, @supabase/ssr all consolidated
4. ~~**Over-engineering**~~ ✅ Done — middleware re-export simplified, 5→1 ownership helper, static bcrypt import. `error-filter.ts` kept (provides real logging).
5. ~~**Minor bumps**~~ ✅ Done — `npm update` run 2026-06-24; all in-range patches applied
6. ~~**Dead code**~~ ✅ Done — 7 dead exports removed/privatised
7. ~~**Duplicate logic**~~ ✅ Done — 5 duplication clusters consolidated
8. **Major upgrades** — remaining: `zod` 3→4 (low risk, codemod available), `inngest` 3→4 (medium risk, 13 files), `googleapis` 140→173 (low risk), `express` 4→5 (blocked by NestJS global override)

## Implementation Plan — SECURITY

| Step | Package               | Action                                        | Details                                                                                                                                                                                                                                   |
| ---- | --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `multer`              | Add `limits.fieldNestingDepth` to upload call | In `apps/api/src/case-file/case-file.controller.ts:84`, add `limits: { fieldNestingDepth: 10, fileSize: 10 * 1024 * 1024, files: 1 }` to `FileInterceptor`. Root override `"multer": "~2.1.1"` already set — verify with `npm ls multer`. |
| 2    | `hono`                | Remove transitive dep or override             | Not imported in source. Add override `"hono": ">=4.12.25"` or remove parent dep. Verify: `grep -r "from 'hono'" apps/ packages/` → 0 matches.                                                                                             |
| 3    | `@nestjs/testing`     | Resolved by multer fix                        | Indirect — fixed when Step 1 confirms multer override applies.                                                                                                                                                                            |
| 4    | `@opentelemetry/core` | Bump Sentry to pull OTel ≥2.8.0               | `npm install @sentry/nextjs@^10.60.0 @sentry/node@^10.60.0`. Staying within v10 major. Add direct override `"@opentelemetry/core": ">=2.8.0"` if Sentry doesn't pull it.                                                                  |

### Verification

```sh
npm ls multer              # expect 2.1.x
npm ls @opentelemetry/core # expect ≥2.8.0
npm ls hono                # removed or ≥4.12.25
npm run typecheck && npm run lint
```

---

## Implementation Plan — DEAD CODE (delete)

### Files to delete

| #   | File                                  | Contains                        |
| --- | ------------------------------------- | ------------------------------- |
| 1   | `apps/api/src/google/retry.ts`        | `withRetry()` — 0 imports       |
| 2   | `apps/api/src/google/google-audit.ts` | `logGoogleAction()` — 0 imports |

### Exports to remove

| #   | File                                      | Symbol                | Action                                                          |
| --- | ----------------------------------------- | --------------------- | --------------------------------------------------------------- |
| 3   | `apps/inngest/src/google-helper.ts:22-31` | `getDoctorAuthClient` | Delete function                                                 |
| 4   | `apps/inngest/src/database.ts:18-22`      | `closeDb`             | Delete function                                                 |
| 5   | `packages/shared/src/stripe/index.ts:5`   | `stripe` named export | Remove `export` keyword (internal usage in `getStripe()` stays) |

### State machine methods

| #   | Method               | Action                                      |
| --- | -------------------- | ------------------------------------------- |
| 6   | `getTransitionsFrom` | Delete — 0 callers                          |
| 7   | `canTransition`      | Add `private` — internal only               |
| 8   | `isTerminal`         | Add `private` — internal only               |
| 9   | `autoExpireBookings` | Delete — 0 callers (Inngest handles expiry) |

### Execution

```sh
rm apps/api/src/google/retry.ts apps/api/src/google/google-audit.ts
# Edit stripe: remove export keyword
# Edit google-helper: delete getDoctorAuthClient
# Edit database: delete closeDb
# Edit state-machine.service.ts: 4 method changes
npm run typecheck && npm run lint
```

---

## Implementation Plan — MINOR VERSION BUMPS

### Phase 1: Fix version skew (4 edits)

| Package                 | File                                 | Change                                       |
| ----------------------- | ------------------------------------ | -------------------------------------------- |
| `@supabase/ssr`         | `apps/web/package.json`              | `"^0.6.0"` → `"^0.12.0"`                     |
| `@supabase/supabase-js` | `apps/web/package.json`              | `"^2.49.0"` → `"^2.108.2"`                   |
| `pdfkit`                | `packages/prescription/package.json` | `"^0.15.0"` → `"^0.19.0"`                    |
| `recharts`              | `apps/web/package.json`              | `"^2.15.4"` → `"^3.8.1"` (consolidate to v3) |

### Phase 2: Batch npm update

```sh
npm update
```

### Phase 3: Explicit Sentry

```sh
npm install @sentry/nextjs@^10.60.0 @sentry/node@^10.60.0
```

### Verify

```sh
npm ls @supabase/ssr          # expect 0.12.x
npm ls pdfkit                 # expect single 0.19.x
npm ls recharts               # expect single 3.9.x
npm run typecheck && npm run lint
cd apps/api && npm test
```

---

## Implementation Plan — DEPRECATED API USAGE

| #   | File                                               | Issue                                               | Fix                                                       |
| --- | -------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| 1   | `apps/web/src/utils/api.ts:7`                      | `getSession()` → `getUser()`                        | Add `getUser()` validation, keep `getSession()` for token |
| 2   | `apps/web/src/app/dashboard/settings/page.tsx:730` | Same `getSession()`                                 | Same pattern                                              |
| 3   | `apps/web/src/utils/supabase/server.ts:35`         | `SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY` | Rename env var                                            |
| 4   | `apps/web/src/app/dashboard/layout.tsx:11`         | Same wrong env var                                  | Same rename                                               |
| 5   | `apps/api/src/main.ts:23`                          | `snapshot: true` in production                      | `snapshot: process.env.NODE_ENV !== "production"`         |
| 6   | `packages/shared/src/stripe/index.ts:5`            | `{} as any` bypasses apiVersion                     | `{ apiVersion: "2025-11-17.clover" as any }`              |

### Verify

```sh
grep -r "getSession()" apps/web/src/ --include="*.ts" --include="*.tsx"
grep -r "SUPABASE_SECRET_KEY" apps/ --include="*.ts" --include="*.tsx"
npm run typecheck && npm run lint
```

---

## Implementation Plan — OVER-ENGINEERING (simplify)

| #   | File                                             | Issue                      | Fix                                                                                          |
| --- | ------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | `apps/web/src/middleware.ts`                     | 10-line re-export wrapper  | Rename `updateSession`→`middleware` at source, delete file                                   |
| 2   | `apps/api/src/common/guards/ownership.helper.ts` | 5 identical functions      | Collapse to generic `assertOwnership(db, type, entityId, doctorId)` with config map          |
| 3   | `apps/api/src/utils/error-filter.ts`             | Wrapper only adds Logger   | Delete wrapper, remove `useGlobalFilters` from main.ts. Optionally add `LoggingInterceptor`. |
| 4   | `apps/api/src/booking/booking.service.ts`        | Dynamic `import("bcrypt")` | Static `import bcrypt from "bcrypt"` at top                                                  |

### Execution

```sh
# 1: Rename export in middleware.ts, rm wrapper
# 2: Replace ownership.helper.ts with generic function, update all call sites
# 3: rm error-filter.ts, remove import + useGlobalFilters from main.ts
# 4: Static import + replace 2 dynamic imports in booking.service.ts
npm run typecheck && npm run lint && cd apps/api && npm test
```

---

## Implementation Plan — MAJOR VERSION UPGRADES

### Context7 Research Summary

| #   | Package                   | Current  | Target  | Risk     | Context7 Finding                                                                                                                                           |
| --- | ------------------------- | -------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `zod`                     | 3.25.76  | 4.4.3   | **High** | `errorMap`→`error()` function API. `z.coerce` input `string`→`unknown`. Schema-level error maps precedence changed. Codemod `zod-v3-to-v4` available.      |
| 2   | `inngest`                 | 3.54.2   | 4.10.0  | **High** | Triggers in options object. `EventSchemas`→`eventType()`+`staticSchema()`. Serve options moved to client constructor. `step.invoke()` needs function refs. |
| 3   | `@stripe/stripe-js`       | 5.10.0   | 9.8.0   | Medium   | `elements.update()` returns Promise since `dahlia`. Coordinate with `react-stripe-js`.                                                                     |
| 4   | `@stripe/react-stripe-js` | 3.5.0    | 6.6.0   | Medium   | Must coordinate with stripe-js.                                                                                                                            |
| 5   | `ical-generator`          | 8.1.1    | 11.0.0  | Medium   | v5→v6 removed `save()`, `saveSync()`, `serve()`, `toURL()`, `toBlob()`. Safe if not used.                                                                  |
| 6   | `googleapis`              | 140.0.1  | 173.0.0 | Medium   | Semver major but additive. Test calendar/drive/gmail.                                                                                                      |
| 7   | `lucide-react`            | 0.475.0  | 1.21.0  | Low      | 4 icon renames: GitHub→Github, Grid→LayoutGrid, Table→Table2, Tool→Wrench.                                                                                 |
| 8   | `uuid`                    | 11.1.1   | 14.0.1  | Medium   | v12 dropped CJS (ESM only). v14 requires global `crypto` (Node≥20). Project already on Node 22+.                                                           |
| 9   | `express`                 | 4.22.2   | 5.2.1   | Medium   | Express 5 auto-handles rejected async middleware. Used only in `apps/inngest`.                                                                             |
| 10  | `vitest`                  | 3.2.6    | 4.1.9   | Medium   | `poolOptions.forks` flattened to top-level. `maxForks`→`maxWorkers`. `test()` options arg moved 3rd→2nd position.                                          |
| 11  | `typescript`              | 5.9.3    | 6.0.3   | **High** | `strict: true` becomes default. Target defaults ES2025. `import assert`→`import with`.                                                                     |
| 12  | `eslint`                  | 9.39.4   | 10.5.0  | Medium   | `eslint:recommended` adds 3 rules. `context.getCwd()`→`context.cwd`.                                                                                       |
| 13  | `@types/node`             | 22.19.20 | 26.0.0  | Trivial  | Types-only. Bump + typecheck.                                                                                                                              |
| 14  | `class-validator`         | 0.14.4   | 0.15.1  | Low      | Schema-based validation dropped in v0.12 — not used.                                                                                                       |

---

### ~~Phase 1: Zero-risk (batch)~~ ✅ Done 2026-06-24

`@types/node` →26, `class-validator` →0.15.1, `lucide-react` →1.21.0. No icon renames needed.

### ~~Phase 2: Medium-risk (serially)~~ ✅ Done 2026-06-24

`uuid` →14, `vitest` →4.1.9 (19/19 tests pass), `ical-generator` →11, `@stripe/stripe-js` →9.8.0, `@stripe/react-stripe-js` →6.6.0, `eslint` →10.5.0 (0 errors). `express` →5 blocked (see notes above).

### ~~Phase 3: TypeScript 6~~ ✅ Done 2026-06-24

Two fixes required beyond the version bump:

- `apps/api/tsconfig.json` + `apps/inngest/tsconfig.json`: added `"rootDir": "../../"` — TS6 enforces TS6059 even with `noEmit: true` when path aliases point outside the inferred rootDir.
- `apps/inngest/tsconfig.json`: removed `"declaration": true` — TS6 raises TS2883 on `inngest.createFunction()` exports because the inferred type references CJS internals (`InngestFunction`, `Logger`, etc.). Inngest is an app not a library; declarations are unused.

**Zod 4**:

```sh
npx zod-v3-to-v4 apps/web/src/ packages/shared/src/ packages/db/src/
grep -rn 'errorMap\|z\.coerce\.string' apps/ packages/ --include="*.ts" --include="*.tsx"
npm install zod@^4.0.0 && npm run typecheck
```

**Inngest 4**: Manual migration of function definitions (triggers→options, EventSchemas→eventType, Serve options→constructor).

---

## Implementation Plan — DUPLICATE LOGIC (consolidate)

### Overview

| #   | Files                                                 | Duplication                    | Lines           | Strategy                                                              |
| --- | ----------------------------------------------------- | ------------------------------ | --------------- | --------------------------------------------------------------------- |
| 1   | `google.service.ts` + `google-helper.ts`              | OAuth2 client creation         | ~6 shared lines | Extract `createOAuth2Client()` to `packages/video/src/google-auth.ts` |
| 2   | `approve` + `approveAsAgreed` in `booking.service.ts` | Fetch→transition→insert→notify | ~38 lines, ~85% | Extract `_confirmBooking()` private method                            |
| 3   | `getConsultations` + `getPatientHistory`              | Same JOIN+SELECT+sort          | ~36 lines, ~90% | Extract `_bookingWithSlotsQuery()`                                    |
| 4   | `case_file` insert in 3 places                        | Insert without Drive folder    | 3 occurrences   | Add `CaseFileService.createForBooking()`                              |
| 5   | `capturePayment`/`voidPayment`                        | Bypass state machine           | 2 occurrences   | Inject `StateMachineService`, use `transitionTo()`                    |

### Fix details

**1. Google OAuth2** — Add `packages/video/src/google-auth.ts`:

```typescript
import { google } from "googleapis";
export function createOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  refreshToken: string
) {
  const auth = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}
```

Export from `packages/video/src/index.ts`. Update both `google.service.ts` and `google-helper.ts` to import and use it.

**2. approve+approveAsAgreed** — Extract `_confirmBooking()` that does: fetch booking → `transitionTo()` → `createForBooking()` → 2 notifications. Callers only differ in state decision and payment_method validation.

**3. getConsultations+getPatientHistory** — Extract `_bookingWithSlotsQuery(doctorId)` returning the common `selectFrom("booking").innerJoin("slot").leftJoin("case_file").select([15 cols]).where(doctorId)` builder. Callers add their WHERE + pagination. `getConsultations` adds `booking.video_room_url` via chained `.select()`.

**4. case_file insert** — Add to `case-file.service.ts`:

```typescript
async createForBooking(bookingId: string) {
  const booking = await this.database.db.selectFrom("booking").select(["doctor_id", "patient_name", "patient_email"]).where("id", "=", bookingId).executeTakeFirst();
  if (!booking) throw new NotFoundException("Booking not found");
  const existing = await this.database.db.selectFrom("case_file").select("id").where("booking_id", "=", bookingId).executeTakeFirst();
  if (existing) return existing;
  return this.database.db.insertInto("case_file").values({ booking_id: bookingId, doctor_id: booking.doctor_id, patient_name: booking.patient_name, patient_email: booking.patient_email }).returningAll().executeTakeFirstOrThrow();
}
```

Inject into BookingService + PaymentService, replace 3 duplicates.

**5. State machine bypass** — Inject `StateMachineService` into `PaymentService`. Replace:

- `capturePayment`: `await this.stateMachine.transitionTo(payment.booking_id, "CAPTURED")`
- `voidPayment`: `await this.stateMachine.transitionTo(payment.booking_id, "CANCELLED_BY_DOCTOR")`
  Both transitions already valid in state machine. Keep `payment` table update separately.

### Verify

```sh
grep -rn '\.insertInto("case_file")' apps/api/src/ --include="*.ts"
# expect only CaseFileService.createForBooking and CaseFileService.create (with Drive)
cd apps/api && npm test
npm run typecheck && npm run lint
```
