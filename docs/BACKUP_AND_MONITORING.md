# Backup & Monitoring Strategy

## Backups
- **Database**: Supabase automated daily backups (Pro plan). Enable **Point-in-Time Recovery (PITR)**
  for clinical/financial data — RPO target ≤ 5 min.
- **Pre-migration**: take a manual backup / branch before applying a migration to production.
- **Storage**: enable bucket versioning; periodically sync critical buckets to cold storage.
- **Restore drills**: test a full restore into a staging project quarterly. An untested backup is not a backup.

## Monitoring
- **App / deploys**: Vercel Analytics + deployment logs.
- **Database**: Supabase dashboard (slow queries, connection pool, disk). Alert at 80% disk/connections.
- **Errors**: add Sentry (Next.js) — capture Server Action + Route Handler exceptions.
- **Audit trail**: `audit_logs` records every write on guarded tables; surface a per-clinic view in
  the Super Admin portal (Module 13).
- **Uptime**: external health check (e.g. BetterStack) on `/` and a `/api/health` endpoint.

## Security/compliance notes
- PHI lives in this database. For HIPAA, run on a Supabase plan that supports a signed **BAA** and
  keep PITR + audit logging on. Restrict the service-role key to server environments only.
