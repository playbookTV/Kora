# Supabase Database Setup - Missing RPC Function

## Issue
```
Could not find the function public.get_transaction_stats(p_end_date, p_start_date, p_user_id)
```

## Solution

The `get_transaction_stats` RPC function needs to be created in your Supabase database.

### Quick Fix (Copy & Paste)

1. **Go to Supabase Dashboard**
   - Open your project at https://supabase.com/dashboard
   - Navigate to **SQL Editor** in the left sidebar

2. **Run the Migration**
   - Click **New Query**
   - Copy the entire contents of `migrations/create_transaction_stats_function.sql`
   - Paste into the SQL editor
   - Click **Run** (or press `Ctrl+Enter`)

3. **Verify Success**
   You should see: `Success. No rows returned`

### What This Function Does

The function aggregates transaction statistics efficiently on the database side:

```sql
-- Example usage
SELECT get_transaction_stats(
    'user-uuid-here'::UUID,
    NOW() - INTERVAL '30 days',  -- start date
    NOW()                          -- end date
);
```

**Returns:**
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

### Why It's Needed

**Performance Benefits:**
- ✅ Database-side aggregation (much faster)
- ✅ Reduces network traffic
- ✅ Scales with large datasets
- ✅ Single query vs multiple round trips

**Fallback Mechanism:**
- The backend **will still work** without this function
- It falls back to manual calculation in Node.js
- But it's **slower** and uses more resources

### After Applying

1. **Restart your backend** (if running locally)
2. **Test the stats endpoint**: `GET /transactions/stats`
3. **Check logs** - you should no longer see the RPC error

### Troubleshooting

**Error: "permission denied for function get_transaction_stats"**
- The migration includes `GRANT EXECUTE` - make sure it ran completely

**Error: "function already exists"**
- The function is already created, you're good to go!

**Still getting errors?**
- Check the Supabase logs in the dashboard
- Verify your user has the `authenticated` role
- Make sure RLS policies allow access to the `transactions` table

---

## Alternative: Manual SQL Execution

If you prefer to run SQL manually:

```sql
-- Copy this entire block and run it in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_transaction_stats(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_spent NUMERIC;
    v_transaction_count INTEGER;
    v_daily_average NUMERIC;
    v_spent_today NUMERIC;
    v_top_categories JSON;
    v_result JSON;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_spent
    FROM transactions
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date;

    SELECT COUNT(*)
    INTO v_transaction_count
    FROM transactions
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date;

    v_daily_average := v_total_spent / 30.0;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_spent_today
    FROM transactions
    WHERE user_id = p_user_id
      AND DATE(date) = CURRENT_DATE;

    SELECT COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'name', category,
                'total', total,
                'avgMonthly', total
            )
            ORDER BY total DESC
        ) FILTER (WHERE rn <= 5),
        '[]'::JSON
    )
    INTO v_top_categories
    FROM (
        SELECT 
            category,
            SUM(amount) as total,
            ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC) as rn
        FROM transactions
        WHERE user_id = p_user_id
          AND date >= p_start_date
          AND date <= p_end_date
        GROUP BY category
    ) ranked_categories;

    v_result := JSON_BUILD_OBJECT(
        'total_spent', v_total_spent,
        'daily_average', v_daily_average,
        'transaction_count', v_transaction_count,
        'spent_today', v_spent_today,
        'top_categories', v_top_categories
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_transaction_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
```

---

**Status**: Migration file created and ready to apply! 🚀
