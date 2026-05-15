# FarmTracker Code Audit

## What I found

There are several correctness issues in core flows.

Most important bugs are in animal and paddock state management:

- **Pagination is incorrect** in `GET /api/animals`: `page` is used directly as SQL `OFFSET` instead of `page * limit`, so pages overlap and users can miss or repeat records.
- **Paddock counts can drift from reality**: when updating an animal's `paddock_id`, the new paddock is incremented but the old paddock is not decremented. Over time `animal_count` becomes unreliable.
- **Paddock assignment validation is weak**: animal create/update does not verify that target paddocks exist or have available capacity, so records can be assigned to invalid/full paddocks and counts become inconsistent.
- **Status code/contract inconsistency**: `POST /api/animals` returns `200` instead of `201`, which is inconsistent with other create endpoints and expected REST semantics.
- **Count update is not atomic with animal creation**: paddock count is incremented before animal insert; if insert fails (for example, duplicate `tag_number`), `animal_count` can be wrong.

There are also design concerns:

- Route handlers mix HTTP concerns, validation, and SQL in one place, making behavior harder to reason about and test in isolation.
- List endpoint does N+1 queries for latest health event, acceptable at this scale but not ideal.
- Error handling is minimal on the frontend (failed fetches throw but are not surfaced to users with friendly UI feedback).
- Test coverage is narrow for high-risk behavior (especially reassignment/count integrity edge cases), which increases regression risk.

## What I would fix first (and why)

1. **Paddock count integrity + assignment validation**: this protects data correctness, which is the highest-risk issue because incorrect counts can drive bad operational decisions.
2. **Pagination bug**: directly impacts everyday usability and trust in list views.
3. **API contract/status consistency** (`201` on create and clear validation responses): low effort, high clarity for clients and tests.

## What I would leave for later

- Refactoring to service/repository layers to separate routing from data access.
- Query optimization for latest health event retrieval.
- Broader frontend UX improvements (inline error states, loading skeletons, accessibility pass).

=> Higher priority belongs to fixing data integrity and correctness issues that can lead to bad decisions or user frustration.