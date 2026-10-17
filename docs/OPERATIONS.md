# CampWise setup and operations

**Reviewed:** 11 October 2026 · **Baseline:** `c8c7514` · [Documentation index](README.md)

Commands below assume the repository root unless stated otherwise. Examples use placeholders and an isolated local database; they do not reproduce existing credentials. No seed, migration, server against a live database, or external AI request was executed to prepare these documents.

## 1. Prerequisites and package boundaries

- Node.js and npm. The manifests do not pin an engine or package-manager version. Documentation checks ran with Node `v22.21.1` and npm `10.9.4`; this is a recorded test environment, not a declared support matrix.
- MongoDB available through MONGODB_URI. Replica-set/transaction support is needed for the strongest camp-plus-buildings creation behavior; standalone fallback has limitations.
- An API key is required only if running the optional AI service. Missing OPENAI_API_KEY throws during its initialization.
- Install the three packages independently. There is no npm workspace or root script starting all services.

```sh
# Repository root
npm ci

# Backend package
(cd server && npm ci)

# Optional AI service package
(cd mcp-server && npm ci)
```

All three directories have lockfiles. The commands above are setup instructions, not a claim that clean installs were performed for this documentation. Root dependencies and backend dependencies declare different Express versions; do not rely on root modules as substitutes for backend installation.

## 2. Environment configuration

### Frontend: repository-root environment file

Vite loads its environment at startup/build time. Update the existing configuration deliberately rather than replacing local files blindly.

```dotenv
VITE_API_BASE_URL=http://localhost:3001
VITE_MCP_API_URL=http://localhost:3002
VITE_ENABLE_MOCK=false
```

| Variable | Default / behavior |
| --- | --- |
| VITE_API_BASE_URL | `http://localhost:3001`; origin only, without `/api` |
| VITE_MCP_API_URL | `http://localhost:3002`; origin only, without `/mcp` |
| VITE_ENABLE_MOCK | Compared with string true in database config, but app config reads a mismatched enableMock property |
| VITE_MONGODB_URI | Referenced by legacy client config; not needed for browser-to-API operation; do not put database credentials in client settings |
| VITE_MONGODB_DB_NAME | Legacy client metadata, default camp_management; does not choose the active backend database |

Values prefixed VITE_ can be exposed in browser builds. Backend credentials belong in server-side environment only. Changing the API origin after deployment generally requires rebuilding the frontend; there is no runtime configuration injection layer in the reviewed app.

### Backend

[server/server.js](../server/server.js) calls dotenv without an explicit file path, so `.env` is resolved from the process working directory.

```dotenv
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/campwise_local
DB_NAME=campwise_local
JWT_SECRET=<long-random-server-side-secret>
```

| Variable | Behavior |
| --- | --- |
| PORT | Defaults 3001 |
| MONGODB_URI | Required for database connection; no active-server default |
| DB_NAME | Passed as Mongoose dbName; explicitly selects database when supplied |
| JWT_SECRET | Used for signing/verifying JWT; code has a fixed fallback, which should not be relied upon |

Two valid launch arrangements:

1. Keep backend values in root `.env` and launch `node server/server.js` from root.
2. Keep backend values in `server/.env` and run `npm start` from `server/`.

Do not assume `npm --prefix server start` reads root `.env`; npm package scripts run in the package directory. Environment variables already exported to the process can also supply configuration.

### Optional AI service: `mcp-server/.env`

```dotenv
PORT=3002
OPENAI_API_KEY=<server-side-api-key>
OPENAI_MODEL=gpt-4o-mini
BACKEND_API_URL=http://localhost:3001
BACKEND_API_TIMEOUT=10000
FRONTEND_URL=http://localhost:5173
MAX_CONVERSATION_HISTORY=20
SESSION_TIMEOUT=3600000
LOG_LEVEL=info
```

| Variable | Default / unit |
| --- | --- |
| PORT | 3002 |
| OPENAI_API_KEY | Required at service initialization |
| OPENAI_MODEL | Configured default string gpt-4o-mini; verify availability for the chosen account separately |
| BACKEND_API_URL | Backend origin, default localhost:3001 |
| BACKEND_API_TIMEOUT | 10000 milliseconds |
| FRONTEND_URL | Allowed CORS origin, default localhost:5173 |
| MAX_CONVERSATION_HISTORY | 20 stored messages, not 20 user/assistant exchanges |
| SESSION_TIMEOUT | 3600000 milliseconds idle time; cleanup every ten minutes |
| LOG_LEVEL | error/warn/info/debug for logger helper; direct console logs remain independent |

The implementation above is authoritative for variable names/defaults. Existing service notes and env.example may include older assumptions.

## 3. Start and inspect the application

Use separate terminals:

```sh
# Terminal 1: root cwd, using root .env for backend
node server/server.js
```

```sh
# Terminal 2: root cwd, frontend
npm start
```

```sh
# Terminal 3: optional AI service, using mcp-server/.env
cd mcp-server
npm start
```

For backend hot reload, run `npm run dev` from server with configuration available there. The AI package also offers `npm run dev`. Vite supplies frontend development reload.

Read-only health checks, after starting your configured services:

```sh
curl --fail http://localhost:3001/health
curl --fail http://localhost:3002/mcp/health
```

Backend health reports Mongoose connection state. A 200 alone does not mean connected. AI health confirms that the process responds; it does not test the model key, quota, or backend. API discovery separately probes backend health, then uses a hardcoded endpoint catalogue.

Open the URL Vite prints. Its default port is 5173, but another port may be chosen if busy. Match FRONTEND_URL to the actual browser origin for AI CORS. The main API currently allows general CORS.

Initial feature setup is location → camp/buildings → rooms → employee/visitor → assignment. Sign-up is available in the UI and currently creates admin users. This behavior should be addressed before exposing registration in a deployed system.

## 4. Build and deployment model

```sh
npm run build
npm run preview
```

Vite outputs **build/**, with source maps enabled. Preview serves a local build for inspection; it is not a committed production hosting configuration.

A deployment needs separate handling for:

| Component | Hosting requirement |
| --- | --- |
| Frontend | Static hosting of build/ and SPA fallback to index.html for browser routes |
| Backend | Node process running server/server.js with server environment and database connectivity |
| Optional AI | Separate Node process running mcp-server/server.js, backend connectivity, model credentials |
| Database | Persistent MongoDB; replica set for transactions; backup/restore procedures outside this repo |

The active backend does not serve static frontend assets. Legacy server/index.js attempts production serving from a path based on `../../dist`, which does not match the active Vite build directory. Switching entry points is not a deployment fix.

Frontend URLs are embedded at build time. When using a reverse proxy, preserve the client contract: backend calls use `/api`, chat uses `/mcp/chat`, health uses `/health` and `/mcp/health`. In a remote deployment, localhost in a compiled browser URL means the end user's computer.

No Dockerfile, compose configuration, process supervisor, CI workflow, TLS termination, or deployment automation was found in the reviewed source tree. Those must be supplied by the chosen hosting environment. Resolve the [documented auth/data-consistency gaps](TECHNICAL.md#9-known-limitations-and-engineering-priorities) as part of deployment preparation.

## 5. Verification

### Existing focused automated suite

```sh
node --test tests/dashboard.test.cjs
```

Result during documentation: **11 passed, 0 failed**. The tests compile dashboard helpers through esbuild and mock the assignment route's model calls. Coverage includes:

- Room status breakdown, clamping, fallback totals, and percentage precision.
- Upcoming checkout date windows across year boundaries and UTC display behavior.
- Invalid/missing relative dates.
- Assignment filters, pagination, ordering, and invalid checkout date rejection.

No live database is required. There is no root `npm test` script. Passing this suite does not establish correctness of check-in/checkout writes, browser interactions, authorization, bulk transactions, or AI integration.

### Other available checks

```sh
npm run lint
npx tsc --noEmit
npm run prettier
```

Root lint covers TS/TSX by its script. Prettier checks src, not these Markdown documents. TypeScript is configured strict with allowJs false while the project imports JSX files in places. Vite also references Babel/Emotion plugins not declared as root direct dependencies. Run build/type checks when changing application code and investigate concrete output rather than assuming a clean baseline.

For this documentation-only change, the focused suite and local documentation checks were used. A fresh install, production build, browser walkthrough, and real API/AI smoke test were not run. Application code, database contents, and generated build output were not modified by the documentation work.

### Documentation checks

The documentation checks passed for 99 local links/heading references, 10 embedded JSON examples, and balanced code fences across six documents. The 14 Mermaid blocks were reviewed as source diagrams; graphical rendering was not tested. Model-to-collection names were also checked by loading model definitions without connecting to MongoDB. A compatible Markdown renderer is needed to display diagrams graphically. Future reviews should compare behavior with code rather than treat older comments as guarantees.

## 6. Legacy-data migration

Source: [migrateToNewStructure.js](../server/scripts/migrateToNewStructure.js). It loads root `.env` explicitly and reads MONGODB_URI/DB_NAME. It is separate from runtime startup.

The script's own operating instruction is to run against a backup first. It introduces required hierarchy references and checks selected blockers before hardened constraints are relied on.

| Stage | Action |
| --- | --- |
| 1 | Resolve/create Location records from legacy Camp.location strings, using Unassigned for blanks |
| 2 | Set missing camp locationId; report duplicate camp names within locations |
| 3 | Create/reuse Main Block for camps needing a default building |
| 4 | Set missing room buildingId |
| 5 | Rename duplicate room numbers within a building using numeric suffixes |
| 6 | Backfill missing room status from raw legacy isAvailable, removing old boolean for those records |
| 7 | Raise building floor counts where existing rooms exceed the declared maximum |
| Summary | Report counts/missing references and collected blockers; exit nonzero for blockers |

With environment deliberately pointed at a backup database:

```sh
node server/scripts/migrateToNewStructure.js --dry-run
```

After reviewing the plan and preserving a restorable backup, the write command is:

```sh
node server/scripts/migrateToNewStructure.js
```

These are operational instructions; neither command was executed for this documentation. Dry-run skips explicit migration data writes, but loads Mongoose models and does not disable automatic index initialization. It is not a guarantee of a completely read-only database connection. Dry-run aggregation checks also examine persisted state, not a full simulated post-migration dataset.

Writes skip many already-populated fields, but the script is not a transaction or full integrity audit. It does not repair every invalid existing reference or all uniqueness/camp-building inconsistencies. A failed run can leave completed earlier steps. Compare before/after counts, inspect renamed numbers and Unassigned camps, verify references/indexes, and resolve blockers before deployment. The script does not provide rollback; restore/reconciliation must use the prepared backup and recorded changes.

## 7. Development seeding

Source: [seedDevDb.js](../server/scripts/seedDevDb.js). It reads root `.env` explicitly and requires MONGODB_URI_DEV. Missing variable aborts. A substring guard rejects some protected database names, but does not prove that every other URI is a safe development target.

```sh
# Only after deliberately selecting a disposable development database
node server/scripts/seedDevDb.js
```

The script deletes all locations, camps, buildings, facilities, and rooms, then inserts sample hierarchy data. It does not reset employees or assignments, so reusing a database with those records can leave references to removed rooms/camps. It is not a login-account bootstrap. No seed was run for this documentation.

## 8. Logging, health, and failure recovery

Main API uses Morgan combined logs, API method/path logs, and handler-specific console logging. Employee creation logs its request body. AI logs orchestration steps, message snippets, timing, and optional structured helper logs. LOG_LEVEL only governs the helper. There is no central request ID/audit log subsystem.

### Troubleshooting

| Symptom | First checks |
| --- | --- |
| Backend cannot find MongoDB URI | Verify cwd and dotenv location; server and root launch arrangements differ |
| Backend exits after connection error | Check intended URI/database/network configuration; active server exits on connection rejection |
| UI targets wrong API or repeated 404 | VITE_API_BASE_URL must be origin only; confirm correct server entry point and path prefix |
| Health path appears missing | Active server uses /health; legacy entry uses /api/health |
| Requests lack expected bearer token | Compare BaseService Redux token path against api.ts and fetch/mcp token lookups |
| Password reset/sign-out endpoint missing | Recovery/reset unimplemented; sign-out intentionally clears local state despite API failure |
| Room list empty after outage | RoomService getRooms catches errors and returns []; inspect browser request/logs |
| Camp creation partially present | Check Mongo transaction support and fallback partial building cleanup |
| Bulk generation failed | Inspect actual inserted rooms before retry; preflight is not transactional |
| Room cannot be assigned | Check status and active assignments, not capacity alone |
| Checkout leaves employee assigned | Inspect populated room ID comparison and embedded history; do not assume all documents synchronized |
| Visitor assignment absent from profile | Temporary Visitor branch skips employee pointer/history updates |
| Deactivated employee still occupies room | Deactivation does not check out assignments |
| Maintenance requests missing elsewhere | LocalStorage is browser-specific; no shared persistence |
| Chat service fails immediately | OPENAI_API_KEY required during startup |
| Chat seems responsive but data unchanged | Widget may simulate on connection failure; inspect /mcp/chat result and backend requests |
| Chat history disappears | Process restarted, idle cleanup, or request reached a different instance |
| Chat error arrives with HTTP 200 | Inspect response success flag and message |
| Generic count/aggregate/deleteMany fails | Undefined createGenericSchema or preceding :id route interception |
| Clean build fails on plugin/import | Inspect manifest/config mismatch and import casing; build output was not validated in this docs pass |

For partial assignment failures, inspect the three relevant records together: assignment status/timestamps, room status, employee currentRoomId/history. No automatic repair job exists. Repair decisions require knowing whether the original operation or a newer assignment owns the room.

## 9. Operational boundaries

The repository does not implement scheduled checkout, bed allocation, shared maintenance tickets, inventory stock control, email/SMS delivery, persistent AI memory, assignment reconciliation jobs, or a comprehensive audit trail. Expected checkout dates are reporting fields; rooms are not automatically released when the date passes.

The [flow verification table](FLOWS.md#12-verification-scenarios) provides an isolated-environment checklist for validating these boundaries and the main user journeys before relying on a deployment.
