import Joi from 'joi';

export const userSchemas = {
  create: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required(),
      username: Joi.string().alphanum().min(3).max(30).required(),
      firstName: Joi.string().min(1).max(50).required(),
      lastName: Joi.string().min(1).max(50).required(),
      password: Joi.string().min(8).max(100).required(),
      role: Joi.string().valid('user', 'admin').default('user'),
    }),
  }),
  
  update: Joi.object({
    body: Joi.object({
      email: Joi.string().email(),
      username: Joi.string().alphanum().min(3).max(30),
      firstName: Joi.string().min(1).max(50),
      lastName: Joi.string().min(1).max(50),
      role: Joi.string().valid('user', 'admin'),
    }).min(1), // At least one field required
    params: Joi.object({
      id: Joi.string().required(),
    }),
  }),
  
  list: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('createdAt', 'updatedAt', 'username', 'email').default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      search: Joi.string().max(100),
    }),
  }),
};