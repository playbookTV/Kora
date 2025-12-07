-- Create fixed_expenses table
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_day INTEGER CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON fixed_expenses(user_id);

-- Enable RLS
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- Users can manage their own expenses
CREATE POLICY "Users can view own expenses" ON fixed_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON fixed_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON fixed_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON fixed_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_fixed_expenses_updated_at ON fixed_expenses;
CREATE TRIGGER update_fixed_expenses_updated_at
  BEFORE UPDATE ON fixed_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
