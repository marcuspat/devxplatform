#!/usr/bin/env node

/**
 * Security Validation Test for IDE Integration
 * Tests the path validation functions to ensure they block path traversal attacks
 */

const path = require('path');

// Mock the validation patterns from url-generator.ts
const SECURITY_CONFIG = {
  MAX_PATH_LENGTH: 4096,
  FORBIDDEN_PATTERNS: [
    /\.\./,           // Directory traversal
    /\/\.\./,         // Unix directory traversal
    /\\\.\./,         // Windows directory traversal
    /^[a-zA-Z]:\\/,   // Windows drive letter (when not expected)
    /\/\//,           // Double slashes
    /\0/,             // Null bytes
    /[<>:"|?*]/       // Invalid filename characters
  ]
};

// Mock validatePath function
function validatePath(filePath, options = {}) {
  const errors = [];
  const warnings = [];

  // Check path length
  if (filePath.length > SECURITY_CONFIG.MAX_PATH_LENGTH) {
    errors.push(`Path exceeds maximum length of ${SECURITY_CONFIG.MAX_PATH_LENGTH} characters`);
  }

  // Check for forbidden patterns
  for (const pattern of SECURITY_CONFIG.FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      errors.push(`Path contains forbidden pattern: ${pattern.source}`);
    }
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    errors.push('Path contains null bytes');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Mock sanitization function
function sanitizeInput(input) {
  return input.replace(/[^a-zA-Z0-9-_]/g, '-');
}

// Test cases
const testCases = [
  // Valid inputs
  { input: 'my-project', expected: true, description: 'Valid project name' },
  { input: 'Project123', expected: true, description: 'Valid project with numbers' },
  { input: 'test_project', expected: true, description: 'Valid project with underscore' },
  
  // Path traversal attempts
  { input: '../etc/passwd', expected: false, description: 'Basic path traversal' },
  { input: '../../etc/passwd', expected: false, description: 'Double path traversal' },
  { input: '../../../etc/passwd', expected: false, description: 'Triple path traversal' },
  { input: '..\\windows\\system32', expected: false, description: 'Windows path traversal' },
  { input: '/../../etc/passwd', expected: false, description: 'Unix path traversal' },
  { input: '\\..\\..\\windows\\system32', expected: false, description: 'Windows backslash traversal' },
  
  // Null byte injection
  { input: 'project\0evil', expected: false, description: 'Null byte injection' },
  
  // Invalid characters
  { input: 'project<script>', expected: false, description: 'HTML injection attempt' },
  { input: 'project"evil"', expected: false, description: 'Quote injection' },
  { input: 'project|evil', expected: false, description: 'Pipe character' },
  { input: 'project?evil', expected: false, description: 'Question mark' },
  { input: 'project*evil', expected: false, description: 'Wildcard character' },
  
  // Double slashes
  { input: 'project//evil', expected: false, description: 'Double slash' },
  { input: 'project\\\\evil', expected: false, description: 'Double backslash' }
];

console.log('🔒 Security Validation Test for IDE Integration\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  // Test raw input validation
  const rawValidation = validatePath(testCase.input);
  const rawPassed = rawValidation.isValid === testCase.expected;
  
  // Test sanitized input
  const sanitized = sanitizeInput(testCase.input);
  const sanitizedValidation = validatePath(sanitized);
  
  // Create a simulated project path like the real code does
  const homeDir = require('os').homedir();
  const projectPath = path.join(homeDir, 'DevXProjects', `${sanitized}-test123`);
  const pathValidation = validatePath(projectPath);
  
  console.log(`Test: ${testCase.description}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Sanitized: "${sanitized}"`);
  console.log(`  Raw validation: ${rawValidation.isValid ? '✅ PASS' : '❌ BLOCKED'}`);
  console.log(`  Path validation: ${pathValidation.isValid ? '✅ SAFE' : '❌ BLOCKED'}`);
  
  if (rawValidation.errors.length > 0) {
    console.log(`  Errors: ${rawValidation.errors.join(', ')}`);
  }
  
  if (rawPassed) {
    console.log(`  ✅ PASSED - Expected ${testCase.expected}, got ${rawValidation.isValid}`);
    passed++;
  } else {
    console.log(`  ❌ FAILED - Expected ${testCase.expected}, got ${rawValidation.isValid}`);
    failed++;
  }
  
  console.log('');
}

console.log('\n📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`🔒 Security: ${failed === 0 ? 'SECURE' : 'VULNERABILITIES FOUND'}`);

// Test the actual path creation logic
console.log('\n🏗️ Testing Project Path Creation:');

function simulateProjectPathCreation(projectName, generationId) {
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const sanitizedGenerationId = generationId.replace(/[^a-zA-Z0-9-_]/g, '-');
  const homeDir = require('os').homedir();
  const projectPath = path.join(homeDir, 'DevXProjects', `${sanitizedProjectName}-${sanitizedGenerationId}`);
  
  const validation = validatePath(projectPath);
  
  return {
    originalProject: projectName,
    originalGeneration: generationId,
    sanitizedProject: sanitizedProjectName,
    sanitizedGeneration: sanitizedGenerationId,
    finalPath: projectPath,
    isSecure: validation.isValid,
    errors: validation.errors
  };
}

const pathTests = [
  { project: '../../../etc/passwd', generation: 'attack' },
  { project: 'my-project', generation: '12345' },
  { project: 'project"with"quotes', generation: 'test' },
  { project: 'normal_project', generation: 'abc123' }
];

for (const test of pathTests) {
  const result = simulateProjectPathCreation(test.project, test.generation);
  console.log(`Input: "${test.project}" + "${test.generation}"`);
  console.log(`Output: "${result.finalPath}"`);
  console.log(`Secure: ${result.isSecure ? '✅ YES' : '❌ NO'}`);
  if (!result.isSecure) {
    console.log(`Errors: ${result.errors.join(', ')}`);
  }
  console.log('');
}

process.exit(failed > 0 ? 1 : 0);