import type { ServiceConfig } from '../types/index.js';
import { ValidationError } from '../types/index.js';
import { serviceConfigSchema } from './schemas.js';
import { createValidator } from '../utils/validation-utils.js';

const serviceConfigValidator = createValidator(serviceConfigSchema);

export function validateServiceConfig(config: unknown): ServiceConfig {
  try {
    return serviceConfigValidator.validate(config);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      'Invalid service configuration',
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}

export function validatePartialServiceConfig(config: unknown): Partial<ServiceConfig> {
  try {
    return serviceConfigValidator.validatePartial(config);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      'Invalid partial service configuration',
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}

export function isValidServiceConfig(config: unknown): boolean {
  return serviceConfigValidator.isValid(config);
}

export function getServiceConfigErrors(config: unknown): string[] {
  const errors = serviceConfigValidator.getErrors(config);
  if (!errors) return [];
  
  return errors.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}