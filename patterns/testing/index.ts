export * from './unit-test-templates';
export * from './integration-test-setup';
export * from './test-data-factories';
export * from './load-test-templates';
export * from './e2e-test-setup';
export * from './coverage-reporting';

// Re-export commonly used utilities
export { 
  BaseTestTemplate,
  ServiceTestTemplate,
  ControllerTestTemplate,
  TestUtilities,
  MockBuilder 
} from './unit-test-templates';

export {
  PostgresTestSetup,
  RedisTestSetup,
  MongoTestSetup,
  RabbitMQTestSetup,
  FullStackTestSetup,
  IntegrationTestHelpers
} from './integration-test-setup';

export {
  UserFactory,
  ProductFactory,
  OrderFactory,
  factory,
  TestStateBuilder
} from './test-data-factories';

export {
  LoadTestGenerator,
  basicLoadTest,
  stressTestTemplate,
  spikeTestTemplate,
  apiEndpointTestTemplate,
  websocketTestTemplate,
  databasePerfTestTemplate
} from './load-test-templates';

export {
  test as e2eTest,
  BasePage,
  E2ETestScenarios,
  AccessibilityTester,
  PerformanceTester
} from './e2e-test-setup';

export {
  jestCoverageConfig,
  nycConfig,
  CoverageAnalyzer,
  CoverageBadgeGenerator,
  CoverageReportGenerator
} from './coverage-reporting';