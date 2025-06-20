const { pool } = require('../../config/database');

class Project {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.description = data.description;
    this.template_id = data.template_id;
    this.user_id = data.user_id;
    this.repository_url = data.repository_url;
    this.deployment_url = data.deployment_url;
    this.status = data.status;
    this.settings = data.settings;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Joined data
    this.template = data.template_name ? {
      id: data.template_id,
      name: data.template_name,
      slug: data.template_slug,
      technology: data.template_technology,
      language: data.template_language,
      framework: data.template_framework
    } : null;
    
    this.user = data.user_username ? {
      id: data.user_id,
      username: data.user_username,
      email: data.user_email,
      full_name: data.user_full_name
    } : null;
  }

  static async findByUserId(userId, filters = {}) {
    let query = `
      SELECT p.*, 
             t.name as template_name, t.slug as template_slug, 
             t.technology as template_technology, t.language as template_language,
             t.framework as template_framework,
             u.username as user_username, u.email as user_email, u.full_name as user_full_name
      FROM devx.projects p
      LEFT JOIN templates.templates t ON p.template_id = t.id
      LEFT JOIN devx.users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `;
    const values = [userId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND p.status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY p.updated_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows.map(row => new Project(row));
  }

  static async findById(id) {
    const query = `
      SELECT p.*, 
             t.name as template_name, t.slug as template_slug, 
             t.technology as template_technology, t.language as template_language,
             t.framework as template_framework,
             u.username as user_username, u.email as user_email, u.full_name as user_full_name
      FROM devx.projects p
      LEFT JOIN templates.templates t ON p.template_id = t.id
      LEFT JOIN devx.users u ON p.user_id = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new Project(result.rows[0]) : null;
  }

  static async findBySlug(userId, slug) {
    const query = `
      SELECT p.*, 
             t.name as template_name, t.slug as template_slug, 
             t.technology as template_technology, t.language as template_language,
             t.framework as template_framework,
             u.username as user_username, u.email as user_email, u.full_name as user_full_name
      FROM devx.projects p
      LEFT JOIN templates.templates t ON p.template_id = t.id
      LEFT JOIN devx.users u ON p.user_id = u.id
      WHERE p.user_id = $1 AND p.slug = $2
    `;
    const result = await pool.query(query, [userId, slug]);
    return result.rows[0] ? new Project(result.rows[0]) : null;
  }

  static async create(projectData) {
    const query = `
      INSERT INTO devx.projects (name, slug, description, template_id, user_id, repository_url, deployment_url, status, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      projectData.name,
      projectData.slug,
      projectData.description || null,
      projectData.template_id,
      projectData.user_id,
      projectData.repository_url || null,
      projectData.deployment_url || null,
      projectData.status || 'active',
      JSON.stringify(projectData.settings || {})
    ];
    
    const result = await pool.query(query, values);
    return new Project(result.rows[0]);
  }

  async update(updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        if (key === 'settings' && typeof value === 'object') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this;
    }

    values.push(this.id);
    const query = `
      UPDATE devx.projects 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const updatedProject = new Project(result.rows[0]);
    Object.assign(this, updatedProject);
    return this;
  }

  async delete() {
    const query = 'DELETE FROM devx.projects WHERE id = $1';
    await pool.query(query, [this.id]);
    return true;
  }

  static async getStatsByUserId(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_projects,
        COUNT(CASE WHEN status = 'deploying' THEN 1 END) as deploying_projects,
        COUNT(CASE WHEN deployment_url IS NOT NULL THEN 1 END) as deployed_projects
      FROM devx.projects 
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async getRecentActivity(userId, limit = 10) {
    const query = `
      SELECT 
        p.name as project_name,
        p.slug as project_slug,
        p.status,
        p.updated_at,
        t.name as template_name,
        t.technology as template_technology
      FROM devx.projects p
      LEFT JOIN templates.templates t ON p.template_id = t.id
      WHERE p.user_id = $1
      ORDER BY p.updated_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      template_id: this.template_id,
      template: this.template,
      user_id: this.user_id,
      user: this.user,
      repository_url: this.repository_url,
      deployment_url: this.deployment_url,
      status: this.status,
      settings: this.settings,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Project;