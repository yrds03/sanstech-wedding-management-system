-- Durable repository. Every mutation is a PostgreSQL transaction, authorized using auth.uid().
-- No production reset, email-only login, impersonation, or browser-supplied database state.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.events ADD CONSTRAINT events_timezone_supported CHECK (timezone IN ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura'));
CREATE UNIQUE INDEX IF NOT EXISTS workspace_onboarding_key ON public.workspaces(owner_user_id, idempotency_key);
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS public_token TEXT;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS qr_token TEXT;
ALTER TABLE public.invitation_groups ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.member_invites ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id);
ALTER TABLE public.member_invites ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE public.display_sessions ADD COLUMN IF NOT EXISTS pairing_expires_at TIMESTAMPTZ;
ALTER TABLE public.display_sessions ADD COLUMN IF NOT EXISTS pairing_code TEXT;
ALTER TABLE public.scanner_sessions ADD COLUMN IF NOT EXISTS device_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS scanner_device_key ON public.scanner_sessions(event_id, user_id, device_key);
ALTER TABLE public.checkin_entries DROP CONSTRAINT checkin_correction_reason_chk;
ALTER TABLE public.checkin_entries ADD CONSTRAINT checkin_correction_reason_chk CHECK (
  (method = 'correction' AND delta_attendees <> 0 AND char_length(trim(reason_nullable)) >= 5 AND reason_nullable IS NOT NULL)
  OR (method IN ('qr', 'manual') AND delta_attendees > 0)
);

CREATE TABLE public.platform_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  config JSONB NOT NULL DEFAULT '{"proPriceIdr":1490000,"proPlusPriceIdr":3490000,"gracePeriodDaysAfterEvent":14,"addOnsPrices":{}}'
);
INSERT INTO public.platform_settings(id) VALUES (TRUE);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
UPDATE public.plans SET price_idr = CASE code WHEN 'pro' THEN 1490000 WHEN 'pro_plus' THEN 3490000 ELSE 0 END;

CREATE TABLE public.wms_rate_limits (
  bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.wms_rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles cannot grant themselves administrator rights or reactivate a suspended account.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(display_name, phone_optional) ON public.profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.wms_new_profile() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(user_id, display_name)
  VALUES (NEW.id, LEFT(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), 'Pengguna SANSTECH'), 80));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS wms_create_profile ON auth.users;
CREATE TRIGGER wms_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.wms_new_profile();
INSERT INTO public.profiles(user_id, display_name)
SELECT id, LEFT(COALESCE(NULLIF(trim(raw_user_meta_data->>'display_name'), ''), 'Pengguna SANSTECH'), 80)
FROM auth.users ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.wms_role(eid UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND status = 'active') THEN NULL
    WHEN EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_platform_admin) THEN 'platform_admin'
    ELSE COALESCE(
      (SELECT CASE wm.role WHEN 'owner' THEN 'workspace_owner' WHEN 'admin' THEN 'workspace_admin' ELSE 'viewer' END
       FROM workspace_memberships wm JOIN events e ON e.workspace_id = wm.workspace_id
       WHERE e.id = eid AND wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role IN ('owner','admin')),
      (SELECT em.role::text FROM event_memberships em JOIN events ev ON ev.id=em.event_id
       LEFT JOIN event_licenses el ON el.event_id=ev.id
       WHERE em.event_id = eid AND em.user_id = auth.uid() AND em.status = 'active'
       AND (NOW() AT TIME ZONE ev.timezone)::date <= ev.event_date + CASE WHEN COALESCE(el.plan_code,'free')='free' THEN 3 ELSE
        COALESCE((SELECT (config->>'gracePeriodDaysAfterEvent')::INTEGER FROM platform_settings WHERE id),14) END
       ORDER BY CASE em.role WHEN 'event_manager' THEN 1 WHEN 'couple' THEN 2 WHEN 'supervisor' THEN 3 WHEN 'receptionist' THEN 4 WHEN 'usher' THEN 5 ELSE 6 END LIMIT 1),
      (SELECT 'viewer' FROM workspace_memberships wm JOIN events e ON e.workspace_id = wm.workspace_id
       WHERE e.id = eid AND wm.user_id = auth.uid() AND wm.status = 'active')
    ) END;
$$;

CREATE OR REPLACE FUNCTION public.wms_token_hash(token TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT encode(sha256(convert_to(token, 'UTF8')), 'hex') $$;
CREATE OR REPLACE FUNCTION public.wms_token() RETURNS TEXT
LANGUAGE sql VOLATILE SET search_path = public AS $$ SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') $$;

CREATE OR REPLACE FUNCTION public.wms_workspace(wid UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',w.id,'type',w.type,'name',w.name,'slug',w.slug,'ownerUserId',w.owner_user_id,
  'role',wm.role,'createdAt',w.created_at,
  'activeEventsCount',(SELECT count(*) FROM events WHERE workspace_id = wid AND status IN ('draft','published','live')),
  'upcomingEventsCount',(SELECT count(*) FROM events WHERE workspace_id = wid AND event_date >= CURRENT_DATE AND status NOT IN ('completed','archived')),
  'completedEventsCount',(SELECT count(*) FROM events WHERE workspace_id = wid AND status IN ('completed','archived')))
 FROM workspaces w JOIN workspace_memberships wm ON wm.workspace_id = w.id
 WHERE w.id = wid AND wm.user_id = auth.uid() AND wm.status = 'active' AND w.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.wms_event(eid UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',e.id,'workspaceId',e.workspace_id,'workspaceName',w.name,'workspaceType',w.type,
  'title',e.title,'brideName',e.bride_name,'groomName',e.groom_name,'eventDate',e.event_date,
  'startTime',to_char(e.start_time,'HH24:MI'),'endTime',to_char(e.end_time,'HH24:MI'),'timezone',e.timezone,
  'venue',e.venue,'address',e.address,'city',e.city,'status',e.status,
  'planCode',CASE WHEN l.status = 'active' AND (l.expires_at IS NULL OR l.expires_at > NOW()) THEN l.plan_code ELSE 'free' END,
  'licenseStatus',CASE WHEN l.expires_at <= NOW() THEN 'expired' ELSE COALESCE(l.status::text,'active') END,
  'invitationConfig',e.settings->'invitationConfig','myEffectiveRole',COALESCE(wms_role(e.id),'guest_public'),
  'metrics',jsonb_build_object(
   'invitationGroupsCount',(SELECT count(*) FROM invitation_groups WHERE event_id=eid AND status='active'),
   'invitedCapacityTotal',(SELECT COALESCE(sum(capacity),0) FROM invitation_groups WHERE event_id=eid AND status='active'),
   'rsvpAttendingCount',(SELECT COALESCE(sum(r.attendee_count),0) FROM rsvps r JOIN invitation_groups g ON g.id=r.invitation_group_id WHERE g.event_id=eid AND r.status='attending'),
   'checkedInPersonsCount',(SELECT COALESCE(sum(delta_attendees),0) FROM checkin_entries WHERE event_id=eid),
   'checkedInGroupsCount',(SELECT count(*) FROM (SELECT invitation_group_id FROM checkin_entries WHERE event_id=eid GROUP BY invitation_group_id HAVING sum(delta_attendees)>0) t),
   'vipCheckedInCount',(SELECT COALESCE(sum(c.delta_attendees),0) FROM checkin_entries c JOIN invitation_groups g ON g.id=c.invitation_group_id WHERE c.event_id=eid AND g.guest_category<>'regular'),
   'vipTotalCount',(SELECT count(*) FROM invitation_groups WHERE event_id=eid AND guest_category<>'regular' AND status='active')))
 FROM events e JOIN workspaces w ON w.id=e.workspace_id LEFT JOIN event_licenses l ON l.event_id=e.id WHERE e.id=eid;
$$;

CREATE OR REPLACE FUNCTION public.wms_guest(gid UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',g.id,'eventId',g.event_id,'displayName',g.display_name,'phoneOptional',g.phone_optional,
 'type',g.type,'capacity',g.capacity,'guestCategory',g.guest_category,'tableLabelOptional',g.table_label_optional,
 'notesPrivateOptional',g.notes_private_optional,'allowedPublicDisplay',g.allowed_public_display,
 'rsvpStatus',COALESCE(r.status::text,'pending'),'rsvpCount',COALESCE(r.attendee_count,0),'rsvpNote',r.note_optional,
 'checkedInCount',COALESCE((SELECT sum(delta_attendees) FROM checkin_entries WHERE invitation_group_id=gid),0),
 'remainingCapacity',g.capacity-COALESCE((SELECT sum(delta_attendees) FROM checkin_entries WHERE invitation_group_id=gid),0),
 'qrTokenPreview',i.qr_token,'publicTokenPreview',i.public_token,'tokenVersion',i.token_version,'isTestData',g.is_test_data,'createdAt',g.created_at)
 FROM invitation_groups g LEFT JOIN invitations i ON i.invitation_group_id=g.id LEFT JOIN rsvps r ON r.invitation_group_id=g.id WHERE g.id=gid;
$$;

CREATE OR REPLACE FUNCTION public.wms_invite(iid UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',i.id,'workspaceId',i.workspace_id,'eventId',i.event_id,'recipientEmail',i.recipient_email,
 'roleLabel',COALESCE(i.event_role_grant::text,i.workspace_role_grant::text),'workspaceRoleGrant',i.workspace_role_grant,'eventRoleGrant',i.event_role_grant,
 'status',CASE WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN expires_at<=NOW() THEN 'expired' WHEN accepted_at IS NOT NULL THEN 'accepted' ELSE 'pending' END,
 'expiresAt',i.expires_at,'createdAt',i.created_at,'createdByEmail',u.email,'inviteUrlPreview','/invite/'||i.share_token)
 FROM member_invites i JOIN auth.users u ON u.id=i.created_by WHERE i.id=iid;
$$;

CREATE OR REPLACE FUNCTION public.wms_audit(eid UUID, action_name TEXT, entity TEXT, entity_key TEXT, details JSONB DEFAULT '{}') RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 INSERT INTO audit_logs(event_id,workspace_id,actor_user_id,action,entity_type,entity_id,metadata)
 VALUES(eid,(SELECT workspace_id FROM events WHERE id=eid),auth.uid(),action_name,entity,entity_key,details);
$$;

CREATE OR REPLACE FUNCTION public.wms_throttle(k TEXT, max_count INTEGER, seconds INTEGER) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
 DELETE FROM wms_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';
 INSERT INTO wms_rate_limits(bucket,count,reset_at) VALUES(k,1,NOW()+make_interval(secs=>seconds))
 ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN wms_rate_limits.reset_at<=NOW() THEN 1 ELSE wms_rate_limits.count+1 END,
 reset_at=CASE WHEN wms_rate_limits.reset_at<=NOW() THEN NOW()+make_interval(secs=>seconds) ELSE wms_rate_limits.reset_at END RETURNING count INTO n;
 RETURN n<=max_count;
END $$;

-- Lock group and idempotency scope before replay lookup. Retrying a different payload is an error.
CREATE OR REPLACE FUNCTION public.perform_atomic_checkin(
 p_event_id UUID,p_invitation_group_id UUID,p_actor_user_id UUID,p_delta_attendees INTEGER,
 p_method checkin_method,p_idempotency_key UUID,p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g invitation_groups%ROWTYPE; old checkin_entries%ROWTYPE; total INTEGER; role_name TEXT; ev events%ROWTYPE;
BEGIN
 role_name:=wms_role(p_event_id);
 IF p_actor_user_id IS DISTINCT FROM auth.uid() OR role_name IS NULL OR
  (p_method='correction' AND role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','supervisor')) OR
  (p_method<>'correction' AND role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','supervisor','receptionist')) THEN
  RETURN jsonb_build_object('ok',false,'errorCode','FORBIDDEN','message','Anda tidak memiliki izin check-in.');
 END IF;
 SELECT * INTO ev FROM events WHERE id=p_event_id;
 IF ev.status IN ('completed','archived') OR ev.event_date < (NOW() AT TIME ZONE ev.timezone)::date THEN
  RETURN jsonb_build_object('ok',false,'errorCode','EVENT_READ_ONLY','message','Acara telah selesai dan hanya dapat dibaca.'); END IF;
 IF p_delta_attendees IS NULL OR p_delta_attendees=0 OR abs(p_delta_attendees)>20 OR p_idempotency_key IS NULL OR
  (p_method<>'correction' AND p_delta_attendees<0) OR
  (p_method='correction' AND COALESCE(length(trim(p_reason)),0)<5) THEN
  RETURN jsonb_build_object('ok',false,'errorCode','VALIDATION_ERROR','message','Jumlah hadir atau alasan koreksi tidak valid.'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text||p_idempotency_key::text,0));
 SELECT * INTO old FROM checkin_entries WHERE event_id=p_event_id AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF old.invitation_group_id<>p_invitation_group_id OR old.delta_attendees<>p_delta_attendees OR old.method<>p_method OR old.reason_nullable IS DISTINCT FROM NULLIF(trim(p_reason),'') THEN
   RETURN jsonb_build_object('ok',false,'errorCode','IDEMPOTENCY_CONFLICT','message','Kunci permintaan telah digunakan untuk transaksi berbeda.'); END IF;
  RETURN jsonb_build_object('ok',true,'message','Kehadiran sudah tercatat.','group',wms_guest(old.invitation_group_id));
 END IF;
 SELECT * INTO g FROM invitation_groups WHERE id=p_invitation_group_id AND event_id=p_event_id AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'errorCode','NOT_FOUND','message','Undangan tidak ditemukan pada acara ini.'); END IF;
 SELECT COALESCE(sum(delta_attendees),0) INTO total FROM checkin_entries WHERE invitation_group_id=g.id;
 IF total+p_delta_attendees<0 OR total+p_delta_attendees>g.capacity THEN
  RETURN jsonb_build_object('ok',false,'errorCode','CAPACITY_EXCEEDED','message','Jumlah hadir melampaui sisa kapasitas atau kurang dari nol.'); END IF;
 INSERT INTO checkin_entries(event_id,invitation_group_id,actor_user_id,delta_attendees,method,reason_nullable,idempotency_key)
 VALUES(p_event_id,g.id,auth.uid(),p_delta_attendees,p_method,NULLIF(trim(p_reason),''),p_idempotency_key);
 IF p_delta_attendees>0 AND g.allowed_public_display AND (wms_event(p_event_id)->>'planCode') IN ('pro','pro_plus') THEN
  INSERT INTO display_events(event_id,invitation_group_id,payload_public_minimal,expires_at)
   VALUES(p_event_id,g.id,jsonb_build_object('displayName',g.display_name,'guestCategory',g.guest_category,'tableLabelOptional',g.table_label_optional),NOW()+INTERVAL '30 minutes');
 END IF;
 IF p_delta_attendees>0 AND g.guest_category<>'regular' AND (wms_event(p_event_id)->>'planCode')='pro_plus' THEN
  INSERT INTO usher_notifications(event_id,invitation_group_id) VALUES(p_event_id,g.id);
 END IF;
 PERFORM wms_audit(p_event_id,CASE WHEN p_method='correction' THEN 'checkin.corrected' ELSE 'checkin.recorded' END,'invitation_group',g.id::text,
  jsonb_build_object('delta',p_delta_attendees,'previous_count',total,'new_count',total+p_delta_attendees,'reason',p_reason));
 RETURN jsonb_build_object('ok',true,'message','Kehadiran berhasil dicatat.','group',wms_guest(g.id));
END $$;

CREATE OR REPLACE FUNCTION public.wms_repository(p_action TEXT,p_args JSONB DEFAULT '[]') RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 p JSONB:=COALESCE(p_args->0,'{}'); uid UUID:=auth.uid(); eid UUID; wid UUID; gid UUID; iid UUID;
 role_name TEXT; result JSONB; event_data JSONB; token TEXT; qr TEXT; code TEXT; raw TEXT; plan TEXT;
 g invitation_groups%ROWTYPE; ev events%ROWTYPE; inv member_invites%ROWTYPE; ds display_sessions%ROWTYPE;
 n INTEGER; cap INTEGER; delta INTEGER; total INTEGER; status_text TEXT; existing BOOLEAN:=FALSE;
 filters JSONB; grace INTEGER; settings_data JSONB; scanner_key UUID; row_data JSONB; welcome_id UUID;
BEGIN
 IF p_action='getPricingSettings' THEN RETURN (SELECT config FROM platform_settings WHERE id); END IF;
 -- Public operations resolve persisted, active tokens only. No unsigned portable fallback.
 IF p_action IN ('getPublicInvitationByToken','submitPublicRsvpByToken') THEN
  raw:=CASE WHEN p_action='getPublicInvitationByToken' THEN p_args->>0 ELSE p->>'rawToken' END;
  IF length(raw)>256 OR length(raw)<24 THEN RETURN NULL; END IF;
  SELECT ig.* INTO g FROM invitation_groups ig JOIN invitations i ON i.invitation_group_id=ig.id
   JOIN events e ON e.id=ig.event_id WHERE i.public_token_hash=wms_token_hash(raw) AND i.revoked_at IS NULL AND ig.status='active' AND e.status IN ('published','live');
  IF NOT FOUND THEN RETURN CASE WHEN p_action='getPublicInvitationByToken' THEN NULL ELSE jsonb_build_object('ok',false,'message','Undangan tidak berlaku.') END; END IF;
  IF p_action='getPublicInvitationByToken' THEN
   event_data:=wms_event(g.event_id)-'metrics'-'workspaceId'-'myEffectiveRole';
   RETURN jsonb_build_object('event',event_data,'group',wms_guest(g.id)-'phoneOptional'-'notesPrivateOptional');
  END IF;
  SELECT * INTO ev FROM events WHERE id=g.event_id;
  IF ev.event_date < (NOW() AT TIME ZONE ev.timezone)::date THEN RETURN jsonb_build_object('ok',false,'message','Batas waktu RSVP telah berakhir.'); END IF;
  IF NOT wms_throttle('rsvp:'||g.id,20,60) THEN RETURN jsonb_build_object('ok',false,'message','Terlalu banyak permintaan. Coba lagi sebentar.'); END IF;
  IF p->>'rsvpStatus' NOT IN ('attending','declined','unsure') OR COALESCE(p->>'attendeeCount','') !~ '^[0-9]+$' THEN
   RETURN jsonb_build_object('ok',false,'message','Data RSVP tidak valid.'); END IF;
  n:=(p->>'attendeeCount')::INTEGER;
  IF n>g.capacity OR (p->>'rsvpStatus'='attending' AND n<1) OR (p->>'rsvpStatus'='declined' AND n<>0) THEN
   RETURN jsonb_build_object('ok',false,'message','Jumlah RSVP tidak sesuai kuota undangan.'); END IF;
  INSERT INTO rsvps(invitation_group_id,status,attendee_count,note_optional) VALUES(g.id,(p->>'rsvpStatus')::rsvp_status,n,LEFT(p->>'noteOptional',300))
   ON CONFLICT(invitation_group_id) DO UPDATE SET status=EXCLUDED.status,attendee_count=EXCLUDED.attendee_count,note_optional=EXCLUDED.note_optional,responded_at=NOW(),version=rsvps.version+1;
  RETURN jsonb_build_object('ok',true,'message','Terima kasih! RSVP Anda telah tersimpan.');
 END IF;

 IF p_action='peekMemberInviteByToken' THEN
  SELECT * INTO inv FROM member_invites WHERE token_hash=wms_token_hash(p_args->>0);
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO ev FROM events WHERE id=inv.event_id;
  RETURN jsonb_build_object('eventId',ev.id,'eventTitle',ev.title,'workspaceName',(SELECT name FROM workspaces WHERE id=ev.workspace_id),
   'recipientEmail',regexp_replace(inv.recipient_email,'(^.).*(@.*$)','\1***\2'),'roleLabel',inv.event_role_grant,'status',(wms_invite(inv.id))->>'status');
 END IF;

 IF p_action='pairDisplay' THEN
  raw:=p->>'code';
  IF NOT wms_throttle('display-pair:'||COALESCE(NULLIF(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','gateway'),20,60) THEN RETURN jsonb_build_object('ok',false,'message','Terlalu banyak percobaan. Tunggu satu menit.'); END IF;
  SELECT * INTO ds FROM display_sessions WHERE pairing_code_hash=wms_token_hash(raw) AND active AND pairing_expires_at>NOW() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Kode layar tidak valid atau kedaluwarsa. Minta kode baru kepada pengelola acara.'); END IF;
  plan:=wms_event(ds.event_id)->>'planCode';
  IF plan='free' THEN RETURN jsonb_build_object('ok',false,'message','Paket acara tidak mendukung layar sambutan.'); END IF;
  token:=wms_token();
  UPDATE display_sessions SET auth_token_hash=wms_token_hash(token),pairing_code_hash=NULL,pairing_code=NULL,pairing_expires_at=NULL,expires_at=NOW()+INTERVAL '24 hours' WHERE id=ds.id;
  RETURN jsonb_build_object('ok',true,'token',token);
 END IF;

 IF p_action='getDisplayScreenState' THEN
  SELECT * INTO ds FROM display_sessions WHERE auth_token_hash=wms_token_hash(p_args->>0) AND active AND expires_at>NOW();
  IF NOT FOUND OR (wms_event(ds.event_id)->>'planCode')='free' THEN RETURN NULL; END IF;
  event_data:=wms_event(ds.event_id);
  PERFORM 1 FROM events WHERE id=ds.event_id FOR UPDATE;
  UPDATE display_events d SET state='expired' WHERE d.event_id=ds.event_id AND d.state IN ('shown','queued') AND
   (d.expires_at<=NOW() OR (d.state='shown' AND d.shown_at<=NOW()-INTERVAL '8 seconds') OR
    NOT EXISTS(SELECT 1 FROM invitation_groups ig WHERE ig.id=d.invitation_group_id AND ig.allowed_public_display));
  SELECT id INTO welcome_id FROM display_events WHERE event_id=ds.event_id AND state='shown' ORDER BY shown_at LIMIT 1;
  IF welcome_id IS NULL THEN
   SELECT id INTO welcome_id FROM display_events WHERE event_id=ds.event_id AND state='queued' ORDER BY queued_at,id LIMIT 1;
   IF welcome_id IS NOT NULL THEN UPDATE display_events SET state='shown',shown_at=NOW() WHERE id=welcome_id; END IF;
  END IF;
  SELECT jsonb_build_object('id',d.id,'displayName',ig.display_name,'guestCategory',ig.guest_category,'tableLabelOptional',ig.table_label_optional) INTO result
   FROM display_events d JOIN invitation_groups ig ON ig.id=d.invitation_group_id WHERE d.id=welcome_id AND ig.allowed_public_display;
  RETURN jsonb_build_object('event',jsonb_build_object('title',event_data->>'title','brideName',event_data->>'brideName','groomName',event_data->>'groomName','venue',event_data->>'venue'),
   'latestPublicWelcome',result,'totalCheckedInPersons',event_data->'metrics'->'checkedInPersonsCount','lastUpdatedIso',NOW());
 END IF;

 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=uid AND status='active') THEN
  RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='42501'; END IF;
 -- Never accept a browser-selected actor, even when calling PostgREST directly.
 IF jsonb_typeof(p)='object' THEN
  IF (p ? 'userId' AND p->>'userId'<>uid::text) OR (p ? 'actorUserId' AND p->>'actorUserId'<>uid::text) THEN
   RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 ELSIF p_action NOT IN ('getEventTvPairingCode') AND p_args->>0<>uid::text THEN
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
 END IF;
 IF p_action='getPricingSettings' THEN RETURN (SELECT config FROM platform_settings WHERE id); END IF;
 IF p_action='updatePricingSettings' THEN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=uid AND is_platform_admin) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF COALESCE(p->>'proPriceIdr','')!~'^[0-9]+$' OR COALESCE(p->>'proPlusPriceIdr','')!~'^[0-9]+$' OR COALESCE(p->>'gracePeriodDaysAfterEvent','')!~'^[0-9]+$'
   OR (p->>'gracePeriodDaysAfterEvent')::INTEGER NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'INVALID_PRICING'; END IF;
  UPDATE platform_settings SET config=p WHERE id;
  UPDATE plans SET price_idr=CASE code WHEN 'pro' THEN (p->>'proPriceIdr')::INTEGER WHEN 'pro_plus' THEN (p->>'proPlusPriceIdr')::INTEGER ELSE 0 END;
  PERFORM wms_audit(NULL,'platform.pricing_updated','platform_settings','main',p);
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF p_action='getUserProfileById' THEN
  RETURN (SELECT jsonb_build_object('userId',uid,'email',u.email,'displayName',pr.display_name,'phoneOptional',pr.phone_optional,'isPlatformAdmin',pr.is_platform_admin)
   FROM profiles pr JOIN auth.users u ON u.id=pr.user_id WHERE pr.user_id=uid);
 END IF;
 IF p_action='getAuthorizedWorkspacesForUser' THEN
  RETURN COALESCE((SELECT jsonb_agg(wms_workspace(w.id) ORDER BY w.created_at) FROM workspaces w WHERE wms_workspace(w.id) IS NOT NULL),'[]'); END IF;
 IF p_action='getWorkspaceIfAuthorized' THEN RETURN wms_workspace((p_args->>1)::UUID); END IF;
 IF p_action='createWorkspaceForUser' THEN
  IF length(trim(p->>'name')) NOT BETWEEN 2 AND 80 OR (p->>'slug')!~'^[a-z0-9-]{2,48}$' OR p->>'type' NOT IN ('wo','personal') THEN RAISE EXCEPTION 'INVALID_WORKSPACE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || (p->>'idempotencyKey'),0));
  SELECT id INTO wid FROM workspaces WHERE owner_user_id=uid AND idempotency_key=(p->>'idempotencyKey')::UUID;
  IF FOUND THEN RETURN jsonb_build_object('workspace',wms_workspace(wid),'createdNew',false); END IF;
  INSERT INTO workspaces(type,name,slug,owner_user_id,idempotency_key) VALUES((p->>'type')::workspace_type,trim(p->>'name'),LEFT(p->>'slug',38)||'-'||LEFT(gen_random_uuid()::text,8),uid,(p->>'idempotencyKey')::UUID) RETURNING id INTO wid;
  INSERT INTO workspace_memberships(workspace_id,user_id,role) VALUES(wid,uid,'owner');
  INSERT INTO audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES(wid,uid,'workspace.created','workspace',wid::text);
  RETURN jsonb_build_object('workspace',wms_workspace(wid),'createdNew',true);
 END IF;
 IF p_action IN ('getAllAuthorizedEventsForUser','getAuthorizedEventsForWorkspace') THEN
  IF p_action='getAuthorizedEventsForWorkspace' AND wms_workspace((p_args->>1)::UUID) IS NULL THEN RETURN NULL; END IF;
  RETURN COALESCE((SELECT jsonb_agg(wms_event(e.id) ORDER BY e.event_date DESC) FROM events e
   WHERE wms_role(e.id) IS NOT NULL AND (p_action='getAllAuthorizedEventsForUser' OR e.workspace_id=(p_args->>1)::UUID)),'[]');
 END IF;
 IF p_action IN ('acceptMemberInviteByToken','redeemMemberInviteToken') THEN
  raw:=CASE WHEN p_action='redeemMemberInviteToken' THEN p_args->>0 ELSE p->>'rawToken' END;
  -- redeem is passed as an object by production route, never creates a login session.
  raw:=COALESCE(p->>'rawToken',raw);
  SELECT * INTO inv FROM member_invites WHERE token_hash=wms_token_hash(raw) FOR UPDATE;
  IF NOT FOUND OR inv.revoked_at IS NOT NULL OR inv.expires_at<=NOW() THEN RETURN jsonb_build_object('ok',false,'error','Undangan tidak berlaku.'); END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND lower(email)=lower(inv.recipient_email) AND email_confirmed_at IS NOT NULL) THEN
   RETURN jsonb_build_object('ok',false,'error','Masuk dengan alamat email terverifikasi yang menerima undangan.'); END IF;
  IF inv.accepted_by IS NOT NULL AND inv.accepted_by<>uid THEN RETURN jsonb_build_object('ok',false,'error','Undangan sudah digunakan.'); END IF;
  INSERT INTO event_memberships(event_id,user_id,role) VALUES(inv.event_id,uid,inv.event_role_grant)
   ON CONFLICT(event_id,user_id,role) DO UPDATE SET status='active';
  UPDATE member_invites SET accepted_at=COALESCE(accepted_at,NOW()),accepted_by=uid WHERE id=inv.id;
  PERFORM wms_audit(inv.event_id,'member_invite.accepted','member_invite',inv.id::text);
  RETURN jsonb_build_object('ok',true,'userId',uid,'eventId',inv.event_id,'workspaceId',inv.workspace_id);
 END IF;
 IF p_action='createEventInWorkspace' THEN
  wid:=(p->>'workspaceId')::UUID;
  IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=wid AND user_id=uid AND status='active' AND role IN ('owner','admin')) THEN RETURN jsonb_build_object('error','Anda tidak memiliki izin membuat acara.'); END IF;
  INSERT INTO events(workspace_id,title,bride_name,groom_name,event_date,start_time,end_time,timezone,venue,city,address,status)
   VALUES(wid,p->>'title',p->>'brideName',p->>'groomName',(p->>'eventDate')::date,(p->>'startTime')::time,(p->>'endTime')::time,
    p->>'timezone',p->>'venue',p->>'city',COALESCE(p->>'address',''),COALESCE(p->>'status','draft')::event_status) RETURNING id INTO eid;
  INSERT INTO event_licenses(event_id,plan_code,status,requested_plan_code) VALUES(eid,'free','active',CASE WHEN p->>'planCode' IN ('pro','pro_plus') THEN p->>'planCode' END);
  PERFORM wms_audit(eid,'event.created','event',eid::text);
  RETURN wms_event(eid);
 END IF;
 eid:=CASE WHEN p_action='getEventTvPairingCode' THEN (p_args->>0)::UUID
  WHEN jsonb_typeof(p)='object' THEN NULLIF(p->>'eventId','')::UUID ELSE NULLIF(p_args->>1,'')::UUID END;
 role_name:=wms_role(eid);
 IF role_name IS NULL THEN
  IF p_action IN ('getEventIfAuthorized','listInvitationGroupsForEvent','listCheckinLedgerForEvent','listMemberInvitesForEvent') THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('ok',false,'error','Acara tidak ditemukan atau akses ditolak.','message','Acara tidak ditemukan atau akses ditolak.','code','FORBIDDEN');
 END IF;
 IF p_action='getEventIfAuthorized' THEN RETURN wms_event(eid); END IF;
 SELECT * INTO ev FROM events WHERE id=eid;
 event_data:=wms_event(eid); plan:=event_data->>'planCode';
 IF p_action IN ('listScannerSessions','revokeScannerSession') THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','supervisor') THEN
   RETURN CASE WHEN p_action='listScannerSessions' THEN '[]'::jsonb ELSE jsonb_build_object('ok',false) END; END IF;
  IF p_action='revokeScannerSession' THEN
   UPDATE scanner_sessions SET revoked_at=NOW() WHERE id=(p->>'sessionId')::UUID AND event_id=eid;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false); END IF;
   PERFORM wms_audit(eid,'scanner.revoked','scanner_session',p->>'sessionId'); RETURN jsonb_build_object('ok',true);
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'actorName',pr.display_name,'lastSeenAt',s.last_seen_at,'revoked',s.revoked_at IS NOT NULL,'active',s.revoked_at IS NULL AND s.ended_at IS NULL AND s.last_seen_at>NOW()-INTERVAL '2 minutes') ORDER BY s.last_seen_at DESC)
   FROM scanner_sessions s JOIN profiles pr ON pr.user_id=s.user_id WHERE s.event_id=eid),'[]');
 END IF;
 IF p_action IN ('listVipNotifications','ackVipNotification') THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','couple','supervisor','usher') OR plan<>'pro_plus' THEN
   RETURN CASE WHEN p_action='listVipNotifications' THEN '[]'::jsonb ELSE jsonb_build_object('ok',false) END; END IF;
  IF p_action='ackVipNotification' THEN
   UPDATE usher_notifications SET status='acknowledged',acknowledged_at=NOW(),assigned_to_user_id=uid WHERE id=(p->>'notificationId')::UUID AND event_id=eid AND (assigned_to_user_id IS NULL OR assigned_to_user_id=uid);
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false); END IF;
   PERFORM wms_audit(eid,'vip.acknowledged','usher_notification',p->>'notificationId'); RETURN jsonb_build_object('ok',true);
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'displayName',ig.display_name,'tableLabel',ig.table_label_optional,'status',n.status,'createdAt',n.created_at) ORDER BY n.created_at DESC)
   FROM usher_notifications n JOIN invitation_groups ig ON ig.id=n.invitation_group_id WHERE n.event_id=eid AND (n.assigned_to_user_id IS NULL OR n.assigned_to_user_id=uid)),'[]');
 END IF;
 IF p_action='listInvitationGroupsForEvent' THEN
  IF role_name='viewer' THEN RETURN '[]'; END IF;
  filters:=COALESCE(p_args->2,'{}');
  RETURN COALESCE((SELECT jsonb_agg(CASE WHEN role_name IN ('platform_admin','workspace_owner','workspace_admin','event_manager','couple') THEN wms_guest(ig.id)
   ELSE wms_guest(ig.id)-'phoneOptional'-'notesPrivateOptional'-'publicTokenPreview'-'rsvpNote' END ORDER BY ig.created_at DESC)
   FROM invitation_groups ig WHERE ig.event_id=eid AND ig.status='active' AND (role_name<>'usher' OR ig.guest_category<>'regular')
   AND (COALESCE(filters->>'category','all')='all' OR ig.guest_category::text=filters->>'category')
   AND (COALESCE(filters->>'query','')='' OR strpos(lower(ig.display_name),lower(filters->>'query'))>0 OR strpos(lower(COALESCE(ig.table_label_optional,'')),lower(filters->>'query'))>0)),'[]');
 END IF;
 IF p_action='listCheckinLedgerForEvent' THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','couple','supervisor','viewer','receptionist') THEN RETURN '[]'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('id',c.id,'eventId',c.event_id,'invitationGroupId',c.invitation_group_id,
   'guestDisplayName',ig.display_name,'guestCategory',ig.guest_category,'tableLabelOptional',ig.table_label_optional,'actorName',pr.display_name,
   'deltaAttendees',c.delta_attendees,'method',c.method,'reasonNullable',c.reason_nullable,'idempotencyKey',c.idempotency_key,'createdAt',c.created_at) x
   FROM checkin_entries c JOIN invitation_groups ig ON ig.id=c.invitation_group_id LEFT JOIN profiles pr ON pr.user_id=c.actor_user_id
   WHERE c.event_id=eid ORDER BY c.created_at DESC,c.id DESC LIMIT 5000) entries),'[]');
 END IF;
 IF p_action='listAuditLogsForEvent' THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager') THEN RETURN '[]'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('id',a.id,'workspaceId',a.workspace_id,'eventId',a.event_id,
   'actorName',pr.display_name,'action',a.action,'entityType',a.entity_type,'entityId',a.entity_id,'summary',COALESCE(a.metadata->>'summary',a.action),'createdAt',a.created_at) x
   FROM audit_logs a LEFT JOIN profiles pr ON pr.user_id=a.actor_user_id WHERE a.event_id=eid ORDER BY a.created_at DESC LIMIT 100) logs),'[]');
 END IF;
 IF p_action IN ('listMemberInvitesForEvent','createEventMemberInvite','revokeEventMemberInvite') THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager') THEN RETURN CASE WHEN p_action='listMemberInvitesForEvent' THEN NULL ELSE jsonb_build_object('ok',false,'error','Anda tidak memiliki izin mengelola tim.') END; END IF;
  IF p_action='listMemberInvitesForEvent' THEN RETURN COALESCE((SELECT jsonb_agg(wms_invite(id) ORDER BY created_at DESC) FROM member_invites WHERE event_id=eid),'[]'); END IF;
  IF p_action='revokeEventMemberInvite' THEN
   SELECT * INTO inv FROM member_invites WHERE id=(p->>'inviteId')::UUID AND event_id=eid FOR UPDATE;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Undangan tidak ditemukan.'); END IF;
   UPDATE member_invites SET revoked_at=NOW() WHERE id=inv.id;
   UPDATE event_memberships SET status='revoked' WHERE event_id=eid AND user_id=inv.accepted_by AND role=inv.event_role_grant;
   PERFORM wms_audit(eid,'member_invite.revoked','member_invite',inv.id::text);
   RETURN jsonb_build_object('ok',true);
  END IF;
  IF (p->>'recipientEmail')!~'^[^\s@]+@[^\s@]+\.[^\s@]+$' OR p->>'eventRoleGrant' NOT IN ('event_manager','couple','supervisor','receptionist','usher','viewer') THEN RETURN jsonb_build_object('error','Email atau peran tidak valid.'); END IF;
  token:=wms_token();
  INSERT INTO member_invites(workspace_id,event_id,recipient_email,event_role_grant,token_hash,share_token,expires_at,created_by)
   VALUES(ev.workspace_id,eid,lower(trim(p->>'recipientEmail')),(p->>'eventRoleGrant')::event_role,wms_token_hash(token),token,NOW()+INTERVAL '72 hours',uid) RETURNING id INTO iid;
  PERFORM wms_audit(eid,'member_invite.created','member_invite',iid::text);
  RETURN jsonb_build_object('invite',wms_invite(iid),'rawToken',token);
 END IF;
 IF p_action IN ('getEventTvPairingCode','revokeDisplaySessions') THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','couple','supervisor') OR plan='free' THEN RETURN NULL; END IF;
  PERFORM 1 FROM events WHERE id=eid FOR UPDATE;
  IF p_action='revokeDisplaySessions' THEN
   UPDATE display_sessions SET active=FALSE WHERE event_id=eid;
   PERFORM wms_audit(eid,'display.revoked','event',eid::text); RETURN jsonb_build_object('ok',true);
  END IF;
  SELECT pairing_code INTO code FROM display_sessions WHERE event_id=eid AND active AND pairing_expires_at>NOW() LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(code); END IF;
  LOOP
   code:=(100000+floor(random()*900000)::INTEGER)::text;
   EXIT WHEN NOT EXISTS(SELECT 1 FROM display_sessions WHERE pairing_code_hash=wms_token_hash(code));
  END LOOP;
  INSERT INTO display_sessions(event_id,pairing_code_hash,pairing_code,pairing_expires_at,expires_at)
   VALUES(eid,wms_token_hash(code),code,NOW()+INTERVAL '15 minutes',NOW()+INTERVAL '24 hours');
  RETURN to_jsonb(code);
 END IF;
 IF p_action='updateEventPlanByAdmin' THEN
  IF role_name<>'platform_admin' OR p->>'planCode' NOT IN ('free','pro','pro_plus') THEN RETURN jsonb_build_object('ok',false,'message','Aktivasi paket hanya untuk administrator platform.'); END IF;
  UPDATE event_licenses SET plan_code=p->>'planCode',status='active',activated_by=uid,activated_at=NOW(),expires_at=NULL WHERE event_id=eid;
  PERFORM wms_audit(eid,'license.activated_manual','event_license',eid::text,jsonb_build_object('plan',p->>'planCode'));
  RETURN jsonb_build_object('ok',true,'message','Paket acara berhasil diaktifkan secara manual.');
 END IF;
 IF p_action IN ('recordEventCheckinOrCorrection') THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','supervisor','receptionist') THEN
   RETURN jsonb_build_object('ok',false,'message','Peran Anda tidak diizinkan menggunakan scanner.','errorCode','FORBIDDEN'); END IF;
  IF event_data->>'licenseStatus'<>'active' THEN RETURN jsonb_build_object('ok',false,'message','Lisensi acara tidak aktif. Hubungi pengelola.','errorCode','FORBIDDEN'); END IF;
  IF p->>'method' NOT IN ('qr','manual','correction') OR COALESCE(p->>'deltaAttendees','') !~ '^-?[0-9]+$' THEN RETURN jsonb_build_object('ok',false,'message','Data check-in tidak valid.','errorCode','VALIDATION_ERROR'); END IF;
  raw:=trim(p->>'groupIdOrQrToken');
  SELECT ig.id INTO gid FROM invitation_groups ig JOIN invitations i ON i.invitation_group_id=ig.id
   WHERE ig.event_id=eid AND ig.status='active' AND ((p->>'method'<>'qr' AND ig.id::text=raw) OR (i.qr_token_hash=wms_token_hash(raw) AND i.revoked_at IS NULL)) LIMIT 1;
  IF gid IS NULL AND p->>'method'<>'qr' THEN
   SELECT count(*),(array_agg(id))[1] INTO n,gid FROM invitation_groups WHERE event_id=eid AND status='active' AND lower(display_name)=lower(raw);
   IF n<>1 THEN gid:=NULL; END IF;
  END IF;
  IF gid IS NULL THEN RETURN jsonb_build_object('ok',false,'message','QR atau undangan tidak dikenali pada acara ini.','errorCode','NOT_FOUND'); END IF;
  scanner_key:=NULLIF(p->>'deviceKey','')::UUID;
  IF p->>'method'<>'correction' THEN
   IF scanner_key IS NULL THEN RETURN jsonb_build_object('ok',false,'message','Sesi perangkat scanner tidak valid.'); END IF;
   PERFORM 1 FROM events WHERE id=eid FOR UPDATE;
   SELECT COALESCE((limits->>'max_active_scanners')::INTEGER,1) INTO cap FROM plans WHERE plans.code=plan;
   SELECT count(*) INTO n FROM scanner_sessions WHERE event_id=eid AND revoked_at IS NULL AND ended_at IS NULL AND last_seen_at>NOW()-INTERVAL '2 minutes'
    AND NOT (user_id=uid AND device_key=scanner_key);
   IF n>=cap THEN RETURN jsonb_build_object('ok',false,'message','Batas perangkat scanner aktif tercapai.','errorCode','QUOTA_EXCEEDED'); END IF;
   INSERT INTO scanner_sessions(event_id,user_id,session_token_hash,device_key) VALUES(eid,uid,wms_token_hash(wms_token()),scanner_key)
    ON CONFLICT(event_id,user_id,device_key) DO UPDATE SET last_seen_at=NOW(),ended_at=NULL WHERE scanner_sessions.revoked_at IS NULL;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Sesi scanner telah dicabut.'); END IF;
  END IF;
  RETURN perform_atomic_checkin(eid,gid,uid,(p->>'deltaAttendees')::INTEGER,(p->>'method')::checkin_method,(p->>'idempotencyKey')::UUID,p->>'reasonNullable');
 END IF;
 IF p_action IN ('updateEventDetails','updateEventInvitationConfig','addInvitationGroupToEvent','updateInvitationGroup','rotateInvitationGroupToken','purgeEventTestingData','importInvitationGroups') THEN
  IF role_name NOT IN ('platform_admin','workspace_owner','workspace_admin','event_manager','couple') THEN RETURN jsonb_build_object('ok',false,'error','Peran Anda tidak dapat mengubah data ini.','code','FORBIDDEN'); END IF;
  IF ev.status='archived' OR (p_action NOT IN ('updateEventDetails') AND (ev.status='completed' OR ev.event_date<(NOW() AT TIME ZONE ev.timezone)::date)) THEN
   RETURN jsonb_build_object('ok',false,'error','Acara telah selesai dan hanya dapat dibaca.','code','EVENT_READ_ONLY'); END IF;
  IF p_action='updateEventDetails' THEN
   IF p->>'workspaceId' IS NOT NULL AND p->>'workspaceId'<>ev.workspace_id::text THEN RETURN jsonb_build_object('error','Kepemilikan acara tidak dapat dipindahkan.'); END IF;
   UPDATE events SET title=p->>'title',bride_name=p->>'brideName',groom_name=p->>'groomName',event_date=(p->>'eventDate')::date,
    start_time=(p->>'startTime')::time,end_time=(p->>'endTime')::time,timezone=p->>'timezone',venue=p->>'venue',city=p->>'city',address=p->>'address',status=(p->>'status')::event_status,updated_at=NOW() WHERE id=eid;
   PERFORM wms_audit(eid,'event.updated','event',eid::text); RETURN wms_event(eid);
  END IF;
  IF p_action='updateEventInvitationConfig' THEN
   settings_data:=COALESCE(p->'rawConfig','{}');
   -- Sanitize at both the server boundary and the database API boundary.
   settings_data:=jsonb_build_object(
    'themeStyle',CASE WHEN plan='free' OR settings_data->>'themeStyle' NOT IN ('classic_ivory','royal_navy_gold','emerald_botanical','modern_pearl') THEN 'classic_ivory' ELSE settings_data->>'themeStyle' END,
    'customGreeting',LEFT(COALESCE(settings_data->>'customGreeting',''),350),
    'quoteText',CASE WHEN plan<>'free' THEN LEFT(COALESCE(settings_data->>'quoteText',''),500) ELSE '' END,
    'dressCode',CASE WHEN plan<>'free' THEN LEFT(COALESCE(settings_data->>'dressCode',''),100) ELSE '' END,
    'mapsUrl',CASE WHEN plan<>'free' AND settings_data->>'mapsUrl' ~ '^https://(maps\.app\.goo\.gl|maps\.google\.com|www\.google\.com|google\.com)/' THEN LEFT(settings_data->>'mapsUrl',1000) ELSE '' END,
    'digitalGiftBank',CASE WHEN plan='pro_plus' THEN LEFT(COALESCE(settings_data->>'digitalGiftBank',''),500) ELSE '' END,
    'closingMessage',LEFT(COALESCE(settings_data->>'closingMessage',''),350),
    'whiteLabelBrandName',CASE WHEN plan='pro_plus' THEN LEFT(COALESCE(settings_data->>'whiteLabelBrandName',''),80) ELSE '' END);
   UPDATE events SET settings=jsonb_set(settings,'{invitationConfig}',settings_data),updated_at=NOW() WHERE id=eid;
   PERFORM wms_audit(eid,'event.invitation_design_updated','event',eid::text); RETURN wms_event(eid);
  END IF;
  IF p_action='rotateInvitationGroupToken' THEN
   gid:=(p->>'groupId')::UUID;
   token:=wms_token(); qr:=wms_token();
   UPDATE invitations SET public_token=token,qr_token=qr,public_token_hash=wms_token_hash(token),qr_token_hash=wms_token_hash(qr),token_version=token_version+1,updated_at=NOW()
    WHERE event_id=eid AND invitation_group_id=gid;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Undangan tidak ditemukan.'); END IF;
   PERFORM wms_audit(eid,'invitation.token_rotated','invitation_group',gid::text); RETURN jsonb_build_object('ok',true);
  END IF;
  IF p_action='purgeEventTestingData' THEN
   RETURN jsonb_build_object('ok',false,'error','Penghapusan ledger tidak diizinkan. Gunakan koreksi kehadiran yang diaudit.'); END IF;
  IF p_action='importInvitationGroups' THEN
   IF plan='free' THEN RETURN jsonb_build_object('ok',false,'error','Impor tersedia pada paket Pro dan Pro Plus.'); END IF;
   IF jsonb_typeof(p->'rows')<>'array' OR jsonb_array_length(p->'rows') NOT BETWEEN 1 AND 2000 THEN RETURN jsonb_build_object('ok',false,'error','Jumlah baris impor tidak valid.'); END IF;
   PERFORM 1 FROM events WHERE id=eid FOR UPDATE;
   SELECT (limits->>'max_invitation_groups')::INTEGER INTO cap FROM plans WHERE plans.code=plan;
   SELECT count(*) INTO n FROM invitation_groups WHERE event_id=eid AND status='active';
   IF n+jsonb_array_length(p->'rows')>cap THEN RETURN jsonb_build_object('ok',false,'error','Seluruh impor dibatalkan karena melebihi kuota paket.'); END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(p->'rows') r JOIN invitation_groups ig ON ig.event_id=eid AND lower(trim(ig.display_name))=lower(trim(r->>'displayName')))
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p->'rows') r GROUP BY lower(trim(r->>'displayName')) HAVING count(*)>1) THEN
    RETURN jsonb_build_object('ok',false,'error','Terdapat calon duplikat nama. Periksa data sebelum mengimpor kembali; nama yang sama dapat ditambahkan manual bila diperlukan.'); END IF;
   n:=0;
   FOR row_data IN SELECT value FROM jsonb_array_elements(p->'rows') LOOP
    result:=wms_repository('addInvitationGroupToEvent',jsonb_build_array(row_data||jsonb_build_object('userId',uid,'eventId',eid)));
    IF result ? 'error' THEN RAISE EXCEPTION 'IMPORT_FAILED'; END IF;
    n:=n+1;
   END LOOP;
   PERFORM wms_audit(eid,'guests.imported','event',eid::text,jsonb_build_object('count',n));
   RETURN jsonb_build_object('ok',true,'importedCount',n);
  END IF;
  IF p_action IN ('addInvitationGroupToEvent','updateInvitationGroup') THEN
   IF COALESCE(p->>'capacity','')!~'^[0-9]+$' OR (p->>'capacity')::INTEGER NOT BETWEEN 1 AND 20 OR length(trim(p->>'displayName')) NOT BETWEEN 2 AND 160
    OR p->>'type' NOT IN ('individual','couple','family') OR p->>'guestCategory' NOT IN ('regular','vip','vvip') THEN RETURN jsonb_build_object('error','Data tamu tidak valid.','code','VALIDATION_ERROR'); END IF;
   IF p_action='updateInvitationGroup' THEN
    gid:=(p->>'groupId')::UUID;
    SELECT * INTO g FROM invitation_groups WHERE id=gid AND event_id=eid FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Undangan tidak ditemukan.'); END IF;
    SELECT COALESCE(sum(delta_attendees),0) INTO total FROM checkin_entries WHERE invitation_group_id=gid;
    IF (p->>'capacity')::INTEGER<total OR (p->>'capacity')::INTEGER<COALESCE((SELECT attendee_count FROM rsvps WHERE invitation_group_id=gid),0) THEN
     RETURN jsonb_build_object('ok',false,'error','Kapasitas tidak boleh lebih kecil dari jumlah hadir atau RSVP.'); END IF;
    UPDATE invitation_groups SET display_name=trim(p->>'displayName'),phone_optional=LEFT(p->>'phoneOptional',40),type=(p->>'type')::invitation_group_type,
     capacity=(p->>'capacity')::INTEGER,guest_category=(p->>'guestCategory')::guest_category,table_label_optional=LEFT(p->>'tableLabelOptional',80),
     notes_private_optional=LEFT(p->>'notesPrivateOptional',500),allowed_public_display=COALESCE((p->>'allowedPublicDisplay')::BOOLEAN,false),updated_at=NOW() WHERE id=gid;
    PERFORM wms_audit(eid,'guest.updated','invitation_group',gid::text); RETURN jsonb_build_object('ok',true);
   END IF;
   PERFORM 1 FROM events WHERE id=eid FOR UPDATE;
   SELECT (limits->>'max_invitation_groups')::INTEGER INTO cap FROM plans WHERE plans.code=plan;
   SELECT count(*) INTO n FROM invitation_groups WHERE event_id=eid AND status='active';
   IF n>=cap THEN RETURN jsonb_build_object('error','Batas undangan paket tercapai.','code','QUOTA_EXCEEDED'); END IF;
   INSERT INTO invitation_groups(event_id,display_name,phone_optional,type,capacity,guest_category,table_label_optional,notes_private_optional,allowed_public_display,is_test_data)
    VALUES(eid,trim(p->>'displayName'),LEFT(p->>'phoneOptional',40),(p->>'type')::invitation_group_type,(p->>'capacity')::INTEGER,(p->>'guestCategory')::guest_category,
     LEFT(p->>'tableLabelOptional',80),LEFT(p->>'notesPrivateOptional',500),COALESCE((p->>'allowedPublicDisplay')::BOOLEAN,false),false) RETURNING id INTO gid;
   token:=wms_token(); qr:=wms_token();
   INSERT INTO invitations(invitation_group_id,event_id,public_token_hash,qr_token_hash,public_token,qr_token,published_at)
    VALUES(gid,eid,wms_token_hash(token),wms_token_hash(qr),token,qr,NOW());
   PERFORM wms_audit(eid,'guest.created','invitation_group',gid::text);
   RETURN jsonb_build_object('group',wms_guest(gid));
  END IF;
 END IF;
 RETURN jsonb_build_object('ok',false,'error','Operasi ini tidak tersedia.','message','Operasi ini tidak tersedia.');
END $$;

-- Only the narrowly scoped dispatcher is callable. Internal helpers never bypass grants.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.profiles, public.plans TO authenticated;
GRANT UPDATE(display_name,phone_optional) ON public.profiles TO authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wms_repository(TEXT,JSONB) TO anon, authenticated;
-- Clients cannot invoke the old unchecked SECURITY DEFINER check-in function directly.
-- Direct table writes remain forbidden, including self-service licenses and membership changes.
