# AGENTS.md
Guidance for coding agents working in this repository.

## Scope and layout
- Two assessment tracks exist:
  - `track1-cv-dogs/` (brief only; no runnable scaffold committed)
  - `track2-fullstack/` (FarmTracker app: backend + static frontend)
- Most executable code is in `track2-fullstack/app/`.
- Unless user says otherwise, keep edits scoped to the assigned track.

## Primary docs
- Root overview: `README.md`
- Fullstack brief: `track2-fullstack/BRIEF.md`
- Fullstack feature request: `track2-fullstack/TODO.md`
- App runbook: `track2-fullstack/app/README.md`
- CV brief: `track1-cv-dogs/BRIEF.md`

## Cursor / Copilot instructions
- No `.cursorrules` file found.
- No `.cursor/rules/` directory found.
- No `.github/copilot-instructions.md` file found.
- If these files are added later, treat them as higher-priority local instructions.

## Environment
- Backend runtime: Node.js `22.5+` (uses built-in `node:sqlite`).
- Backend package root: `track2-fullstack/app/backend/`.
- Default backend port: `3000` (override via `PORT`).
- DB path can be overridden with `FARMTRACKER_DB_PATH`.

## Install and run
Run from `track2-fullstack/app/backend/` unless stated otherwise.

```bash
npm install
node seed.js
npm start
```

Dev mode (watch):

```bash
npm run dev
```

## Build, lint, and test commands

### Build
- No separate build step is configured (plain Node.js + static assets).
- Runtime command is `npm start`.

### Lint / format
- No lint script in `package.json`.
- No ESLint/Prettier config present.
- Do not add formatting tooling unless requested.

### Tests
Run from `track2-fullstack/app/backend/`.

All tests:

```bash
npm test
# equivalent:
node --test
```

Single test file:

```bash
node --test test/api.test.js
```

Single test by name pattern:

```bash
node --test --test-name-pattern="GET /api/paddocks returns an array" test/api.test.js
```

From repo root (no directory change):

```bash
node --test track2-fullstack/app/backend/test/api.test.js
```

## Testing notes
- Tests use `node:test` + `node:assert/strict`.
- Integration tests launch server on port `0` (ephemeral).
- Tests isolate DB via temp directory and `FARMTRACKER_DB_PATH`.
- `after()` closes DB and removes temporary directory.

## Code style guidelines (inferred)

### Module and imports
- Backend uses CommonJS (`require`, `module.exports`).
- Prefer `const`; use `let` only when reassignment is needed.
- Keep imports at top of file.
- Import order convention:
  1. Node built-ins
  2. Third-party modules
  3. Local modules

### Formatting
- Use semicolons.
- Use single quotes for JS strings.
- Use 2-space indentation.
- Keep trailing commas where already used in multiline literals.
- Prefer multiline SQL/template literals for readability.
- Keep lines concise and break chains when readability improves.

### Naming conventions
- Variables/functions: `camelCase`.
- Class/constructor-like symbols: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants (e.g., `API_BASE`).
- Route files use plural nouns (e.g., `animals.js`, `paddocks.js`).
- DB columns are `snake_case`; preserve API compatibility.

### Types and contracts
- Project is JavaScript-only; no TypeScript setup.
- Validate request payloads at route boundaries.
- Preserve existing response field names unless a coordinated refactor is required.
- Keep JSON response shapes consistent for success/error cases.

### Error handling
- Prefer early returns for validation failures.
- Use status codes intentionally (`400`, `404`, `422` as appropriate).
- Backend error payload convention: `{ error: 'message' }`.
- Frontend API helper throws on non-OK responses.
- Avoid leaking stack traces or internal details.

### Database and SQL
- Always use parameterized queries (`?`) with `db.prepare(...).run/get/all(...)`.
- Keep related mutations consistent (e.g., paddock `animal_count` updates).
- Respect foreign keys and cascade behavior in schema.
- Do not interpolate user values into SQL strings.

### API and routing
- Keep handlers focused: parse input, validate, query/update, respond.
- Check entity existence before dependent operations.
- Preserve current status semantics:
  - `200` successful reads/updates
  - `201` successful creates
  - `404` missing resources
  - other `4xx` for client/validation errors

### Frontend conventions
- Keep shared fetch logic in `frontend/app.js`.
- Prefer small page-local functions (`load*`, event handlers) in each HTML page.
- Render explicit loading and empty states.
- Use simple descriptive CSS classes (`.card-grid`, `.page-header`, etc.).

### Comments and docs
- Prefer self-explanatory code; comment only non-obvious intent.
- If run/test behavior changes, update `track2-fullstack/app/README.md`.
- If API behavior changes, update docs in the same PR.
