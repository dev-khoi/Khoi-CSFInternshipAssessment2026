# Architectural Improvement Proposal

## Problem Statement

The most significant architectural issue in FarmTracker is that route handlers currently own **too many responsibilities**: request parsing, validation, business rules, transaction control, and SQL execution are mixed in `track2-fullstack/app/backend/routes/animals.js`.

This coupling makes change risky and was a root cause of recent defects (paddock count drift, incomplete validation, non-atomic updates). The code now works, but maintainability and regression risk remain high because core domain rules are still embedded in endpoint code.

## Target Architecture

Refactor backend into a layered structure:

- **Routes (HTTP layer):** map request/response only.
- **Services (domain layer):** enforce business rules and transaction boundaries.
- **Repositories (data layer):** execute SQL only.

### Proposed Structure

```text
track2-fullstack/app/backend/
  routes/
    animals.js
    paddocks.js
  services/
    animalService.js
    weightService.js
    healthEventService.js
  repositories/
    animalRepository.js
    paddockRepository.js
    weightRepository.js
    healthEventRepository.js
  lib/
    validators.js
    errors.js
```

## Responsibilities by Layer

### Routes

- Parse params/body/query.
- Call service methods.
- Translate domain errors into HTTP status and `{ error: '...' }` payload.
- No direct SQL and no business decisions.

### Services

- Validate domain rules (capacity, existence, positive weights, date formats).
- Coordinate multi-step operations in transactions.
- Own consistency logic for paddock `animal_count` updates.

### Repositories

- Contain parameterized SQL only.
- Expose small methods with clear inputs/outputs.
- No validation or branching business logic.

## Core Service Contracts

### `AnimalService`

- `listAnimals({ page, limit })`
  - Returns animals + latest health event metadata.
- `createAnimal(payload)`
  - Validates required fields and paddock rules.
  - In one transaction: insert animal, increment paddock count (if assigned).
- `updateAnimal(id, payload)`
  - Validates existence.
  - If paddock reassigned: decrement old + increment new atomically.
- `deleteAnimal(id)`
  - Decrements paddock count if assigned, then deletes animal.

### `WeightService`

- `listWeights(animalId)`
  - Ensures animal exists.
  - Returns `ORDER BY date DESC, id DESC`.
- `createWeight(animalId, payload)`
  - Ensures animal exists.
  - Validates `weight_kg > 0`, date presence/format.
  - Inserts and returns created record.

### `HealthEventService`

- `listHealthEvents(animalId)`
- `createHealthEvent(animalId, payload)`
  - Reuses shared date validation.

## Error Model

Introduce typed domain errors in `lib/errors.js`:

- `NotFoundError`
- `ValidationError` (maps to 400)
- `UnprocessableError` (maps to 422)
- `ConflictError` (maps to 409)

Routes catch these and map to status codes. Unknown errors continue to bubble to Express default handler (or optional centralized middleware in a later iteration).

## Transaction Boundaries

Use service-level transaction wrappers for all operations that mutate both animals and paddocks:

- `createAnimal`
- `updateAnimal` (when reassigned)
- `deleteAnimal`

This guarantees that count updates and entity writes succeed/fail together.

## Execution Plan (Concrete)

### Phase 1: Repository extraction (no behavior change)

1. Create repository modules with one method per current SQL use.
2. Replace inline SQL in routes by calling repositories directly.
3. Run full tests after each endpoint migration.

### Phase 2: Service layer introduction

1. Create services and move business logic from routes to services.
2. Add transaction wrapper helper in service layer.
3. Keep route response shapes/status codes unchanged.

### Phase 3: Shared validation + error typing

1. Move date and numeric validation into `lib/validators.js`.
2. Replace ad-hoc returns with typed domain errors.
3. Add route-level error mapping helper.

### Phase 4: Test hardening

1. Keep existing API integration suite as safety net.
2. Add service-focused tests for:
   - reassignment count integrity,
   - capacity enforcement,
   - rollback on conflict,
   - weight/date validation.

## Acceptance Criteria for This Refactor

- No route file contains SQL.
- Domain rules appear in services only.
- Multi-entity mutations are transactional.
- Existing API contract remains backward compatible.
- Existing tests pass; new service tests cover critical invariants.

## Risks and Mitigations

- **Risk:** behavior drift during extraction.
  - **Mitigation:** migrate endpoint-by-endpoint with tests green after each step.
- **Risk:** over-engineering for a small app.
  - **Mitigation:** keep module count minimal and strictly feature-driven.
- **Risk:** inconsistent error responses during transition.
  - **Mitigation:** centralize error-to-HTTP mapping before broad migration.

## Why This Is the Highest-Value Architectural Change

FarmTracker’s biggest long-term risk is data integrity regressions in animal/paddock workflows. This proposal directly addresses that by isolating domain logic, making transactions explicit, and reducing the chance of duplicated or missing rules when features evolve.
