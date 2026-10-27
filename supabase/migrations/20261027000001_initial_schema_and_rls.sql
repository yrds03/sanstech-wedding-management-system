-- ============================================================================
-- SANSTECH Wedding Management System (WeddingHub)
-- Migration: 20261027000001_initial_schema_and_rls.sql
-- Deskripsi: Skema inti multi-tenant, RBAC, ledger check-in atomik, dan RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & TIPE DATA
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE workspace_type AS ENUM ('wo', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'live', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_role AS ENUM (
    'event_manager',
    'couple',
    'supervisor',
    'receptionist',
    'usher',
    'viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invitation_group_type AS ENUM ('individual', 'couple', 'family');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE guest_category AS ENUM ('regular', 'vip', 'vvip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rsvp_status AS ENUM ('attending', 'declined', 'unsure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE checkin_method AS ENUM ('qr', 'manual', 'correction');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE display_event_state AS ENUM ('queued', 'shown', 'skipped', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE usher_notification_status AS ENUM ('pending', 'seen', 'acknowledged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE license_status AS ENUM ('active', 'pending_manual_payment', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. TABEL INTI
-- ----------------------------------------------------------------------------

-- 2.1 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 2),
  phone_optional TEXT,
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type workspace_type NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Workspace Memberships
CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- 2.4 Plans (Katalog Paket)
CREATE TABLE IF NOT EXISTS public.plans (
  code TEXT PRIMARY KEY CHECK (code IN ('free', 'pro', 'pro_plus')),
  display_name TEXT NOT NULL,
  limits JSONB NOT NULL,
  features JSONB NOT NULL,
  price_idr INTEGER NOT NULL CHECK (price_idr >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Events (Acara Pernikahan)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 3),
  bride_name TEXT NOT NULL CHECK (char_length(trim(bride_name)) >= 1),
  groom_name TEXT NOT NULL CHECK (char_length(trim(groom_name)) >= 1),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '13:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  venue TEXT NOT NULL CHECK (char_length(trim(venue)) >= 2),
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  status event_status NOT NULL DEFAULT 'draft',
  cover_image_path TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "display_duration_sec": 8,
    "allow_couple_guest_edit": true,
    "vip_public_welcome_enabled": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_time_order_chk CHECK (end_time > start_time)
);

-- 2.6 Event Licenses
CREATE TABLE IF NOT EXISTS public.event_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.plans(code) DEFAULT 'free',
  status license_status NOT NULL DEFAULT 'active',
  requested_plan_code TEXT REFERENCES public.plans(code),
  activated_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  payment_note_internal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Event Memberships
CREATE TABLE IF NOT EXISTS public.event_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role event_role NOT NULL,
  permissions_optional JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id, role)
);

-- 2.8 Member Invites (Undangan Tim / Pasangan)
CREATE TABLE IF NOT EXISTS public.member_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL CHECK (position('@' in recipient_email) > 1),
  workspace_role_grant workspace_role,
  event_role_grant event_role,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_invite_role_scope_chk CHECK (
    (workspace_role_grant IS NOT NULL AND event_id IS NULL) OR
    (event_role_grant IS NOT NULL AND event_id IS NOT NULL)
  )
);

-- 2.9 Invitation Groups (Unit Undangan & Kuota Orang)
CREATE TABLE IF NOT EXISTS public.invitation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 2),
  phone_optional TEXT,
  type invitation_group_type NOT NULL DEFAULT 'individual',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1 AND capacity <= 20),
  guest_category guest_category NOT NULL DEFAULT 'regular',
  table_label_optional TEXT,
  notes_private_optional TEXT,
  allowed_public_display BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 Guests (Nama Anggota Opsional dalam Group)
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_group_id UUID NOT NULL REFERENCES public.invitation_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  notes_optional TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 Invitations (Token Publik & QR Terpisah)
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_group_id UUID NOT NULL UNIQUE REFERENCES public.invitation_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  public_token_hash TEXT NOT NULL UNIQUE,
  qr_token_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 1 CHECK (token_version >= 1),
  published_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, qr_token_hash)
);

-- 2.12 RSVPs (Konfirmasi Rencana Kehadiran != Check-in)
CREATE TABLE IF NOT EXISTS public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_group_id UUID NOT NULL UNIQUE REFERENCES public.invitation_groups(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  attendee_count INTEGER NOT NULL DEFAULT 0 CHECK (attendee_count >= 0 AND attendee_count <= 20),
  note_optional TEXT CHECK (note_optional IS NULL OR char_length(note_optional) <= 500),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'public_link',
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT rsvp_declined_zero_chk CHECK (status <> 'declined' OR attendee_count = 0)
);

-- 2.13 Check-in Entries (Immutable Signed Ledger)
CREATE TABLE IF NOT EXISTS public.checkin_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_group_id UUID NOT NULL REFERENCES public.invitation_groups(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  delta_attendees INTEGER NOT NULL CHECK (delta_attendees <> 0),
  method checkin_method NOT NULL,
  reason_nullable TEXT,
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, idempotency_key),
  CONSTRAINT checkin_correction_reason_chk CHECK (
    (method = 'correction' AND delta_attendees < 0 AND reason_nullable IS NOT NULL AND char_length(trim(reason_nullable)) >= 5)
    OR (method IN ('qr', 'manual') AND delta_attendees > 0)
  )
);

-- 2.14 Scanner Sessions (Batas Sesi Operator Aktif per Paket)
CREATE TABLE IF NOT EXISTS public.scanner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL DEFAULT 'Perangkat Scanner',
  session_token_hash TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.15 Display Sessions (Sesi Layar Sambutan Terbatas)
CREATE TABLE IF NOT EXISTS public.display_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  pairing_code_hash TEXT UNIQUE,
  auth_token_hash TEXT UNIQUE,
  device_name TEXT NOT NULL DEFAULT 'Layar Sambutan Utama',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  config JSONB NOT NULL DEFAULT '{"duration_sec": 8, "privacy_mode": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.16 Display Events (Antrean FIFO Sambutan Layar)
CREATE TABLE IF NOT EXISTS public.display_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_group_id UUID REFERENCES public.invitation_groups(id) ON DELETE SET NULL,
  payload_public_minimal JSONB NOT NULL,
  state display_event_state NOT NULL DEFAULT 'queued',
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 2.17 Usher Notifications (Notifikasi Internal VIP/VVIP)
CREATE TABLE IF NOT EXISTS public.usher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_group_id UUID NOT NULL REFERENCES public.invitation_groups(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status usher_notification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

-- 2.18 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. INDEKS KINERJA MINIMUM (Sesuai PRD Bab 8)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_workspace_date
  ON public.events (workspace_id, event_date);

CREATE INDEX IF NOT EXISTS idx_event_memberships_user_event
  ON public.event_memberships (user_id, event_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_workspace
  ON public.workspace_memberships (user_id, workspace_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_invitation_groups_event_name
  ON public.invitation_groups (event_id, lower(display_name));

CREATE INDEX IF NOT EXISTS idx_invitations_event_qr
  ON public.invitations (event_id, qr_token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_checkin_entries_event_group
  ON public.checkin_entries (event_id, invitation_group_id);

CREATE INDEX IF NOT EXISTS idx_scanner_sessions_event_active
  ON public.scanner_sessions (event_id, revoked_at)
  WHERE revoked_at IS NULL AND ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_display_events_queue
  ON public.display_events (event_id, state, queued_at);

-- ----------------------------------------------------------------------------
-- 4. FUNGSI HELPER OTORISASI & RLS (SECURITY DEFINER + Strict search_path)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_workspace_access(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_admin_access(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
      AND wm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_event_access(target_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = e.workspace_id
     AND wm.user_id = auth.uid()
     AND wm.status = 'active'
    WHERE e.id = target_event_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.event_memberships em
    WHERE em.event_id = target_event_id
      AND em.user_id = auth.uid()
      AND em.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_event_manage_access(target_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = e.workspace_id
     AND wm.user_id = auth.uid()
     AND wm.status = 'active'
     AND wm.role IN ('owner', 'admin')
    WHERE e.id = target_event_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.event_memberships em
    WHERE em.event_id = target_event_id
      AND em.user_id = auth.uid()
      AND em.status = 'active'
      AND em.role IN ('event_manager', 'couple')
  );
$$;

-- ----------------------------------------------------------------------------
-- 5. FUNGSI TRANSAKSI ATOMIK CHECK-IN (Mencegah Race Condition & Over-capacity)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perform_atomic_checkin(
  p_event_id UUID,
  p_invitation_group_id UUID,
  p_actor_user_id UUID,
  p_delta_attendees INTEGER,
  p_method checkin_method,
  p_idempotency_key UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.invitation_groups%ROWTYPE;
  v_existing_entry public.checkin_entries%ROWTYPE;
  v_current_checked_in INTEGER;
  v_new_checked_in INTEGER;
BEGIN
  -- 1. Cek Idempotency Key terlebih dahulu
  SELECT *
    INTO v_existing_entry
    FROM public.checkin_entries
   WHERE event_id = p_event_id
     AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT COALESCE(SUM(delta_attendees), 0)
      INTO v_current_checked_in
      FROM public.checkin_entries
     WHERE invitation_group_id = v_existing_entry.invitation_group_id;

    SELECT *
      INTO v_group
      FROM public.invitation_groups
     WHERE id = v_existing_entry.invitation_group_id;

    RETURN jsonb_build_object(
      'status', 'idempotent_replay',
      'invitation_group_id', v_group.id,
      'added_attendees', v_existing_entry.delta_attendees,
      'checked_in_count', v_current_checked_in,
      'capacity', v_group.capacity,
      'remaining', GREATEST(v_group.capacity - v_current_checked_in, 0)
    );
  END IF;

  -- 2. Lock baris invitation_group secara eksklusif (FOR UPDATE)
  SELECT *
    INTO v_group
    FROM public.invitation_groups
   WHERE id = p_invitation_group_id
     AND event_id = p_event_id
     AND status = 'active'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND: Undangan tidak ditemukan pada acara ini.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Hitung saldo kehadiran saat ini dari ledger
  SELECT COALESCE(SUM(delta_attendees), 0)
    INTO v_current_checked_in
    FROM public.checkin_entries
   WHERE invitation_group_id = p_invitation_group_id;

  v_new_checked_in := v_current_checked_in + p_delta_attendees;

  -- 4. Tegakkan invarian kapasitas: 0 <= SUM(delta_attendees) <= capacity
  IF v_new_checked_in > v_group.capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED: Jumlah hadir (%) melebihi kapasitas undangan (%).',
      v_new_checked_in, v_group.capacity
      USING ERRCODE = '23514';
  END IF;

  IF v_new_checked_in < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_ATTENDANCE: Total kehadiran tidak boleh kurang dari 0.'
      USING ERRCODE = '23514';
  END IF;

  -- 5. Catat ke ledger checkin_entries
  INSERT INTO public.checkin_entries (
    event_id,
    invitation_group_id,
    actor_user_id,
    delta_attendees,
    method,
    reason_nullable,
    idempotency_key
  ) VALUES (
    p_event_id,
    p_invitation_group_id,
    p_actor_user_id,
    p_delta_attendees,
    p_method,
    p_reason,
    p_idempotency_key
  );

  -- 6. Catat audit log jika berupa koreksi supervisor
  IF p_method = 'correction' THEN
    INSERT INTO public.audit_logs (
      event_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_event_id,
      p_actor_user_id,
      'checkin.corrected',
      'invitation_group',
      p_invitation_group_id::text,
      jsonb_build_object(
        'delta', p_delta_attendees,
        'previous_count', v_current_checked_in,
        'new_count', v_new_checked_in,
        'reason', p_reason
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'invitation_group_id', v_group.id,
    'added_attendees', p_delta_attendees,
    'checked_in_count', v_new_checked_in,
    'capacity', v_group.capacity,
    'remaining', v_group.capacity - v_new_checked_in
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. AKTIVASI ROW LEVEL SECURITY (RLS) PADA SEMUA TABEL PRIVAT
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usher_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: Plans (Publik dapat melihat katalog paket aktif)
CREATE POLICY plans_select_active ON public.plans
  FOR SELECT USING (is_active = TRUE);

-- Policies: Workspaces (Hanya anggota aktif workspace yang dapat melihat)
CREATE POLICY workspaces_select_member ON public.workspaces
  FOR SELECT USING (public.has_workspace_access(id));

CREATE POLICY workspaces_insert_authenticated ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY workspaces_update_admin ON public.workspaces
  FOR UPDATE USING (public.has_workspace_admin_access(id));

-- Policies: Workspace Memberships
CREATE POLICY workspace_memberships_select ON public.workspace_memberships
  FOR SELECT USING (public.has_workspace_access(workspace_id));

CREATE POLICY workspace_memberships_manage ON public.workspace_memberships
  FOR ALL USING (public.has_workspace_admin_access(workspace_id));

-- Policies: Events (Isolasi ketat antar-tenant WO A vs WO B)
CREATE POLICY events_select_authorized ON public.events
  FOR SELECT USING (public.has_event_access(id));

CREATE POLICY events_insert_workspace_admin ON public.events
  FOR INSERT WITH CHECK (public.has_workspace_admin_access(workspace_id));

CREATE POLICY events_update_authorized ON public.events
  FOR UPDATE USING (public.has_event_manage_access(id));

-- Policies: Event Licenses
CREATE POLICY event_licenses_select_authorized ON public.event_licenses
  FOR SELECT USING (public.has_event_access(event_id));

-- Policies: Event Memberships
CREATE POLICY event_memberships_select_authorized ON public.event_memberships
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY event_memberships_manage_authorized ON public.event_memberships
  FOR ALL USING (public.has_event_manage_access(event_id));

-- Policies: Member Invites
CREATE POLICY member_invites_select_authorized ON public.member_invites
  FOR SELECT USING (
    public.has_workspace_admin_access(workspace_id)
    OR (event_id IS NOT NULL AND public.has_event_manage_access(event_id))
  );

CREATE POLICY member_invites_insert_authorized ON public.member_invites
  FOR INSERT WITH CHECK (
    public.has_workspace_admin_access(workspace_id)
    OR (event_id IS NOT NULL AND public.has_event_manage_access(event_id))
  );

CREATE POLICY member_invites_update_authorized ON public.member_invites
  FOR UPDATE USING (
    public.has_workspace_admin_access(workspace_id)
    OR (event_id IS NOT NULL AND public.has_event_manage_access(event_id))
  );

-- Policies: Invitation Groups, Guests, Invitations, RSVPs, Check-in Ledger, Audit Logs
CREATE POLICY invitation_groups_select_authorized ON public.invitation_groups
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY invitation_groups_modify_authorized ON public.invitation_groups
  FOR ALL USING (public.has_event_manage_access(event_id));

CREATE POLICY guests_select_authorized ON public.guests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invitation_groups ig
      WHERE ig.id = guests.invitation_group_id
        AND public.has_event_access(ig.event_id)
    )
  );

CREATE POLICY invitations_select_authorized ON public.invitations
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY rsvps_select_authorized ON public.rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invitation_groups ig
      WHERE ig.id = rsvps.invitation_group_id
        AND public.has_event_access(ig.event_id)
    )
  );

CREATE POLICY checkin_entries_select_authorized ON public.checkin_entries
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY scanner_sessions_select_authorized ON public.scanner_sessions
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY display_sessions_select_authorized ON public.display_sessions
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY display_events_select_authorized ON public.display_events
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY usher_notifications_select_authorized ON public.usher_notifications
  FOR SELECT USING (public.has_event_access(event_id));

CREATE POLICY audit_logs_select_authorized ON public.audit_logs
  FOR SELECT USING (
    (workspace_id IS NOT NULL AND public.has_workspace_admin_access(workspace_id))
    OR (event_id IS NOT NULL AND public.has_event_manage_access(event_id))
  );

-- ----------------------------------------------------------------------------
-- 7. SEED KATALOG PAKET RESMI (Free / Pro / Pro Plus)
-- ----------------------------------------------------------------------------
INSERT INTO public.plans (code, display_name, limits, features, price_idr, is_active)
VALUES
  (
    'free',
    'Free',
    '{"max_invitation_groups": 50, "max_active_scanners": 1}'::jsonb,
    '{"qr_checkin": true, "manual_search": true, "rsvp_basic": true, "import_excel": false, "welcome_display": false, "vip_notification": false, "export_level": "basic_csv", "watermark": true}'::jsonb,
    0,
    TRUE
  ),
  (
    'pro',
    'Pro',
    '{"max_invitation_groups": 500, "max_active_scanners": 3}'::jsonb,
    '{"qr_checkin": true, "manual_search": true, "rsvp_basic": true, "import_excel": true, "welcome_display": true, "vip_notification": false, "export_level": "detailed", "watermark": false}'::jsonb,
    199000,
    TRUE
  ),
  (
    'pro_plus',
    'Pro Plus',
    '{"max_invitation_groups": 2000, "max_active_scanners": 10}'::jsonb,
    '{"qr_checkin": true, "manual_search": true, "rsvp_basic": true, "import_excel": true, "welcome_display": true, "vip_notification": true, "export_level": "detailed", "watermark": false, "white_label": true}'::jsonb,
    499000,
    TRUE
  )
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  price_idr = EXCLUDED.price_idr;
