-- Least-privilege PostgreSQL role for the application's runtime Prisma
-- connection. Migrations (DDL, table ownership) continue to run as the
-- `nursery` bootstrap role; this role deliberately gets no DDL privileges,
-- no BYPASSRLS, and cannot create databases or other roles, so it is
-- actually subject to the RLS policies defined on tenant-owned tables.
--
-- Environment-specific infrastructure, not application schema - run by hand
-- (or by deploy tooling) against each environment's database, not through
-- Prisma migrate.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nursery_app') THEN
    CREATE ROLE nursery_app LOGIN PASSWORD 'nursery_app';
  END IF;
END
$$;

ALTER ROLE nursery_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT CONNECT ON DATABASE nursery_os TO nursery_app;
GRANT USAGE ON SCHEMA public TO nursery_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nursery_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nursery_app;

-- Tables/sequences created by future migrations (run as `nursery`)
-- automatically grant the same rights to nursery_app, without re-running
-- this script. No sequences exist yet (ids are gen_random_uuid()), but this
-- covers any autoincrement column added later.
ALTER DEFAULT PRIVILEGES FOR ROLE nursery IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nursery_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nursery IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nursery_app;
