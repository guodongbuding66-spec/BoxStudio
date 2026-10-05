BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosted_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer','operator','approver','admin')),
  active boolean NOT NULL DEFAULT true,
  credential jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosted_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id text NOT NULL REFERENCES hosted_users(id),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS hosted_sessions_user_idx ON hosted_sessions(user_id);
CREATE INDEX IF NOT EXISTS hosted_sessions_expiry_idx ON hosted_sessions(expires_at);

CREATE TABLE IF NOT EXISTS hosted_projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text NOT NULL REFERENCES hosted_users(id),
  updated_at timestamptz NOT NULL,
  updated_by text NOT NULL REFERENCES hosted_users(id),
  current_revision integer NOT NULL CHECK (current_revision >= 1)
);

CREATE TABLE IF NOT EXISTS artwork_revisions (
  project_id text NOT NULL REFERENCES hosted_projects(id),
  revision integer NOT NULL CHECK (revision >= 1),
  parent_revision integer,
  created_at timestamptz NOT NULL,
  created_by text NOT NULL REFERENCES hosted_users(id),
  reason text NOT NULL DEFAULT '',
  snapshot_hash char(64) NOT NULL,
  snapshot jsonb NOT NULL,
  PRIMARY KEY(project_id, revision),
  CONSTRAINT artwork_revision_parent_fk FOREIGN KEY(project_id, parent_revision)
    REFERENCES artwork_revisions(project_id, revision) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS revision_workflows (
  project_id text NOT NULL,
  revision integer NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_at timestamptz,
  submitted_by text REFERENCES hosted_users(id),
  approved_at timestamptz,
  approved_by text REFERENCES hosted_users(id),
  rejected_at timestamptz,
  rejected_by text REFERENCES hosted_users(id),
  reason text NOT NULL DEFAULT '',
  PRIMARY KEY(project_id, revision),
  FOREIGN KEY(project_id, revision) REFERENCES artwork_revisions(project_id, revision)
);

CREATE TABLE IF NOT EXISTS audit_events (
  seq bigint PRIMARY KEY CHECK (seq >= 1),
  id text NOT NULL UNIQUE,
  at timestamptz NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text NOT NULL DEFAULT '',
  project_id text NOT NULL DEFAULT '',
  revision integer,
  reason text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash text NOT NULL,
  hash char(64) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS audit_events_project_idx ON audit_events(project_id, seq);

CREATE TABLE IF NOT EXISTS idempotency_records (
  actor_id text NOT NULL,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id, operation, idempotency_key)
);

CREATE TABLE IF NOT EXISTS production_archives (
  archive_id text PRIMARY KEY,
  project_id text NOT NULL,
  revision integer NOT NULL,
  snapshot_hash char(64) NOT NULL,
  manifest_hash char(64) NOT NULL,
  archive_hash char(64) NOT NULL UNIQUE,
  archive_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text NOT NULL REFERENCES hosted_users(id),
  UNIQUE(project_id, revision),
  FOREIGN KEY(project_id, revision) REFERENCES artwork_revisions(project_id, revision)
);

CREATE OR REPLACE FUNCTION boxstudio_reject_immutable_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'BoxStudio immutable row cannot be updated or deleted: %', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS artwork_revisions_immutable ON artwork_revisions;
CREATE TRIGGER artwork_revisions_immutable
BEFORE UPDATE OR DELETE ON artwork_revisions
FOR EACH ROW EXECUTE FUNCTION boxstudio_reject_immutable_change();

DROP TRIGGER IF EXISTS production_archives_immutable ON production_archives;
CREATE TRIGGER production_archives_immutable
BEFORE UPDATE OR DELETE ON production_archives
FOR EACH ROW EXECUTE FUNCTION boxstudio_reject_immutable_change();

COMMIT;
