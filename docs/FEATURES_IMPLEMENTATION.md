# Implemented sidebar features

The four approved screens are implemented in the existing React/Elstar application and Express/Mongoose API. The sidebar now opens real routes. Screens use existing shared controls, drawers, authentication state, and the CampWise theme, with responsive layouts.

| Screen | Route | Implemented workflow |
| --- | --- | --- |
| Check-In / Check-Out | `/check-in-out` | Scoped camp/date/search filters; arrivals, due/overdue and history; resident → room → review → check-in; reviewed checkout with Cleaning/Available; persisted notes and events. |
| Facilities | `/facilities` | Cards/list, search, camp/type/status filters, pagination, details, creation and editing of capacity, hours, description and status. Deactivation retains the record. |
| Reports | `/reports` | Current room occupancy, resident roster, actual stay movements and facilities register; filtered preview, CSV and print/PDF. |
| Settings & Roles | `/settings-roles` | User creation/editing, fixed role templates, assigned camps, activation, temporary-password reset, organization preferences and recent access/settings activity. |

## Data and access behavior

- A room supports **one active stay**. Capacity remains metadata; this is not bed-level allocation. Future reservations are not created by check-in.
- Check-in and checkout update the stay, room, resident pointer, resident history and audit event in one MongoDB transaction. Competing check-ins conflict safely. Repeated checkout is rejected.
- Checkout defaults to Cleaning. Staff can explicitly choose Available. Maintenance status is preserved. Mark a cleaned room Available through existing Room Management.
- Room/resident edits cannot bypass the stay workflow. Existing rooms with stay history retain their placement and cannot be deleted. Visitors use the same room-allocation rules as employees.
- Every operational API route checks the authenticated account's current role, active state, token version and camp access. IDs, nested hierarchy routes and filter parameters are checked as well as list queries. Unchecked generic collection/aggregation endpoints are removed.
- Administrator: all camps and all feature actions. Camp Manager: rooms, residents, stays, facilities, reports and export for assigned camps. Reception: residents, stays and report previews for assigned camps. Viewer: read access and report previews for assigned camps. Only administrators manage organization settings and accounts.
- Role/camp/status changes and password resets revoke existing sessions. Temporary passwords must be replaced before accessing operational data. At least one active administrator must remain, including during concurrent edits.
- AI requests verify the account with the API; conversation history is isolated by authenticated session. AI tool calls retain the caller's credentials. Connection failures are shown explicitly instead of returning simulated answers.

## Reports and preferences

Report generation persists an owner-specific snapshot for 30 minutes, so CSV content matches the preview even if underlying records change. Export rechecks ownership, expiry, role and camp access. CSV cells protect against spreadsheet formula execution. Reports are limited to 20,000 rows per preview; narrow filters for larger datasets.

Occupancy uses actual room statuses, with maintenance and cleaning counted as unavailable. Percentages handle empty results. Movement reports use recorded check-in/out times, not expected checkout dates. Date boundaries use the configured operational timezone (Asia/Riyadh by default). Calendar-only expected dates do not shift with browser timezone. The organization name/logo appears in printed reports; date format applies to report data and stay details. PDF is the browser's Print / Save as PDF workflow.

## Running against your database

Install dependencies at the root and in `server/` (and `mcp-server/` when using AI). Configure `server/.env` with `MONGODB_URI`, optional `DB_NAME`, a strong `JWT_SECRET`, and optional `PORT` (3001 by default). The database must support transactions: use MongoDB Atlas or a local replica set. A standalone server cannot complete transactional changes and returns a clear error.

Keep machine-local signing secrets in the Git-ignored `server/.env.local`. Startup reads that file before `server/.env`; existing process environment variables take precedence over both. A missing `JWT_SECRET` fails before opening a database connection. This workspace has a generated local secret; other machines must supply their own.

Run the API with `npm --prefix server start` and the frontend with `npm start`. Set `VITE_API_BASE_URL` to the API origin. For AI, retain the existing MCP provider configuration, set `BACKEND_API_URL` to the same API, and `VITE_MCP_API_URL` to the MCP origin.

An empty database allows the first sign-up to create an administrator. Public registration then closes; create subsequent accounts through Settings & Roles. No invitation email is sent: the administrator shares the temporary password securely.

Existing `admin` accounts retain administrator access. Legacy `user` accounts resolve to Viewer and require assigned camps; they are not automatically promoted. If an existing database has no active administrator, the operator can preview a bootstrap change:

```sh
node server/scripts/bootstrapAdmin.js --email existing@example.com
```

Review its output, then rerun with `--apply` to grant administrator access. The script refuses to run when an active administrator already exists, preserves the password, revokes old sessions, and records an audit event. This script has **not** been run against your database.

Existing records are not mass-migrated or rewritten. Existing inconsistent allocations should be reviewed before rollout; a conflicting stay is rejected rather than silently repaired.

## Verification and review

```sh
npm test
npm run test:ui
npm run build
```

- API/regression suite: 21 tests, covering camp/role restrictions, both concurrent booking races, transaction rollback after partial writes, visitors, checkout defaults, facility persistence, reports/CSV/expiry/timezones, user lifecycle, last-administrator protection and AI history isolation. The AI language-model response is stubbed; no external AI calls are made.
- Browser suite: uses Chrome via Playwright and creates its own temporary MongoDB replica set and Vite server. Covers sign-in, check-in/out, facility creation, CSV and print output, account creation, roles/preferences, resident registration, existing page navigation, mobile layouts, forced password replacement and viewer restrictions. Screenshots/PDF are written to `output/feature-validation/`.
- The test suites use synthetic data and do not load the API's production `.env` or connect to the live database. The first run downloads a MongoDB test binary to `/tmp/campwise-mongodb-binaries`; local listening ports and Chrome are required.
- `npm run preview:features` starts the isolated preview at `http://127.0.0.1:5181`. Synthetic login: `admin@example.test` / `Admin-test-pass-2026`. Stop with Ctrl+C; all test data is temporary.

The production build succeeds. The repository still has pre-existing TypeScript diagnostics in shared template components and legacy pages; a full `tsc --noEmit` is not a clean gate. The final check reports 60 existing diagnostics (63 before this work); there are no new diagnostics. Inventory, browser-local maintenance requests, facility booking, bed allocation, scheduled reports, email delivery, historical occupancy and custom role builders are outside these four approved features.

No production database changes or deployment were performed during implementation.
