# BoxStudio V0.36 — Hosted Backend / Auth / Immutable Revision / Audit

## Status

V0.36 moves production approval authority out of browser-local state and establishes a real server boundary.

### Completed

- Node HTTP API under `/api/v1`
- No default credentials; standalone startup requires `BOXSTUDIO_USERS_JSON`
- Password verification with scrypt credentials
- Bearer sessions with server-side role lookup
- Server-authoritative roles: `viewer`, `operator`, `approver`, `admin`
- Client cannot elevate permissions by changing `productionRole` or sending a role field
- Immutable ArtworkRevision content snapshot
- SHA-256 canonical snapshot hash
- Parent revision linkage
- Optimistic concurrency using `If-Match` / expected revision
- Draft → Submitted → Approved / Rejected workflow
- Separation of duties: revision author / submitter cannot approve the same revision
- Rejection reason required
- Production gate requires an approved immutable revision
- Append-only audit events
- Audit `prevHash → hash` chain using SHA-256
- Audit-chain tamper verification
- Browser Hosted Workflow workspace
- Current browser project → hosted immutable revision sync
- Operator submit workflow
- Approver approve / reject workflow
- Hosted project/revision list and audit display
- Stale unauthenticated-refresh protection in browser session state
- Real Node HTTP integration tests
- Real Headless Chrome operator → approver workflow test

## Authority model

The browser may use roles to decide which buttons to show, but that is UX only. Authorization is performed again on the server from the authenticated session's server-side user record.

A request such as:

```text
POST /api/v1/projects/{id}/revisions/{revision}/approve
Authorization: Bearer <operator-token>
```

is rejected even if the client locally changes its role to `admin` or sends a role field.

## Immutable revision model

Revision content and workflow metadata are deliberately separated.

```text
ArtworkRevision
  projectId
  revision
  parentRevision
  createdAt
  createdBy
  snapshotHash   SHA-256
  snapshot       immutable content

Workflow
  status         draft | submitted | approved | rejected
  submittedBy
  approvedBy
  rejectedBy
  reason
```

Approval changes Workflow metadata only. It does not rewrite the immutable content snapshot or content hash.

## Audit model

Each audit event contains:

```text
seq
id
at
actorId
action
resource
resourceId
projectId
revision
reason
metadata
prevHash
hash
```

`hash` is SHA-256 over the canonical event payload. A changed historical event breaks verification of the chain.

## Concurrency

Creating a new hosted revision requires the expected current revision.

```http
POST /api/v1/projects/demo/revisions
If-Match: 4
```

If the server is already at revision 5, the write fails with HTTP 409 rather than silently overwriting newer work.

## Browser workflow

V0.36 adds a `Hosted` entry in the BoxStudio top bar.

The browser workflow is now test-covered as:

1. Operator signs in.
2. Operator syncs the current BoxStudio project.
3. Server creates immutable revision r1.
4. Operator submits r1.
5. Operator signs out.
6. Approver signs in.
7. Approver sees the submitted revision.
8. Approver approves r1.
9. `revision.approved` appears in the hosted audit history.

## Important production boundaries not claimed complete

V0.36 establishes the hosted service contract, but the following are deliberately not marked complete:

- Durable multi-instance database persistence
- Database migrations / backups / point-in-time restore
- Redis or shared session storage
- Distributed locking across service instances
- Login rate limiting / account lockout / MFA
- SSO / SCIM
- TLS termination / WAF / production ingress
- Key rotation / secrets manager integration
- Object-storage persistence for production PDFs and bundles
- Append-only database/WORM audit retention
- External identity provider
- Email/Slack/Teams workflow notifications
- Template Publish Pipeline
- External Proof Link

These require deployment infrastructure or dedicated production adapters and must not be inferred from the in-memory CI service.

## Next recommended scope

V0.37 should make the V0.36 authority durable:

- PostgreSQL-compatible persistence schema
- migrations
- persistent sessions or external IdP
- immutable revision rows + snapshot/blob references
- append-only audit table with hash-chain validation
- idempotency keys
- server-side Production Bundle archive
- hosted deployment smoke test
