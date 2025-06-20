const { pool } = require('../../config/database');

class Template {
  constructor(data) {
    this.id = data.id;
    this.slug = data.slug;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.technology = data.technology;
    this.framework = data.framework;
    this.language = data.language;
    this.features = data.features;
    this.tags = data.tags;
    this.config = data.config;
    this.readme_template = data.readme_template;
    this.is_featured = data.is_featured;
    this.is_popular = data.is_popular;
    this.rating = data.rating;
    this.downloads = data.downloads;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM devx.templates WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Add filters
    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.technology) {
      paramCount++;
      query += ` AND technology = $${paramCount}`;
      params.push(filters.technology);
    }

    if (filters.framework) {
      paramCount++;
      query += ` AND framework = $${paramCount}`;
      params.push(filters.framework);
    }

    if (filters.language) {
      paramCount++;
      query += ` AND language = $${paramCount}`;
      params.push(filters.language);
    }

    if (filters.featured !== undefined) {
      paramCount++;
      query += ` AND is_featured = $${paramCount}`;
      params.push(filters.featured);
    }

    if (filters.popular !== undefined) {
      paramCount++;
      query += ` AND is_popular = $${paramCount}`;
      params.push(filters.popular);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR tags::text ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    // Add sorting
    const sortBy = filters.sortBy || 'rating';
    const sortOrder = filters.sortOrder || 'DESC';
    const validSortColumns = ['name', 'rating', 'downloads', 'created_at', 'updated_at'];
    
    if (validSortColumns.includes(sortBy)) {
      query += ` ORDER BY ${sortBy} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    } else {
      query += ' ORDER BY rating DESC, downloads DESC';
    }

    // Add pagination
    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => new Template(row));
  }

  static async findBySlug(slug) {
    const query = 'SELECT * FROM devx.templates WHERE slug = $1';
    const result = await pool.query(query, [slug]);
    return result.rows[0] ? new Template(result.rows[0]) : null;
  }

  static async findFeatured() {
    const query = 'SELECT * FROM devx.templates WHERE is_featured = true ORDER BY rating DESC, downloads DESC LIMIT 6';
    const result = await pool.query(query);
    return result.rows.map(row => new Template(row));
  }

  static async getFeatured() {
    return this.findFeatured();
  }

  static async findPopular() {
    const query = 'SELECT * FROM devx.templates WHERE is_popular = true ORDER BY downloads DESC, rating DESC LIMIT 10';
    const result = await pool.query(query);
    return result.rows.map(row => new Template(row));
  }

  static async getPopular(limit = 10) {
    const query = 'SELECT * FROM devx.templates WHERE is_popular = true ORDER BY downloads DESC, rating DESC LIMIT $1';
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => new Template(row));
  }

  static async getCategories() {
    const query = 'SELECT DISTINCT category, COUNT(*) as count FROM devx.templates GROUP BY category ORDER BY count DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTechnologies() {
    const query = 'SELECT DISTINCT technology, COUNT(*) as count FROM devx.templates WHERE technology IS NOT NULL GROUP BY technology ORDER BY count DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getFrameworks() {
    const query = 'SELECT DISTINCT framework, COUNT(*) as count FROM devx.templates WHERE framework IS NOT NULL GROUP BY framework ORDER BY count DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getLanguages() {
    const query = 'SELECT DISTINCT language, COUNT(*) as count FROM devx.templates WHERE language IS NOT NULL GROUP BY language ORDER BY count DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async incrementDownloads(slug) {
    const query = 'UPDATE devx.templates SET downloads = downloads + 1 WHERE slug = $1 RETURNING *';
    const result = await pool.query(query, [slug]);
    return result.rows[0] ? new Template(result.rows[0]) : null;
  }

  static async incrementDownloadCount(id) {
    const query = 'UPDATE devx.templates SET downloads = downloads + 1 WHERE id = $1 RETURNING downloads';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? result.rows[0].downloads : null;
  }

  static async incrementStarCount(id) {
    // Since we don't have a stars column, we'll increment rating slightly
    const query = 'UPDATE devx.templates SET rating = LEAST(rating + 0.1, 5.0) WHERE id = $1 RETURNING rating';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? result.rows[0].rating : null;
  }

  static async getStats() {
    const query = 'SELECT * FROM devx.template_stats ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query(query);
    return result.rows[0] || {
      total_count: 0,
      featured_count: 0,
      popular_count: 0
    };
  }

  toJSON() {
    return {
      id: this.id,
      slug: this.slug,
      name: this.name,
      description: this.description,
      category: this.category,
      technology: this.technology,
      framework: this.framework,
      language: this.language,
      features: this.features,
      tags: this.tags,
      icon: this.getIcon(),
      rating: parseFloat(this.rating),
      downloads: this.downloads,
      lastUpdated: this.updated_at,
      resources: this.config?.resources || {}
    };
  }

  getIcon() {
    // Return icon based on technology/framework
    const iconMap = {
      'Node.js': '🟢',
      'Python': '🐍',
      'Go': '🔵',
      'React': '⚛️',
      'Vue.js': '💚',
      'Next.js': '▲',
      'FastAPI': '⚡',
      'Express': '🚂',
      'Django': '🎸',
      'Gin': '🍸',
      'gRPC': '🔌',
      'Kubernetes': '☸️',
      'Terraform': '🏗️',
      'Helm': '⎈',
      'Docker': '🐳',
      'Jenkins': '🤖',
      'GitHub Actions': '🐙',
      'Ansible': '🔧',
      'AWS': '☁️',
      'GCP': '🌐',
      'PostgreSQL': '🐘',
      'Kafka': '📨',
      'Machine Learning': '🤖'
    };

    return iconMap[this.technology] || iconMap[this.framework] || '📦';
  }

  async getFullPath() {
    // Return a template path based on the slug
    const path = require('path');
    const templateBasePath = path.join(__dirname, '..', '..', '..', 'templates');
    return path.join(templateBasePath, this.category, this.slug);
  }
}

module.exports = Template;