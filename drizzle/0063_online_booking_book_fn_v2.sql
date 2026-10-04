-- Public online booking — book_online_appointment_v2().
-- Hand-written custom SQL migration (via `drizzle-kit generate --custom`),
-- same reasoning as 0062: no transactions on neon-http, so lock + checks +
-- inserts must live in one PL/pgSQL function.
--
-- Identical to book_online_appointment() (0062) except for one new final
-- parameter, p_language_note: when the visitor matches an EXISTING client
-- whose saved preferred_language differs from the language chosen on this
-- booking, that text is appended to the "Confirm: …" task title. The
-- client record itself is still never modified. (Email being optional
-- needs no change: an empty p_email was already ignored for matching and
-- stored as NULL.)
--
-- A NEW function name rather than CREATE OR REPLACE with a different
-- signature, so the currently deployed code (which calls the 0062
-- function) keeps working between this migration and the next deploy.
-- book_online_appointment() can be dropped in a later migration once
-- nothing calls it.
CREATE OR REPLACE FUNCTION book_online_appointment_v2(
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
  p_rate_window_minutes integer,
  p_language_note text
) RETURNS TABLE (status text, appointment_id uuid, client_id uuid)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_count integer;
  v_client_id uuid;
  v_client_language text;
  v_appointment_id uuid;
  v_task_title text;
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

  SELECT c.id, c.preferred_language INTO v_client_id, v_client_language
  FROM clients c
  WHERE (p_phone_last10 <> ''
         AND right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = p_phone_last10)
     OR (p_email <> '' AND lower(trim(coalesce(c.email, ''))) = p_email)
  ORDER BY
    (p_phone_last10 <> ''
      AND right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = p_phone_last10) DESC,
    c.created_at ASC
  LIMIT 1;

  v_task_title := 'Confirm: ' || p_title;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (full_name, phone, email, preferred_language, status,
                         referral_source, interested_services, notes)
    VALUES (p_full_name, p_phone, nullif(p_email, ''), p_preferred_language, 'lead',
            'Online booking', ARRAY[p_service_type], 'Created from online booking.')
    RETURNING id INTO v_client_id;
  ELSIF v_client_language IS DISTINCT FROM p_preferred_language THEN
    v_task_title := v_task_title || coalesce(p_language_note, '');
  END IF;

  INSERT INTO appointments (client_id, title, service_type, start_at, end_at,
                            appointment_type, status, notes, source,
                            online_booking_consent_at)
  VALUES (v_client_id, p_title, p_service_type, p_start_at, p_end_at,
          'phone', 'requested', p_notes, 'online_booking', p_consent_at)
  RETURNING id INTO v_appointment_id;

  INSERT INTO tasks (client_id, appointment_id, type, title)
  VALUES (v_client_id, v_appointment_id, 'appointment_confirmation', v_task_title);

  INSERT INTO online_booking_rate_limit_events (key_hash)
  SELECT unnest(p_rate_keys);

  RETURN QUERY SELECT 'ok'::text, v_appointment_id, v_client_id;
END;
$$;
