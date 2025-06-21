module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'security'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', 'src/generated/', 'src/__tests__/**/*'],
  rules: {
    // TypeScript-specific rules  
    '@typescript-eslint/no-explicit-any': 'warn', // Changed to warn for gRPC compatibility
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_', 
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'warn', // Added as warn for gRPC
    '@typescript-eslint/no-unsafe-call': 'warn', // Added as warn for gRPC
    '@typescript-eslint/no-unsafe-member-access': 'warn', // Added as warn for gRPC
    '@typescript-eslint/no-unsafe-argument': 'warn', // Added as warn for gRPC
    '@typescript-eslint/no-unsafe-return': 'warn', // Added as warn for gRPC
    
    // General rules
    'no-unused-vars': 'off', // TypeScript handles this
    'no-console': 'off', // Allow console for logging
    'prefer-const': 'error',
    'no-undef': 'off', // TypeScript handles this
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    
    // gRPC specific rules
    'no-empty-function': 'warn',
    'no-duplicate-imports': 'error',
    'prefer-template': 'error',
    '@typescript-eslint/no-var-requires': 'warn', // Allow requires for dynamic imports
    '@typescript-eslint/require-await': 'warn', // Some gRPC methods don't need await
    '@typescript-eslint/restrict-template-expressions': 'warn', // Allow in logging
    
    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
  },
};