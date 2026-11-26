-- An outer guard keeps all mutations in one lock order: event -> invitation group.
-- Existing deployments apply this migration without rewriting earlier migration history.
BEGIN;
ALTER FUNCTION public.wms_repository(TEXT,JSONB) RENAME TO wms_repository_core;
REVOKE ALL ON FUNCTION public.wms_repository_core(TEXT,JSONB) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.wms_repository(p_action TEXT,p_args JSONB DEFAULT '[]') RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 p JSONB; uid UUID:=auth.uid(); eid UUID; gid UUID; role_name TEXT; result JSONB;
 raw TEXT; n NUMERIC; public_action BOOLEAN; event_arg TEXT; item JSONB;
 invalid JSONB:=jsonb_build_object('ok',false,'error','Data permintaan tidak valid.','message','Data permintaan tidak valid.','code','VALIDATION_ERROR','errorCode','VALIDATION_ERROR');
 uuid_pattern CONSTANT TEXT:='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
 IF p_action IS NULL OR jsonb_typeof(p_args) IS DISTINCT FROM 'array' OR jsonb_array_length(p_args)>3 THEN RETURN invalid; END IF;
 p:=p_args->0;
 public_action:=p_action IN ('getPricingSettings','getPublicInvitationByToken','submitPublicRsvpByToken','peekMemberInviteByToken','pairDisplay','getDisplayScreenState');
 IF NOT public_action AND (uid IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=uid AND status='active')) THEN
  RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='42501'; END IF;
 IF p_action IN ('getUserProfileById','getAuthorizedWorkspacesForUser','getWorkspaceIfAuthorized','getAuthorizedEventsForWorkspace',
  'getAllAuthorizedEventsForUser','getEventIfAuthorized','listInvitationGroupsForEvent','listCheckinLedgerForEvent','listMemberInvitesForEvent','listAuditLogsForEvent')
  AND (jsonb_typeof(p) IS DISTINCT FROM 'string' OR p_args->>0 IS DISTINCT FROM uid::text) THEN
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF p_action IN ('redeemMemberInviteToken','loginInvitedMemberByEmail','resolveMemberSimulationTarget','resetAllDataToZero','purgeEventTestingData') THEN
  RETURN jsonb_build_object('ok',false,'error','Operasi simulasi tidak tersedia di produksi.','message','Operasi simulasi tidak tersedia di produksi.','code','FORBIDDEN'); END IF;
 IF NOT public_action AND jsonb_typeof(p)='object' THEN
  IF (p ? 'userId' AND p->'userId' IS DISTINCT FROM to_jsonb(uid::text)) OR
     (p ? 'actorUserId' AND p->'actorUserId' IS DISTINCT FROM to_jsonb(uid::text)) THEN
   RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_action IN ('getPublicInvitationByToken','submitPublicRsvpByToken','peekMemberInviteByToken','getDisplayScreenState') THEN
  raw:=CASE WHEN p_action='submitPublicRsvpByToken' THEN p->>'rawToken' ELSE p_args->>0 END;
  IF raw IS NULL OR length(raw) NOT BETWEEN 24 AND 256 OR raw!~'^[A-Za-z0-9_-]+$' THEN
   RETURN CASE WHEN p_action='submitPublicRsvpByToken' THEN invalid ELSE NULL END; END IF;
 END IF;
 IF p_action='pairDisplay' AND COALESCE(p->>'code','')!~'^[0-9]{6}$' THEN RETURN invalid; END IF;
 IF p_action='submitPublicRsvpByToken' THEN
  IF jsonb_typeof(p->'attendeeCount') IS DISTINCT FROM 'number' OR COALESCE(p->>'attendeeCount','')!~'^[0-9]{1,2}$'
   OR COALESCE(p->>'rsvpStatus','') NOT IN ('attending','declined','unsure') THEN RETURN invalid; END IF;
  SELECT i.event_id,i.invitation_group_id INTO eid,gid FROM invitations i WHERE i.public_token_hash=wms_token_hash(raw) AND i.revoked_at IS NULL;
 ELSIF p_action='acceptMemberInviteByToken' THEN
  IF COALESCE(length(p->>'rawToken'),0) NOT BETWEEN 24 AND 256 OR (p->>'rawToken')!~'^[A-Za-z0-9_-]+$' THEN RETURN invalid; END IF;
  SELECT event_id INTO eid FROM member_invites WHERE token_hash=wms_token_hash(p->>'rawToken');
 ELSIF p_action='pairDisplay' THEN
  SELECT event_id INTO eid FROM display_sessions WHERE pairing_code_hash=wms_token_hash(p->>'code');
 ELSIF p_action='getDisplayScreenState' THEN
  SELECT event_id INTO eid FROM display_sessions WHERE auth_token_hash=wms_token_hash(raw);
 ELSIF p_action='getEventTvPairingCode' THEN event_arg:=p_args->>0;
 ELSIF jsonb_typeof(p)='object' THEN event_arg:=p->>'eventId';
 ELSIF p_action IN ('getEventIfAuthorized','listInvitationGroupsForEvent','listCheckinLedgerForEvent','listMemberInvitesForEvent','listAuditLogsForEvent') THEN event_arg:=p_args->>1;
 END IF;
 IF event_arg IS NOT NULL THEN
  IF event_arg!~*uuid_pattern THEN
   RETURN CASE WHEN p_action IN ('getEventIfAuthorized','getEventTvPairingCode','listInvitationGroupsForEvent','listCheckinLedgerForEvent','listMemberInvitesForEvent','listAuditLogsForEvent') THEN NULL ELSE invalid END;
  END IF;
  eid:=event_arg::UUID;
 END IF;
 IF p_action IN ('getWorkspaceIfAuthorized','getAuthorizedEventsForWorkspace') AND COALESCE(p_args->>1,'')!~*uuid_pattern THEN RETURN NULL; END IF;
 IF p_action='createWorkspaceForUser' AND (COALESCE(p->>'idempotencyKey','')!~*uuid_pattern OR
  COALESCE(length(trim(p->>'name')),0) NOT BETWEEN 2 AND 80 OR COALESCE(p->>'slug','')!~'^[a-z0-9-]{2,48}$' OR COALESCE(p->>'type','') NOT IN ('wo','personal')) THEN RETURN invalid; END IF;
 IF p_action IN ('createEventInWorkspace','updateEventDetails') THEN
  IF COALESCE(p->>'workspaceId','')!~*uuid_pattern OR COALESCE(length(trim(p->>'title')),0) NOT BETWEEN 3 AND 100
   OR COALESCE(length(trim(p->>'brideName')),0) NOT BETWEEN 1 AND 80 OR COALESCE(length(trim(p->>'groomName')),0) NOT BETWEEN 1 AND 80
   OR COALESCE(length(trim(p->>'venue')),0) NOT BETWEEN 2 AND 120 OR COALESCE(length(trim(p->>'city')),0) NOT BETWEEN 2 AND 60
   OR COALESCE(p->>'timezone','') NOT IN ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura')
   OR COALESCE(p->>'startTime','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' OR COALESCE(p->>'endTime','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'
   OR p->>'endTime'<=p->>'startTime' THEN RETURN invalid; END IF;
 END IF;
 IF p_action IN ('addInvitationGroupToEvent','updateInvitationGroup') THEN
  IF COALESCE(length(trim(p->>'displayName')),0) NOT BETWEEN 2 AND 160 OR jsonb_typeof(p->'capacity') IS DISTINCT FROM 'number'
   OR COALESCE(p->>'capacity','')!~'^([1-9]|1[0-9]|20)$' OR COALESCE(p->>'type','') NOT IN ('individual','couple','family')
   OR COALESCE(p->>'guestCategory','') NOT IN ('regular','vip','vvip') THEN RETURN invalid; END IF;
 END IF;
 IF p_action='recordEventCheckinOrCorrection' THEN
  IF COALESCE(p->>'idempotencyKey','')!~*uuid_pattern OR jsonb_typeof(p->'deltaAttendees') IS DISTINCT FROM 'number'
   OR COALESCE(p->>'deltaAttendees','')!~'^-?([1-9]|1[0-9]|20)$' OR COALESCE(p->>'method','') NOT IN ('qr','manual','correction')
   OR COALESCE(length(trim(p->>'groupIdOrQrToken')),0) NOT BETWEEN 1 AND 256
   OR (p->>'method'<>'correction' AND (p->>'deltaAttendees')::INTEGER<0)
   OR (p->>'method'='correction' AND COALESCE(length(trim(p->>'reasonNullable')),0) NOT BETWEEN 5 AND 250)
   OR (p->>'method'<>'correction' AND COALESCE(p->>'deviceKey','')!~*uuid_pattern) THEN RETURN invalid; END IF;
 END IF;
 IF p_action='importInvitationGroups' AND (jsonb_typeof(p->'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'rows') NOT BETWEEN 1 AND 2000) THEN RETURN invalid; END IF;
 IF p_action='updatePricingSettings' THEN
  IF jsonb_typeof(p->'addOnsPrices') IS DISTINCT FROM 'object' THEN RETURN invalid; END IF;
  FOR item IN SELECT value FROM jsonb_each(p->'addOnsPrices') LOOP
   IF jsonb_typeof(item) IS DISTINCT FROM 'number' OR (item#>>'{}')!~'^[0-9]{1,10}$' OR (item#>>'{}')::NUMERIC>2000000000 THEN RETURN invalid; END IF;
  END LOOP;
 END IF;
 -- One event lock also serializes token rotation, membership revocation and RSVP with check-in.
 IF eid IS NOT NULL AND p_action IN ('submitPublicRsvpByToken','acceptMemberInviteByToken','pairDisplay','getDisplayScreenState','getEventTvPairingCode',
  'createEventMemberInvite','revokeEventMemberInvite','updateEventDetails','updateEventPlanByAdmin','updateEventInvitationConfig','addInvitationGroupToEvent',
  'updateInvitationGroup','rotateInvitationGroupToken','importInvitationGroups','recordEventCheckinOrCorrection','revokeDisplaySessions','revokeScannerSession','ackVipNotification') THEN
  IF NOT public_action AND p_action<>'acceptMemberInviteByToken' AND wms_role(eid) IS NULL THEN
   RETURN jsonb_build_object('ok',false,'error','Acara tidak ditemukan atau akses ditolak.','message','Acara tidak ditemukan atau akses ditolak.','code','FORBIDDEN'); END IF;
  PERFORM 1 FROM events WHERE id=eid FOR UPDATE;
 END IF;
 IF gid IS NOT NULL AND p_action='submitPublicRsvpByToken' THEN PERFORM 1 FROM invitation_groups WHERE id=gid FOR UPDATE; END IF;
 IF eid IS NOT NULL AND p_action IN ('addInvitationGroupToEvent','updateInvitationGroup','rotateInvitationGroupToken','importInvitationGroups','updateEventInvitationConfig','recordEventCheckinOrCorrection') THEN
  IF (wms_event(eid)->>'licenseStatus') IS DISTINCT FROM 'active' THEN
   RETURN jsonb_build_object('ok',false,'error','Lisensi acara tidak aktif.','message','Lisensi acara tidak aktif.','code','FORBIDDEN','errorCode','FORBIDDEN'); END IF;
 END IF;
 IF p_action='recordEventCheckinOrCorrection' AND EXISTS(SELECT 1 FROM checkin_entries WHERE event_id=eid AND idempotency_key=(p->>'idempotencyKey')::UUID AND actor_user_id<>uid) THEN
  RETURN jsonb_build_object('ok',false,'message','Kunci permintaan telah digunakan oleh transaksi lain.','errorCode','IDEMPOTENCY_CONFLICT'); END IF;
 IF p_action='getDisplayScreenState' THEN
  IF NOT EXISTS(SELECT 1 FROM events WHERE id=eid AND status IN ('published','live')) THEN RETURN NULL; END IF;
  UPDATE display_events d SET state='expired' WHERE d.event_id=eid AND d.state IN ('queued','shown') AND
   COALESCE((SELECT sum(delta_attendees) FROM checkin_entries WHERE invitation_group_id=d.invitation_group_id),0)<=0;
 END IF;
 result:=wms_repository_core(p_action,p_args);
 IF p_action='updateEventInvitationConfig' AND result->>'id'=eid::TEXT THEN
  raw:=CASE WHEN (wms_event(eid)->>'planCode') IN ('pro','pro_plus') THEN wms_safe_map_url(p->'rawConfig'->>'mapsUrl') ELSE '' END;
  UPDATE events SET settings=jsonb_set(settings,'{invitationConfig,mapsUrl}',to_jsonb(raw)) WHERE id=eid;
  result:=wms_event(eid);
 END IF;
 IF p_action='submitPublicRsvpByToken' AND result IS NULL THEN RETURN invalid; END IF;
 role_name:=wms_role(eid);
 IF p_action='listCheckinLedgerForEvent' AND role_name IN ('viewer','usher') THEN RETURN '[]'::JSONB; END IF;
 IF p_action='listCheckinLedgerForEvent' AND role_name='receptionist' THEN
  SELECT COALESCE(jsonb_agg(value||jsonb_build_object('reasonNullable',NULL)),'[]') INTO result FROM jsonb_array_elements(COALESCE(result,'[]'));
 END IF;
 IF p_action='listInvitationGroupsForEvent' AND role_name='usher' THEN
  SELECT COALESCE(jsonb_agg(value-'qrTokenPreview'-'rsvpNote'-'rsvpStatus'-'rsvpCount'),'[]') INTO result FROM jsonb_array_elements(COALESCE(result,'[]'));
 END IF;
 IF p_action='recordEventCheckinOrCorrection' AND role_name='receptionist' AND result ? 'group' THEN
  result:=jsonb_set(result,'{group}',(result->'group')-'phoneOptional'-'notesPrivateOptional'-'publicTokenPreview'-'rsvpNote');
 END IF;
 RETURN result;
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range
 OR not_null_violation OR check_violation OR invalid_parameter_value OR foreign_key_violation THEN
 RETURN invalid;
END $$;
REVOKE ALL ON FUNCTION public.wms_repository(TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wms_repository(TEXT,JSONB) TO anon,authenticated;

CREATE FUNCTION public.wms_safe_map_url(raw TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN length(trim(raw))<=500 AND raw!~'[[:cntrl:]]' AND
  raw!~*'[?&](url|continue|redirect|redirect_uri|next)=' AND
  raw~'^https://(maps\.app\.goo\.gl/|maps\.google\.com/|(www\.)?google\.com/maps(/|\?|$)|goo\.gl/maps/|(www\.|ul\.)?waze\.com/(ul|live-map)(/|\?|$))'
 THEN trim(raw) ELSE '' END;
$$;
REVOKE ALL ON FUNCTION public.wms_safe_map_url(TEXT) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.wms_new_profile() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO profiles(user_id,display_name) VALUES(NEW.id,
  CASE WHEN length(trim(NEW.raw_user_meta_data->>'display_name'))>=2 THEN LEFT(trim(NEW.raw_user_meta_data->>'display_name'),80) ELSE 'Pengguna SANSTECH' END);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wms_new_profile() FROM PUBLIC,anon,authenticated;
-- Explicitly place pg_temp last: temporary tables must never shadow authorization tables.
DO $$ DECLARE fn REGPROCEDURE; BEGIN
 FOR fn IN SELECT p.oid::REGPROCEDURE FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef AND
   (p.proname LIKE 'wms_%' OR p.proname IN ('perform_atomic_checkin','has_workspace_access','has_workspace_admin_access','has_event_access','has_event_manage_access'))
 LOOP EXECUTE format('ALTER FUNCTION %s SET search_path=public,pg_temp',fn); END LOOP;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
COMMIT;
