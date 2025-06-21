module.exports = {
  root: true, // Prevent searching for parent configs
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    // Remove project to avoid configuration conflicts
  },
  extends: [
    'eslint:recommended',
  ],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    'no-unused-vars': 'off', // TypeScript handles this
    'no-console': 'off', // Allow console for logging
    'prefer-const': 'error',
    'no-undef': 'off', // TypeScript handles this
  },
  ignorePatterns: ['node_modules/', 'dist/', '*.js'],
};