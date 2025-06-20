-- Authentication enhancements for DevX Platform
SET search_path TO devx, public;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET,
    INDEX idx_refresh_tokens_token_hash (token_hash),
    INDEX idx_refresh_tokens_user_id (user_id),
    INDEX idx_refresh_tokens_expires_at (expires_at)
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    INDEX idx_password_reset_tokens_token_hash (token_hash),
    INDEX idx_password_reset_tokens_user_id (user_id)
);

-- Add additional columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Create updated_at triggers
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('admin', 'System Administrator - Full access to all resources', 
 ARRAY[
   'users.create', 'users.read', 'users.update', 'users.delete',
   'templates.create', 'templates.read', 'templates.update', 'templates.delete', 'templates.publish',
   'projects.create', 'projects.read', 'projects.update', 'projects.delete',
   'roles.create', 'roles.read', 'roles.update', 'roles.delete',
   'system.admin', 'analytics.read'
 ], true),

('developer', 'Developer - Can create and manage own projects and templates',
 ARRAY[
   'templates.create', 'templates.read', 'templates.update',
   'projects.create', 'projects.read', 'projects.update', 'projects.delete',
   'profile.update'
 ], true),

('viewer', 'Viewer - Read-only access to public resources',
 ARRAY[
   'templates.read',
   'projects.read',
   'profile.update'
 ], true);

-- Assign roles to existing users
DO $$
DECLARE
    admin_user_id UUID;
    demo_user_id UUID;
    admin_role_id UUID;
    developer_role_id UUID;
    viewer_role_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO demo_user_id FROM users WHERE username = 'demo';
    
    -- Get role IDs
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO developer_role_id FROM roles WHERE name = 'developer';
    SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer';
    
    -- Assign admin role to admin user
    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, assigned_by) 
        VALUES (admin_user_id, admin_role_id, admin_user_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
    
    -- Assign developer role to demo user
    IF demo_user_id IS NOT NULL AND developer_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, assigned_by) 
        VALUES (demo_user_id, developer_role_id, admin_user_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    permissions TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT unnest_permissions.permission)
    INTO permissions
    FROM (
        SELECT unnest(r.permissions) as permission
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid 
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    ) unnest_permissions;
    
    RETURN COALESCE(permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Create function to check user permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN permission_name = ANY(get_user_permissions(user_uuid));
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR revoked_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired/used password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR used_at IS NOT NULL;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON roles TO devx;
GRANT ALL PRIVILEGES ON user_roles TO devx;
GRANT ALL PRIVILEGES ON refresh_tokens TO devx;
GRANT ALL PRIVILEGES ON password_reset_tokens TO devx;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA devx TO devx;