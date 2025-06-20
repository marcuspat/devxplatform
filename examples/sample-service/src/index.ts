/**
 * Sample service demonstrating resilience patterns
 */

export * from './user-service';

// Example usage
if (require.main === module) {
  console.log('Sample service with resilience patterns');
  console.log('Run tests with: npm test');
  console.log('Check coverage with: npm run test:coverage');
}