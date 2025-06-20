const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.full_name = data.full_name;
    this.avatar_url = data.avatar_url;
    this.is_active = data.is_active;
    this.is_admin = data.is_admin;
    this.email_verified = data.email_verified;
    this.email_verification_token = data.email_verification_token;
    this.last_login_at = data.last_login_at;
    this.login_attempts = data.login_attempts;
    this.locked_until = data.locked_until;
    this.two_factor_enabled = data.two_factor_enabled;
    this.two_factor_secret = data.two_factor_secret;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findById(id) {
    const query = 'SELECT * FROM devx.users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM devx.users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM devx.users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    
    const query = `
      INSERT INTO devx.users (
        email, username, password_hash, full_name, avatar_url, 
        is_active, is_admin, email_verification_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.username,
      hashedPassword,
      userData.full_name || null,
      userData.avatar_url || null,
      userData.is_active !== undefined ? userData.is_active : true,
      userData.is_admin !== undefined ? userData.is_admin : false,
      emailVerificationToken
    ];
    
    const result = await pool.query(query, values);
    const user = new User(result.rows[0]);

    // Assign default role
    await user.assignRole('developer');
    
    return user;
  }

  static async authenticate(email, password) {
    const user = await User.findByEmail(email);
    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('Account is temporarily locked due to too many failed login attempts');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      await user.incrementLoginAttempts();
      return null;
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await user.updateLastLogin();
    
    return user;
  }

  async incrementLoginAttempts() {
    const maxAttempts = 5;
    const lockoutDuration = 30 * 60 * 1000; // 30 minutes
    
    const newAttempts = (this.login_attempts || 0) + 1;
    const lockedUntil = newAttempts >= maxAttempts ? 
      new Date(Date.now() + lockoutDuration) : null;

    const query = `
      UPDATE devx.users 
      SET login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    
    await pool.query(query, [newAttempts, lockedUntil, this.id]);
    this.login_attempts = newAttempts;
    this.locked_until = lockedUntil;
  }

  async resetLoginAttempts() {
    const query = `
      UPDATE devx.users 
      SET login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(query, [this.id]);
    this.login_attempts = 0;
    this.locked_until = null;
  }

  async updateLastLogin() {
    const query = `
      UPDATE devx.users 
      SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(query, [this.id]);
    this.last_login_at = new Date();
  }

  async getRoles() {
    const query = `
      SELECT r.* FROM devx.roles r
      JOIN devx.user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `;
    
    const result = await pool.query(query, [this.id]);
    return result.rows;
  }

  async getPermissions() {
    const query = `
      SELECT devx.get_user_permissions($1) as permissions
    `;
    
    const result = await pool.query(query, [this.id]);
    return result.rows[0]?.permissions || [];
  }

  async hasPermission(permission) {
    const query = `
      SELECT devx.user_has_permission($1, $2) as has_permission
    `;
    
    const result = await pool.query(query, [this.id, permission]);
    return result.rows[0]?.has_permission || false;
  }

  async assignRole(roleName, assignedBy = null, expiresAt = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get role ID
      const roleQuery = 'SELECT id FROM devx.roles WHERE name = $1';
      const roleResult = await client.query(roleQuery, [roleName]);
      
      if (roleResult.rows.length === 0) {
        throw new Error(`Role ${roleName} not found`);
      }

      const roleId = roleResult.rows[0].id;

      // Assign role
      const assignQuery = `
        INSERT INTO devx.user_roles (user_id, role_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, role_id) DO UPDATE
        SET assigned_by = $3, expires_at = $4, assigned_at = CURRENT_TIMESTAMP
      `;

      await client.query(assignQuery, [this.id, roleId, assignedBy, expiresAt]);
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeRole(roleName) {
    const query = `
      DELETE FROM devx.user_roles
      WHERE user_id = $1 AND role_id = (
        SELECT id FROM devx.roles WHERE name = $2
      )
    `;
    
    await pool.query(query, [this.id, roleName]);
    return true;
  }

  async createRefreshToken(userAgent = null, ipAddress = null) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

    const query = `
      INSERT INTO devx.refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const result = await pool.query(query, [
      this.id, tokenHash, expiresAt, userAgent, ipAddress
    ]);

    return { token, tokenId: result.rows[0].id };
  }

  async validateRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const query = `
      SELECT * FROM devx.refresh_tokens
      WHERE token_hash = $1 AND user_id = $2 
      AND expires_at > CURRENT_TIMESTAMP 
      AND revoked_at IS NULL
    `;

    const result = await pool.query(query, [tokenHash, this.id]);
    return result.rows[0] || null;
  }

  async revokeRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const query = `
      UPDATE devx.refresh_tokens 
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1 AND user_id = $2
    `;

    await pool.query(query, [tokenHash, this.id]);
    return true;
  }

  async revokeAllRefreshTokens() {
    const query = `
      UPDATE devx.refresh_tokens 
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND revoked_at IS NULL
    `;

    await pool.query(query, [this.id]);
    return true;
  }

  async createPasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

    const query = `
      INSERT INTO devx.password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    await pool.query(query, [this.id, tokenHash, expiresAt]);
    return token;
  }

  static async validatePasswordResetToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const query = `
      SELECT prt.*, u.* FROM devx.password_reset_tokens prt
      JOIN devx.users u ON prt.user_id = u.id
      WHERE prt.token_hash = $1 
      AND prt.expires_at > CURRENT_TIMESTAMP 
      AND prt.used_at IS NULL
    `;

    const result = await pool.query(query, [tokenHash]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      user: new User(row),
      tokenId: row.id
    };
  }

  static async markPasswordResetTokenUsed(tokenId) {
    const query = `
      UPDATE devx.password_reset_tokens 
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pool.query(query, [tokenId]);
  }

  async verifyEmail() {
    const query = `
      UPDATE devx.users 
      SET email_verified = true, email_verification_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pool.query(query, [this.id]);
    this.email_verified = true;
    this.email_verification_token = null;
  }

  async update(updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'password') {
        fields.push(`password_hash = $${paramIndex}`);
        values.push(await bcrypt.hash(value, 12));
      } else if (key !== 'id' && key !== 'created_at' && key !== 'password_hash') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    if (fields.length === 0) {
      return this;
    }

    values.push(this.id);
    const query = `
      UPDATE devx.users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const updatedUser = new User(result.rows[0]);
    Object.assign(this, updatedUser);
    return this;
  }

  async delete() {
    const query = 'UPDATE devx.users SET is_active = false WHERE id = $1';
    await pool.query(query, [this.id]);
    this.is_active = false;
    return true;
  }

  async logActivity(action, resourceType = null, resourceId = null, details = {}, ipAddress = null, userAgent = null) {
    const query = `
      INSERT INTO devx.activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      this.id, action, resourceType, resourceId, 
      JSON.stringify(details), ipAddress, userAgent
    ]);
  }

  toJSON() {
    const { 
      password_hash, 
      email_verification_token, 
      two_factor_secret,
      ...user 
    } = this;
    return user;
  }

  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      full_name: this.full_name,
      avatar_url: this.avatar_url,
      created_at: this.created_at
    };
  }
}

module.exports = User;