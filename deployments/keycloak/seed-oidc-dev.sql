-- OIDC dev stack seed script
-- Run automatically by the db-seed container after migrations have been applied.
-- Marks setup as complete (OIDC is pre-configured via env vars, no wizard needed) and
-- pre-provisions the Keycloak admin user (admin@example.com / admin.user) as a TSM admin.
--
-- This script is idempotent: all inserts use ON CONFLICT DO NOTHING / DO UPDATE
-- so re-running against an already-seeded database is safe.

DO $$
DECLARE
    v_user_id                uuid;
    v_org_id                 uuid;
    v_admin_role_template_id uuid;
BEGIN
    ---------------------------------------------------------------------------
    -- 1. Mark setup as complete so the setup wizard is not shown.
    --    OIDC is configured via TSM_AUTH_OIDC_* env vars on the backend.
    --    Nullify the setup_token_hash to permanently disable the setup endpoints.
    ---------------------------------------------------------------------------
    INSERT INTO system_settings (key, value, updated_at)
    VALUES ('setup_completed', 'true', NOW())
    ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW();

    INSERT INTO system_settings (key, value, updated_at)
    VALUES ('setup_token_hash', '', NOW())
    ON CONFLICT (key) DO UPDATE SET value = '', updated_at = NOW();

    ---------------------------------------------------------------------------
    -- 2. Seed the oidc_config row so the backend can serve OIDC discovery
    --    and the admin UI can display the active provider.
    --    Authentication itself is handled via TSM_AUTH_OIDC_* env vars;
    --    client_secret_encrypted is a placeholder (never used for auth here).
    ---------------------------------------------------------------------------
    INSERT INTO oidc_config (
        issuer_url,
        client_id,
        client_secret_encrypted,
        redirect_url,
        scopes,
        is_active
    ) VALUES (
        'http://keycloak:8180/realms/terraform-state-manager',
        'terraform-state-manager',
        'env-var-managed',
        'http://localhost:3000/api/v1/auth/callback',
        'openid,email,profile',
        true
    ) ON CONFLICT DO NOTHING;

    ---------------------------------------------------------------------------
    -- 3. Pre-provision the Keycloak test admin (admin@example.com / admin.user).
    --    The OIDC sub for this user will be linked on first login via email match.
    ---------------------------------------------------------------------------
    INSERT INTO users (email, name, is_active)
    VALUES ('admin@example.com', 'Admin User', true)
    ON CONFLICT (email) DO NOTHING;

    SELECT id INTO v_user_id FROM users WHERE email = 'admin@example.com';

    SELECT id INTO v_org_id FROM organizations WHERE name = 'default';

    SELECT id INTO v_admin_role_template_id FROM role_templates WHERE name = 'admin';

    -- Assign the Keycloak admin user to the default org with admin role.
    INSERT INTO organization_members (organization_id, user_id, role_template_id)
    VALUES (v_org_id, v_user_id, v_admin_role_template_id)
    ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role_template_id = EXCLUDED.role_template_id;

    RAISE NOTICE 'OIDC dev seed: setup marked complete, admin@example.com provisioned as admin.';
END $$;
