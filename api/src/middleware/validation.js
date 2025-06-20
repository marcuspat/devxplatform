const Joi = require('joi');

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Auth validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().min(2).max(100).optional(),
  avatar_url: Joi.string().uri().optional()
});

// Project validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).required(),
  description: Joi.string().max(500).optional(),
  template_id: Joi.string().uuid().required(),
  settings: Joi.object().optional()
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional(),
  repository_url: Joi.string().uri().optional(),
  deployment_url: Joi.string().uri().optional(),
  status: Joi.string().valid('active', 'archived', 'deploying', 'failed').optional(),
  settings: Joi.object().optional()
});

// Service generation schema
const generateServiceSchema = Joi.object({
  name: Joi.string().min(2).max(50).pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).required(),
  template_id: Joi.string().uuid().required(),
  settings: Joi.object({
    environment: Joi.string().valid('development', 'staging', 'production').default('development'),
    port: Joi.number().port().default(3000),
    database: Joi.object({
      type: Joi.string().valid('postgresql', 'mysql', 'mongodb', 'redis').optional(),
      host: Joi.string().optional(),
      port: Joi.number().port().optional(),
      name: Joi.string().optional()
    }).optional(),
    features: Joi.array().items(Joi.string()).optional(),
    customizations: Joi.object().optional()
  }).optional()
});

// Query parameter validation
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Common query schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(100).optional(),
  sort: Joi.string().valid('created_at', 'updated_at', 'name', 'download_count', 'star_count').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

const templateFiltersSchema = Joi.object({
  category: Joi.string().optional(),
  technology: Joi.string().optional(),
  language: Joi.string().optional(),
  featured: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const projectFiltersSchema = Joi.object({
  status: Joi.string().valid('active', 'archived', 'deploying', 'failed').optional(),
  search: Joi.string().max(100).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

module.exports = {
  validate,
  validateQuery,
  schemas: {
    login: loginSchema,
    register: registerSchema,
    createProject: createProjectSchema,
    updateProject: updateProjectSchema,
    generateService: generateServiceSchema,
    pagination: paginationSchema,
    templateFilters: templateFiltersSchema,
    projectFilters: projectFiltersSchema
  }
};