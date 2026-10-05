import { readFile } from 'node:fs/promises';
import { createPasswordCredentialV36, sha256TextV36, V36_ROLE_POLICIES } from './domainV36.mjs';

export const V37_MIGRATION_VERSION='001_v37';
const MIGRATION_LOCK=37003701;

export async function createPostgresPoolV37({connectionString=process.env.BOXSTUDIO_DATABASE_URL,max=10,ssl=false}={}){
  if(!connectionString)throw new Error('BOXSTUDIO_DATABASE_URL is required for V0.37 durable storage.');
  const {Pool}=await import('pg');
  return new Pool({connectionString,max,ssl:ssl?{rejectUnauthorized:false}:false});
}

export async function applyMigrationsV37(pool){
  if(!pool?.connect)throw new Error('V0.37 migration requires a PostgreSQL pool.');
  const sql=await readFile(new URL('./migrations/001_v37.sql',import.meta.url),'utf8');
  const checksum=sha256TextV36(sql),client=await pool.connect();
  try{
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query('SELECT pg_advisory_lock($1)',[MIGRATION_LOCK]);
    const existing=await client.query('SELECT version,checksum,applied_at FROM schema_migrations WHERE version=$1',[V37_MIGRATION_VERSION]);
    if(existing.rows[0]){
      if(existing.rows[0].checksum!==checksum)throw new Error(`Migration checksum mismatch for ${V37_MIGRATION_VERSION}.`);
      return{version:V37_MIGRATION_VERSION,checksum,applied:false,appliedAt:existing.rows[0].applied_at};
    }
    await client.query(sql);
    const inserted=await client.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2) RETURNING applied_at',[V37_MIGRATION_VERSION,checksum]);
    return{version:V37_MIGRATION_VERSION,checksum,applied:true,appliedAt:inserted.rows[0].applied_at};
  }finally{
    try{await client.query('SELECT pg_advisory_unlock($1)',[MIGRATION_LOCK]);}catch{}
    client.release();
  }
}

export async function seedUsersV37(pool,users=[]){
  if(!Array.isArray(users)||!users.length)throw new Error('V0.37 requires at least one hosted user seed.');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    for(const raw of users){
      const email=String(raw.email||'').trim().toLowerCase(),id=String(raw.id||email),name=String(raw.name||email),role=String(raw.role||'viewer').toLowerCase();
      if(!email)throw new Error('Hosted user requires email.');
      if(!V36_ROLE_POLICIES[role])throw new Error(`Unsupported hosted role: ${role}.`);
      const credential=raw.credential||createPasswordCredentialV36(raw.password||'');
      await client.query(`INSERT INTO hosted_users(id,email,name,role,active,credential,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,now(),now())
        ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role=EXCLUDED.role,active=EXCLUDED.active,credential=EXCLUDED.credential,updated_at=now()`,
        [id,email,name,role,raw.active!==false,JSON.stringify(credential)]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  return{count:users.length};
}

export async function cleanupExpiredSessionsV37(pool){
  const result=await pool.query('DELETE FROM hosted_sessions WHERE expires_at<=now()');
  return{deleted:result.rowCount||0};
}
