-- Create conversation_history table (optional, for pattern analysis)
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  intent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_id ON conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own conversation history
CREATE POLICY "Users can view own history" ON conversation_history
  FOR SELECT USING (auth.uid() = user_id);

-- Only the system (service role) can insert conversation history
CREATE POLICY "Service can insert history" ON conversation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
