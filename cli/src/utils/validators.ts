export function validateServiceName(name: string): boolean | string {
  if (!name || name.length === 0) {
    return 'Service name is required';
  }
  
  if (name.length < 3) {
    return 'Service name must be at least 3 characters';
  }
  
  if (name.length > 50) {
    return 'Service name must be less than 50 characters';
  }
  
  // Must start with a letter and contain only letters, numbers, and hyphens
  const pattern = /^[a-z][a-z0-9-]*$/;
  if (!pattern.test(name)) {
    return 'Service name must start with a letter and contain only lowercase letters, numbers, and hyphens';
  }
  
  // Cannot end with a hyphen
  if (name.endsWith('-')) {
    return 'Service name cannot end with a hyphen';
  }
  
  // Cannot have consecutive hyphens
  if (name.includes('--')) {
    return 'Service name cannot contain consecutive hyphens';
  }
  
  return true;
}

export function validateEnvironment(env: string): boolean | string {
  const validEnvironments = ['development', 'staging', 'production', 'test'];
  if (!validEnvironments.includes(env)) {
    return `Environment must be one of: ${validEnvironments.join(', ')}`;
  }
  return true;
}

export function validatePort(port: string | number): boolean | string {
  const portNum = typeof port === 'string' ? parseInt(port) : port;
  if (isNaN(portNum)) {
    return 'Port must be a number';
  }
  if (portNum < 1 || portNum > 65535) {
    return 'Port must be between 1 and 65535';
  }
  return true;
}

export function validateEmail(email: string): boolean | string {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    return 'Please enter a valid email address';
  }
  return true;
}

export function validateUrl(url: string): boolean | string {
  try {
    new URL(url);
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
}