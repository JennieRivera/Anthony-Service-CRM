-- Phase 2B-3 durable rate limiter. Hand-written custom SQL migration
-- (generated via `drizzle-kit generate --custom`) because Drizzle's
-- schema DSL has no construct for stored functions — schema.ts cannot
-- represent this, so a normal schema-diff generate cannot produce it.
--
-- WHY A FUNCTION, NOT A SINGLE RAW SQL STATEMENT: this project's driver
-- (drizzle-orm/neon-http) has no transaction support — db.transaction()
-- unconditionally throws "No transactions support in neon-http driver"
-- (confirmed by reading its session.js). The first implementation
-- attempt tried to express "acquire advisory lock, count, conditionally
-- insert" as ONE compound statement (WITH lock_acquired AS (...),
-- recent_count AS (...) INSERT ... SELECT ... WHERE ... RETURNING)
-- sent via a single db.execute() call, reasoning that Postgres runs any
-- single statement as its own implicit atomic transaction. That
-- reasoning was right about atomicity but wrong about snapshot
-- freshness: under READ COMMITTED, a single statement takes ONE
-- snapshot at the moment it starts, even if execution blocks partway
-- through (e.g. waiting on pg_advisory_xact_lock inside a CTE). When
-- the lock is released by whichever request was holding it and a
-- waiting request resumes, it resumes using the SAME stale snapshot
-- from before it blocked — so its count(*) subquery does not see rows
-- inserted by other requests while it was waiting. Live testing against
-- the real shared database confirmed this empirically: 25 truly
-- concurrent requests against a 20/hour limit allowed 24, then 25 (on a
-- repeat run), instead of exactly 20 — a real, reproducible race, not a
-- theoretical concern.
--
-- A PL/pgSQL function fixes this because each SQL command INSIDE a
-- function body is its own separate statement from Postgres's
-- perspective, and under READ COMMITTED (plpgsql's default, matching
-- the surrounding implicit transaction here), each of those inner
-- statements gets its OWN fresh snapshot at the moment it runs — so the
-- count taken AFTER the advisory-lock call blocks and resumes correctly
-- sees every row committed by other requests while this call was
-- waiting. This is still exactly ONE HTTP round trip / ONE db.execute()
-- call from the application side
-- (`SELECT miadiamante_check_rate_limit($1, $2, $3)`), preserving the
-- "one statement, no db.transaction()" constraint this driver requires,
-- while actually delivering the atomicity + freshness the owner's
-- design calls for.
CREATE OR REPLACE FUNCTION miadiamante_check_rate_limit(
  p_owner_email text,
  p_max_requests integer,
  p_window_ms bigint
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Transaction-scoped: held only for the lifetime of the calling
  -- statement's own implicit transaction, released automatically the
  -- instant it commits right after this function returns. Serializes
  -- concurrent callers for the SAME owner_email; different owners hash
  -- to different lock keys and never block each other.
  PERFORM pg_advisory_xact_lock(hashtext(p_owner_email));

  -- A fresh READ COMMITTED snapshot for THIS statement, taken only now
  -- (after the lock above was acquired) — correctly reflects every
  -- event any other, now-completed concurrent caller already inserted
  -- while this call was waiting on the lock.
  SELECT count(*) INTO v_count
  FROM miadiamante_rate_limit_events
  WHERE owner_email = p_owner_email
    AND occurred_at > now() - (p_window_ms * interval '1 millisecond');

  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO miadiamante_rate_limit_events (owner_email) VALUES (p_owner_email);
  RETURN true;
END;
$$;
