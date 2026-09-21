#!/usr/bin/env node
/**
 * Seed the database with development data.
 *
 * Applies `supabase/seed/seed.sql` to the target Postgres database using the
 * `psql` client. This is the same SQL that `supabase db reset` runs
 * automatically (see `[db.seed]` in `supabase/config.toml`); this script exists
 * so you can (re)apply seed data WITHOUT dropping the whole database.
 *
 * Order of operations for a fresh local stack:
 *   1. `supabase start`         — boot local Postgres/Auth/Storage
 *   2. `pnpm db:reset`          — apply migrations (and auto-seed), OR
 *      `pnpm db:migrate`        — apply migrations only, then
 *      `pnpm db:seed`           — (this script) apply seed data
 *
 * The database URL is resolved from, in order:
 *   1. $DATABASE_URL
 *   2. DATABASE_URL in the repo-root `.env`
 *   3. the local Supabase default (postgresql://postgres:postgres@127.0.0.1:54322/postgres)
 *
 * Requires the `psql` client on PATH. `psql` ships with the Supabase CLI's
 * bundled Postgres and with any standard Postgres install. If it is missing,
 * this script explains the alternatives rather than failing cryptically.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const seedFile = resolve(repoRoot, 'supabase', 'seed', 'seed.sql');

const LOCAL_DEFAULT_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** Minimal KEY=VALUE parser for a single variable in a dotenv file. */
function readEnvVar(file, key) {
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  if (!line) return undefined;
  let value = line.slice(line.indexOf('=') + 1).trim();
  // Strip a single layer of surrounding quotes, if present.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value || undefined;
}

/** Never print credentials: redact the password component of a Postgres URL. */
function redact(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.replace(/:\/\/([^:@/]+):[^@]*@/, '://$1:***@');
  }
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function main() {
  if (!existsSync(seedFile)) {
    fail(`Seed file not found at ${seedFile}`);
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    readEnvVar(resolve(repoRoot, '.env'), 'DATABASE_URL') ||
    LOCAL_DEFAULT_URL;

  // Verify psql is available before attempting to run it.
  const probe = spawnSync('psql', ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    fail(
      [
        '`psql` was not found on your PATH, so the seed cannot be applied directly.',
        '',
        'Options:',
        '  • Easiest: `pnpm db:reset` — applies migrations AND auto-seeds via the',
        '    Supabase CLI (uses [db.seed] in supabase/config.toml). No psql needed.',
        '  • Or install a Postgres client so `psql` is available, then re-run',
        '    `pnpm db:seed`.',
        '',
        'The Supabase CLI bundles psql; ensure its bin directory is on your PATH.',
      ].join('\n'),
    );
  }

  console.log(`→ Seeding database: ${redact(databaseUrl)}`);
  console.log(`→ Applying ${seedFile}`);

  // ON_ERROR_STOP makes psql exit non-zero on the first SQL error instead of
  // plowing ahead and leaving the database half-seeded.
  const result = spawnSync(
    'psql',
    [databaseUrl, '--set', 'ON_ERROR_STOP=1', '--file', seedFile],
    { stdio: 'inherit' },
  );

  if (result.error) {
    fail(`Failed to launch psql: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`Seeding failed (psql exit code ${result.status ?? 'unknown'}).`);
  }

  console.log('\n✓ Seed complete.\n');
}

main();
