CREATE TABLE IF NOT EXISTS ky_rate_limit_buckets (
  key TEXT PRIMARY KEY,
  tokens FLOAT NOT NULL,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION ky_rate_limit_consume(
  p_key TEXT,
  p_capacity FLOAT,
  p_refill_per_sec FLOAT
) RETURNS TABLE(allowed BOOLEAN, remaining INT, retry_after_sec INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_elapsed FLOAT;
  v_new_tokens FLOAT;
  v_bucket_tokens FLOAT;
  v_bucket_refill_at TIMESTAMPTZ;
BEGIN
  INSERT INTO ky_rate_limit_buckets (key, tokens, last_refill_at)
  VALUES (p_key, p_capacity, NOW())
  ON CONFLICT (key) DO NOTHING;

  SELECT tokens, last_refill_at INTO v_bucket_tokens, v_bucket_refill_at
  FROM ky_rate_limit_buckets WHERE key = p_key FOR UPDATE;

  v_elapsed := EXTRACT(EPOCH FROM (NOW() - v_bucket_refill_at));
  v_new_tokens := LEAST(p_capacity, v_bucket_tokens + v_elapsed * p_refill_per_sec);

  IF v_new_tokens >= 1 THEN
    UPDATE ky_rate_limit_buckets SET
      tokens = v_new_tokens - 1,
      last_refill_at = NOW(),
      updated_at = NOW()
    WHERE key = p_key;
    RETURN QUERY SELECT TRUE::BOOLEAN, GREATEST(0, FLOOR(v_new_tokens - 1))::INT, 0::INT;
  ELSE
    UPDATE ky_rate_limit_buckets SET
      tokens = v_new_tokens,
      last_refill_at = NOW(),
      updated_at = NOW()
    WHERE key = p_key;
    RETURN QUERY SELECT FALSE::BOOLEAN, 0::INT,
      GREATEST(1, CEIL((1 - v_new_tokens) / p_refill_per_sec))::INT;
  END IF;
END;
$$;
