---
name: db-reset
description: Reset the local Postgres database to a clean, seeded state by dropping/recreating the public schema and reloading database/schema.sql and seed.sql. Use when the user asks to reset, restore, or reseed their local dev database.
disable-model-invocation: true
---

Run, in order, from the repo root:

```
make db-restore
make db-seed
```

`make db-restore` drops and recreates the `public` schema, then applies `database/schema.sql` and `database/seed.sql`. `make db-seed` truncates `alembic_version, spreads, users` and reloads `database/seed.sql` on top of an already-migrated schema.

This is destructive to local data — only run it when the user explicitly asks to reset/restore/reseed the database, and confirm first if there's any ambiguity about which one they want (full restore vs. just reseeding rows).

Note: `database/schema.sql`/`seed.sql` are being phased out in favor of Alembic-driven seeding (see CLAUDE.md) — this skill reflects the current mechanism, not necessarily the long-term one.
