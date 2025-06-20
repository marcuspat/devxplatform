#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('❌ Coverage summary not found. Run tests with coverage first.');
  console.error('   Use: npm run test:coverage');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const summary = coverage.total;

// Check thresholds
const threshold = 90;
const metrics = ['statements', 'branches', 'functions', 'lines'];
let failed = false;

console.log('\n📊 Coverage Report for Sample Service');
console.log('=====================================\n');

metrics.forEach(metric => {
  const percentage = summary[metric].pct;
  const status = percentage >= threshold ? '✅' : '❌';
  const covered = summary[metric].covered;
  const total = summary[metric].total;
  
  console.log(`${status} ${metric.padEnd(12)}: ${percentage.toString().padStart(6)}% (${covered}/${total})`);
  
  if (percentage < threshold) {
    failed = true;
  }
});

console.log('\n' + '='.repeat(45));

if (failed) {
  console.log(`❌ Coverage is below ${threshold}% threshold`);
  console.log('\n💡 To improve coverage:');
  console.log('   1. Add tests for uncovered branches');
  console.log('   2. Test error scenarios');
  console.log('   3. Test edge cases');
  console.log('   4. Use coverage reports: open coverage/lcov-report/index.html');
  process.exit(1);
} else {
  console.log(`✅ All coverage thresholds met! (${threshold}%+)`);
  console.log('\n🎉 Excellent test coverage! This demonstrates:');
  console.log('   • Comprehensive unit testing');
  console.log('   • Error scenario coverage');
  console.log('   • Resilience pattern validation');
  console.log('   • Production-ready code quality');
  process.exit(0);
}