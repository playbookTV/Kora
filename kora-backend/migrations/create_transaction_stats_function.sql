-- Migration: Create get_transaction_stats RPC function
-- This function aggregates transaction statistics for a user within a date range
-- Used by TransactionService.getStats() for performance optimization

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
    -- Calculate total spent in the period
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_spent
    FROM transactions
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date;

    -- Count transactions
    SELECT COUNT(*)
    INTO v_transaction_count
    FROM transactions
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date;

    -- Calculate daily average (over 30 days)
    v_daily_average := v_total_spent / 30.0;

    -- Calculate spent today
    SELECT COALESCE(SUM(amount), 0)
    INTO v_spent_today
    FROM transactions
    WHERE user_id = p_user_id
      AND DATE(date) = CURRENT_DATE;

    -- Get top 5 categories by total spend
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

    -- Build result JSON
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_transaction_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_transaction_stats IS 'Aggregates transaction statistics for a user within a date range. Returns total spent, daily average, transaction count, today''s spending, and top 5 categories.';
