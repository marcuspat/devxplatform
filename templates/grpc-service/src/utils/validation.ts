// Simple validation utility for gRPC messages
// In a real application, you might want to use a more sophisticated validation library

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  email?: boolean;
  numeric?: boolean;
  positive?: boolean;
}

interface ValidationRules {
  [field: string]: ValidationRule;
}

export function validateInput(input: any, rules: ValidationRules): string | null {
  for (const [field, rule] of Object.entries(rules)) {
    const value = getFieldValue(input, field);
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      return `Field '${field}' is required`;
    }
    
    // Skip further validation if field is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `Field '${field}' must be at least ${rule.minLength} characters long`;
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        return `Field '${field}' must be at most ${rule.maxLength} characters long`;
      }
      
      if (rule.email && !isValidEmail(value)) {
        return `Field '${field}' must be a valid email address`;
      }
    }
    
    // Numeric validations
    if (rule.numeric && !isNumeric(value)) {
      return `Field '${field}' must be a valid number`;
    }
    
    if (rule.positive && (typeof value !== 'number' || value <= 0)) {
      return `Field '${field}' must be a positive number`;
    }
  }
  
  return null; // No validation errors
}

function getFieldValue(obj: any, fieldPath: string): any {
  // Handle protobuf getters (e.g., getEmail())
  const getterName = `get${fieldPath.charAt(0).toUpperCase() + fieldPath.slice(1)}`;
  if (typeof obj[getterName] === 'function') {
    return obj[getterName]();
  }
  
  // Handle direct property access
  return obj[fieldPath];
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isNumeric(value: any): boolean {
  return !isNaN(value) && !isNaN(parseFloat(value));
}

// Helper function to convert protobuf timestamp to Date
export function timestampToDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  return new Date(timestamp.getSeconds() * 1000 + timestamp.getNanos() / 1000000);
}

// Helper function to convert Date to protobuf timestamp
export function dateToTimestamp(date: Date): any {
  const timestamp = new (require('google-protobuf/google/protobuf/timestamp_pb').Timestamp)();
  timestamp.fromDate(date);
  return timestamp;
}