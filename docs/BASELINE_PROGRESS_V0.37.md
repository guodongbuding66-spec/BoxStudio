# BoxStudio V0.37 — Durable PostgreSQL Persistence

## Goal
Move the V0.36 server-authoritative workflow from process memory to a durable PostgreSQL transaction boundary without changing the `/api/v1` browser contract.

## Implemented scope

- PostgreSQL schema migration with checksum tracking.
- Durable hosted users and hashed bearer sessions.
- Durable projects, immutable ArtworkRevision snapshots and mutable workflow records.
- Database-level UPDATE/DELETE rejection triggers for `artwork_revisions` and `production_archives`.
- Transactional optimistic concurrency using `SELECT ... FOR UPDATE` on the project authority row.
- Append-only SHA-256 audit chain serialized with a PostgreSQL advisory transaction lock.
- `Idempotency-Key` support for create project, create revision, submit, approve, reject and archive mutations.
- Request-hash conflict detection when the same idempotency key is reused with a different payload.
- Production Archive records containing the approved immutable snapshot, approval manifest, manifest hash and archive hash.
- Persistent sessions and project/revision recovery across HTTP service restarts.
- PostgreSQL integration CI using a real PostgreSQL 16 service.

## V0.37 acceptance gates

1. Migration applies once and a second run validates the stored checksum without reapplying.
2. A login session remains valid after the HTTP service is restarted against the same database.
3. A project and all immutable revisions remain available after service restart.
4. Replaying the same mutation with the same `Idempotency-Key` returns the original response and creates no duplicate revision/audit/archive.
5. Reusing an idempotency key with different request content fails with `IDEMPOTENCY_CONFLICT`.
6. Two concurrent writes using the same expected revision result in exactly one successful new revision.
7. Direct SQL UPDATE/DELETE against immutable revision/archive tables is rejected by PostgreSQL.
8. Production archive creation is allowed only for an approved revision and retains the exact approved snapshot hash.
9. Audit hash-chain verification remains valid after durable writes.
10. V0.36 hosted regression and the full V0.10–V0.36 product regression remain green.

## Explicit boundary

V0.37 provides durable single-database transactional persistence. It does not yet claim:

- automated backup/PITR orchestration,
- cross-region database replication,
- external object-storage archive blobs,
- WORM retention policies outside PostgreSQL,
- SSO/SCIM/MFA,
- WAF/TLS/ingress operations,
- database connection proxying or autoscaling policy.

Those are deployment/enterprise hardening layers and must not replace the core BoxStudio packaging-design roadmap.
