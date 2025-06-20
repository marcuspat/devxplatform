import { z } from 'zod';

import type { ValidationError } from '../types/index.js';

export function createValidator<T>(schema: z.ZodSchema<T>) {
  return {
    validate(data: unknown): T {
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            'Validation failed',
            { errors: error.errors },
          );
        }
        throw error;
      }
    },
    
    validatePartial(data: unknown): Partial<T> {
      try {
        return schema.partial().parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            'Partial validation failed',
            { errors: error.errors },
          );
        }
        throw error;
      }
    },
    
    isValid(data: unknown): boolean {
      return schema.safeParse(data).success;
    },
    
    getErrors(data: unknown): z.ZodError | null {
      const result = schema.safeParse(data);
      return result.success ? null : result.error;
    },
  };
}

export function combineSchemas<T, U>(
  schema1: z.ZodSchema<T>,
  schema2: z.ZodSchema<U>,
): z.ZodSchema<T & U> {
  return z.intersection(schema1, schema2) as z.ZodSchema<T & U>;
}

export function createEnumValidator<T extends string>(
  values: readonly T[],
  errorMessage?: string,
): z.ZodEnum<[T, ...T[]]> {
  return z.enum(values as [T, ...T[]], {
    errorMap: () => ({ message: errorMessage || `Must be one of: ${values.join(', ')}` }),
  });
}

export function createArrayValidator<T>(
  itemSchema: z.ZodSchema<T>,
  options?: {
    minLength?: number;
    maxLength?: number;
    unique?: boolean;
  },
): z.ZodArray<z.ZodSchema<T>> {
  let schema = z.array(itemSchema);
  
  if (options?.minLength !== undefined) {
    schema = schema.min(options.minLength);
  }
  
  if (options?.maxLength !== undefined) {
    schema = schema.max(options.maxLength);
  }
  
  if (options?.unique) {
    schema = schema.refine(
      (items) => new Set(items).size === items.length,
      { message: 'Array must contain unique values' },
    );
  }
  
  return schema;
}

export function createRecordValidator<T>(
  valueSchema: z.ZodSchema<T>,
  keySchema?: z.ZodSchema<string>,
): z.ZodRecord<z.ZodString, z.ZodSchema<T>> {
  if (keySchema) {
    return z.record(keySchema, valueSchema);
  }
  return z.record(valueSchema);
}

export function createUnionValidator<T extends z.ZodTypeAny[]>(
  schemas: T,
): z.ZodUnion<T> {
  return z.union(schemas as [T[0], T[1], ...T[]]);
}

export function createOptionalValidator<T>(
  schema: z.ZodSchema<T>,
  defaultValue?: T,
): z.ZodOptional<z.ZodSchema<T>> | z.ZodDefault<z.ZodSchema<T>> {
  if (defaultValue !== undefined) {
    return schema.optional().default(defaultValue);
  }
  return schema.optional();
}

export function createConditionalValidator<T, U>(
  condition: (data: any) => boolean,
  trueSchema: z.ZodSchema<T>,
  falseSchema: z.ZodSchema<U>,
): z.ZodSchema<T | U> {
  return z.custom((data) => {
    if (condition(data)) {
      return trueSchema.parse(data);
    }
    return falseSchema.parse(data);
  });
}

// Common validators
export const emailValidator = z.string().email();
export const urlValidator = z.string().url();
export const uuidValidator = z.string().uuid();
export const dateValidator = z.string().datetime();
export const semverValidator = z.string().regex(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
  'Must be a valid semantic version',
);

export const identifierValidator = z.string().regex(
  /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
  'Must be a valid identifier',
);

export const filePathValidator = z.string().refine(
  (path) => !path.includes('\0'),
  'File path cannot contain null bytes',
);

export const portValidator = z.number().int().min(1).max(65535);

export const environmentValidator = createEnumValidator(
  ['development', 'staging', 'production', 'test'] as const,
);

// Transformation validators
export function trimmedString(options?: z.StringValidation): z.ZodString {
  return z.string(options).transform((val) => val.trim());
}

export function normalizedPath(): z.ZodString {
  return z.string().transform((val) => val.replace(/\\/g, '/'));
}

export function coerceBoolean(): z.ZodBoolean {
  return z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true' || val === '1';
    }
    return Boolean(val);
  }, z.boolean());
}

export function coerceNumber(): z.ZodNumber {
  return z.preprocess((val) => {
    if (typeof val === 'string') {
      const num = Number(val);
      return isNaN(num) ? val : num;
    }
    return val;
  }, z.number());
}

export function coerceDate(): z.ZodDate {
  return z.preprocess((val) => {
    if (typeof val === 'string' || typeof val === 'number') {
      return new Date(val);
    }
    return val;
  }, z.date());
}