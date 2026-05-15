# Retrospective

I prioritized correctness and maintainability over speed of feature expansion. 
The main trade-off was investing in incremental architectural refactoring (routes -> services -> repositories) while still delivering bug fixes and the weight feature. This added implementation overhead, but reduced regression risk for high-impact workflows like paddock reassignment and animal creation. I also chose to preserve existing API response shapes and status semantics wherever possible, even when cleaner redesigns were tempting, to avoid breaking frontend behavior and keep the assessment deliverables focused.

With more time, I would add stronger guardrails around data quality and observability: stricter validation for all date fields and numeric ranges, centralized Express error middleware, and request logging for easier debugging. 
I would also add more service-level tests around edge cases (concurrent writes, transaction failure simulation, and unique-constraint conflicts beyond `tag_number`) plus basic frontend error UX so failed requests are visible to users instead of surfacing as uncaught exceptions.

I deliberately left some areas unchanged. 
I did not migrate the stack, add ORM tooling, or introduce lint/format tooling because those changes would increase scope and noise relative to the assessment goals. I also kept the current frontend style/system mostly intact, only extending the animal detail page for weight history, to preserve consistency with the existing app and avoid unnecessary UI churn.
