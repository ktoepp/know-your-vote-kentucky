CREATE OR REPLACE FUNCTION ky_increment_counter(counter_key TEXT, bucket_key TEXT)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO ky_sync_state (key, payload, updated_at)
  VALUES (counter_key, jsonb_build_object(bucket_key, 1), NOW())
  ON CONFLICT (key) DO UPDATE
    SET payload = jsonb_set(
      ky_sync_state.payload,
      ARRAY[bucket_key],
      to_jsonb(COALESCE((ky_sync_state.payload->>bucket_key)::int, 0) + 1)
    ),
    updated_at = NOW();
END;
$$;
