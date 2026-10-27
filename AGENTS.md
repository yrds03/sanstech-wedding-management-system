# WeddingHub — Instruksi proyek untuk AI coding agents

## Product source of truth

1. `01_PRD_WEDDINGHUB.md`: tujuan, bisnis, data, role, keamanan, acceptance.
2. `02_UX_FLOW_WIREFRAMES.md`: routing, screens, interactions, visual design.
3. `03_BACKLOG_TEST_CASES.md`: urutan pengerjaan, gate testing.
4. `04_PROMPT_ANTIGRAVITY.md`: petunjuk untuk kickoff coding agent.

Jika ditemukan konflik, utamakan **keamanan data dan invariants** pada PRD, lalu catat keputusan pada `docs/DECISIONS.md`. Jangan menebak data rahasia atau mengaktifkan integrasi pembayaran palsu.

## Stack & conventions

- Next.js App Router, TypeScript strict, Tailwind, shadcn/ui.
- Supabase Auth/Postgres/RLS; migrations under `supabase/migrations/`.
- Semua user-visible copy berbahasa Indonesia, kecuali kode dan proper names.
- Server-side auth/authz on every private action; protected private DB tables with RLS and least privilege grants.
- Server-authoritative entitlement and quota checks (Free/Pro/Pro Plus).
- File names, function names, types, and DB schema in English with descriptive naming.
- No `any` without justification, no placeholders that pretend to work, no production seed/demo rows.
- Structured errors: code + Indonesian display message, no leaking technical secrets.
- No direct access to data from other tenants; membership verified by event and workspace.
- Never put Supabase service role/secret into `NEXT_PUBLIC_*`, client-side code, logs or git.
- Do not write actual secrets to repository. `.env.example` documents variable names only.
- Avoid running destructive commands or migrations against production without express permission.

## MVP integrity rules

- RSVP and check-in are distinct.
- Each invitation group has integer `capacity` and signed check-in ledger.
- `0 <= SUM(ledger.delta_attendees) <= capacity` enforced within atomic DB transaction.
- Idempotency key prevents duplicate retry; do not rely on double-click button guard.
- QR opaque random token is event scoped, revocable and different from public invite token.
- VIP public display only after explicit opt-in/approved setting, false by default.
- Display is paired with event-scoped restricted session, revocable.
- Realtime failure must not roll back successful check-in; provide fallback polling.
- No automatic WhatsApp mass messages or fake online payment.
- Online-first MVP; disconnected browser does NOT mark guest checked-in.
- Correction requires supervisor/manager auth, signed ledger delta and reason, audited.

## Agent working agreement

- Before implementing any sprint: inspect current repository; summarize relevant existing code and state.
- Work in small functional increments: DB/RLS -> server APIs -> UI -> tests.
- Keep a changelog/decision note if deviating from docs.
- Run lint, typecheck, tests, build and report actual results; do not state PASS unless executed.
- If local Supabase credentials unavailable, create migrations, docs, and test harness; explicitly identify tests blocked by missing environment rather than faking success.
- Report updated files, migrations, environment variables, actual working UI routes, and known issues.
- Prioritize Sprint 0 then Sprint 1; later sprints only after gates pass.
