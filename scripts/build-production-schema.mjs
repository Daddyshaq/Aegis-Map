#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const migrationsDir = resolve(repoRoot, 'supabase', 'migrations');
const outputFile = resolve(repoRoot, 'supabase', 'production-schema.sql');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files in order:`, files);

const header = `-- =============================================================================
-- Aegis Map — Complete Consolidated Production Schema
-- Generated automatically from supabase/migrations/
-- 
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Open the SQL Editor and click "New query"
-- 3. Paste this entire file and click "Run" (or execute via psql / supabase CLI)
-- =============================================================================\n\n`;

const parts = [header];

for (const file of files) {
  const filePath = resolve(migrationsDir, file);
  const content = readFileSync(filePath, 'utf8');
  parts.push(`-- -----------------------------------------------------------------------------\n-- START FILE: ${file}\n-- -----------------------------------------------------------------------------\n`);
  parts.push(content);
  parts.push('\n\n');
}

writeFileSync(outputFile, parts.join('\n'), 'utf8');
console.log(`Successfully generated production schema at: ${outputFile}`);
