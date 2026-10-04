-- Public online booking (/book) — atomic "check and book" function.
-- Hand-written custom SQL migration (generated via `drizzle-kit generate
-- --custom`), for the same reason as 0060_miadiamante_rate_limit_check_fn:
-- this project's neon-http driver has no transaction support, and a
-- single compound SQL statement keeps ONE snapshot even after blocking on
-- an advisory lock, so it can't see bookings committed while it waited.
-- Inside a PL/pgSQL function each command takes a fresh READ COMMITTED
-- snapshot, so every check below runs AFTER the lock is held and sees
-- every booking any concurrent caller already committed.
--
-- One global lock key for all online bookings: volume is a handful per
-- day, and a single key is what guarantees two people can never book
-- the same (or an overlapping) slot at the same moment.
--
-- Steps, all inside the one implicit transaction of the calling
-- statement (so it's all-or-nothing):
--   1. per-key rate limit (keys are HMACs of IP / phone — never raw)
--   2. overlap check against every non-cancelled appointment, with the
--      configured buffer on both sides (staff-created ones included)
--   3. find the existing client by phone (last 10 digits) or email, or
--      create a new Lead — never modifies an existing client's data
--   4. insert the appointment (status 'requested', source
--      'online_booking'), its confirmation task, and the rate events
CREATE OR REPLACE FUNCTION book_online_appointment(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_buffer_minutes integer,
  p_service_type service_type,
  p_title text,
  p_notes text,
  p_full_name text,
  p_phone text,
  p_phone_last10 text,
  p_email text,
  p_preferred_language text,
  p_consent_at timestamptz,
  p_rate_keys text[],
  p_rate_limits integer[],
  p_rate_window_minutes integer
) RETURNS TABLE (status text, appointment_id uuid, client_id uuid)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_count integer;
  v_client_id uuid;
  v_appointment_id uuid;
  i integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('online_booking'));

  FOR i IN 1 .. coalesce(array_length(p_rate_keys, 1), 0) LOOP
    SELECT count(*) INTO v_count
    FROM online_booking_rate_limit_events e
    WHERE e.key_hash = p_rate_keys[i]
      AND e.occurred_at > now() - (p_rate_window_minutes * interval '1 minute');
    IF v_count >= p_rate_limits[i] THEN
      RETURN QUERY SELECT 'rate_limited'::text, NULL::uuid, NULL::uuid;
      RETURN;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.status NOT IN ('cancelled', 'rescheduled')
      AND a.start_at < p_end_at + (p_buffer_minutes * interval '1 minute')
      AND a.end_at > p_start_at - (p_buffer_minutes * interval '1 minute')
  ) THEN
    RETURN QUERY SELECT 'slot_taken'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE (p_phone_last10 <> ''
         AND right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = p_phone_last10)
     OR (p_email <> '' AND lower(trim(coalesce(c.email, ''))) = p_email)
  ORDER BY
    (p_phone_last10 <> ''
      AND right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = p_phone_last10) DESC,
    c.created_at ASC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (full_name, phone, email, preferred_language, status,
                         referral_source, interested_services, notes)
    VALUES (p_full_name, p_phone, nullif(p_email, ''), p_preferred_language, 'lead',
            'Online booking', ARRAY[p_service_type], 'Created from online booking.')
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO appointments (client_id, title, service_type, start_at, end_at,
                            appointment_type, status, notes, source,
                            online_booking_consent_at)
  VALUES (v_client_id, p_title, p_service_type, p_start_at, p_end_at,
          'phone', 'requested', p_notes, 'online_booking', p_consent_at)
  RETURNING id INTO v_appointment_id;

  INSERT INTO tasks (client_id, appointment_id, type, title)
  VALUES (v_client_id, v_appointment_id, 'appointment_confirmation', 'Confirm: ' || p_title);

  INSERT INTO online_booking_rate_limit_events (key_hash)
  SELECT unnest(p_rate_keys);

  RETURN QUERY SELECT 'ok'::text, v_appointment_id, v_client_id;
END;
$$;
