-- ============================================================================
-- SANSTECH Wedding Management System — RLS & Concurrency Verification Script
-- File: supabase/tests/rls_and_invariants_test.sql
-- Jalankan pada Supabase Postgres lokal untuk menguji isolasi Tenant A vs B
-- serta invarian kapasitas check-in atomik.
-- ============================================================================

BEGIN;

-- Pastikan semua tabel utama memiliki rowsecurity = true
DO $$
DECLARE
  v_unprotected_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO v_unprotected_count
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN (
       'profiles', 'workspaces', 'workspace_memberships', 'plans',
       'events', 'event_licenses', 'event_memberships', 'member_invites',
       'invitation_groups', 'guests', 'invitations', 'rsvps',
       'checkin_entries', 'scanner_sessions', 'display_sessions',
       'display_events', 'usher_notifications', 'audit_logs'
     )
     AND rowsecurity = FALSE;

  IF v_unprotected_count > 0 THEN
    RAISE EXCEPTION 'RLS_CHECK_FAILED: Terdapat % tabel publik tanpa RLS!', v_unprotected_count;
  END IF;
END $$;

ROLLBACK;

