-- Create RPC function for efficient transaction statistics
CREATE OR REPLACE FUNCTION get_transaction_stats(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  v_total_spent DECIMAL(12,2);
  v_transaction_count INTEGER;
  v_daily_average DECIMAL(12,2);
  v_spent_today DECIMAL(12,2);
  v_top_categories JSON;
BEGIN
  -- Calculate Total Spent & Count
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO 
    v_total_spent,
    v_transaction_count
  FROM transactions
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calculate Daily Average (over 30 days roughly, or exact diff)
  -- For now, simple division by 30 like the TS code did
  v_daily_average := v_total_spent / 30;

  -- Calculate Spent Today
  SELECT COALESCE(SUM(amount), 0)
  INTO v_spent_today
  FROM transactions
  WHERE user_id = p_user_id
    AND date >= CURRENT_DATE::TIMESTAMPTZ
    AND date < (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;

  -- Calculate Top Categories
  WITH CategoryStats AS (
    SELECT 
      category as name, 
      SUM(amount) as total
    FROM transactions
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
    GROUP BY category
    ORDER BY total DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'name', name,
      'total', total,
      'avgMonthly', total -- Approximating avgMonthly as just total for this view
    )
  )
  INTO v_top_categories
  FROM CategoryStats;

  RETURN json_build_object(
    'total_spent', v_total_spent,
    'transaction_count', v_transaction_count,
    'daily_average', v_daily_average,
    'spent_today', v_spent_today,
    'top_categories', COALESCE(v_top_categories, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
