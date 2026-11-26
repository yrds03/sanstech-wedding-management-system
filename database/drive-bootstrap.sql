-- Owned by the application process, not by a public HTTP database service.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
 id UUID PRIMARY KEY,
 google_sub TEXT UNIQUE NOT NULL,
 email TEXT NOT NULL,
 email_confirmed_at TIMESTAMPTZ NOT NULL,
 raw_user_meta_data JSONB NOT NULL DEFAULT '{}'
);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID
$$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE TABLE auth.sessions (
 token_hash TEXT PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC,anon,authenticated;
CREATE TABLE public.wms_schema_migrations(name TEXT PRIMARY KEY);
REVOKE ALL ON public.wms_schema_migrations FROM PUBLIC,anon,authenticated;
