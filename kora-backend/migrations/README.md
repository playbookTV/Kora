# Database Migrations

This directory contains SQL migration files for the Kora backend database (Supabase/PostgreSQL).

## Migrations

### `create_transaction_stats_function.sql`

**Purpose**: Creates the `get_transaction_stats` RPC function for efficient transaction statistics aggregation.

**What it does**:
- Calculates total spent in a date range
- Counts transactions
- Calculates daily average spending
- Gets today's spending
- Returns top 5 spending categories

**Why it's needed**:
- Performance: Database-side aggregation is much faster than fetching all transactions and calculating in Node.js
- Reduces network traffic
- Scales better with large transaction datasets

**How to apply**:

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `create_transaction_stats_function.sql`
5. Click **Run** or press `Ctrl+Enter`

#### Option 2: Supabase CLI
```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push --file migrations/create_transaction_stats_function.sql
```

#### Option 3: psql (Direct Database Connection)
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f migrations/create_transaction_stats_function.sql
```

**Verification**:

After applying the migration, verify it works:

```sql
-- Test the function
SELECT get_transaction_stats(
    'YOUR_USER_ID'::UUID,
    NOW() - INTERVAL '30 days',
    NOW()
);
```

You should get a JSON response like:
```json
{
  "total_spent": 15000,
  "daily_average": 500,
  "transaction_count": 45,
  "spent_today": 250,
  "top_categories": [
    {"name": "Food", "total": 5000, "avgMonthly": 5000},
    {"name": "Transport", "total": 3000, "avgMonthly": 3000}
  ]
}
```

**Rollback** (if needed):

To remove the function:
```sql
DROP FUNCTION IF EXISTS public.get_transaction_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
```

---

## Notes

- The backend has a **fallback mechanism** - if the RPC function doesn't exist, it will calculate stats manually
- However, the RPC function is **much more efficient** for production use
- The function uses `SECURITY DEFINER` to run with the permissions of the function owner
- Only `authenticated` users can execute this function (via RLS policies)
