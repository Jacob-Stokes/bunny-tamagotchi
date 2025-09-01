-- Function to increment daily outfit generation usage
CREATE OR REPLACE FUNCTION increment_daily_usage(user_id UUID, target_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO outfit_generation_limits (user_id, date, generations_used, daily_limit)
  VALUES (user_id, target_date, 1, 10)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    generations_used = outfit_generation_limits.generations_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;