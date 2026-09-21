#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Aegis Map — Supabase Production Setup Script (Bash)
# =============================================================================

echo "=========================================================="
echo " Aegis Map — Supabase Production Setup"
echo "=========================================================="

# Check if DATABASE_URL or .env.production is provided
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f ".env.production" ]; then
    echo "Reading DATABASE_URL from .env.production..."
    DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.production | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  elif [ -f ".env" ]; then
    echo "Reading DATABASE_URL from .env..."
    DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  fi
fi

SCHEMA_FILE="supabase/production-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Generating consolidated schema..."
  node scripts/build-production-schema.mjs
fi

# Option 1: Direct Postgres Connection via psql
if [ -n "${DATABASE_URL:-}" ] && command -v psql &> /dev/null; then
  echo "Found psql and DATABASE_URL. Applying production migrations directly..."
  psql "$DATABASE_URL" -f "$SCHEMA_FILE"
  echo "✅ Migrations applied successfully to production Supabase database!"
  exit 0
fi

# Option 2: Supabase CLI
if command -v supabase &> /dev/null; then
  echo "Supabase CLI detected."
  echo "To link your project and push migrations:"
  echo "  1. supabase login"
  echo "  2. supabase link --project-ref <YOUR_PROJECT_REF>"
  echo "  3. supabase db push"
  exit 0
fi

# Option 3: Manual SQL instructions
echo ""
echo "Notice: Neither 'psql' nor 'DATABASE_URL' was configured locally."
echo "No problem! You can apply the schema directly through your web browser:"
echo ""
echo "  1. Open your Supabase Dashboard: https://supabase.com/dashboard"
echo "  2. Select your project and navigate to the 'SQL Editor'"
echo "  3. Click 'New Query'"
echo "  4. Copy and paste the contents of: supabase/production-schema.sql"
echo "  5. Click 'Run'"
echo ""
echo "Done! Your production database will be fully configured."
