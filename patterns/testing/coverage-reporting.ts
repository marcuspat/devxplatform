/**
 * Coverage Reporting Configuration and Utilities
 */

import { Config } from '@jest/types';

/**
 * Jest coverage configuration for 90% target
 */
export const jestCoverageConfig: Partial<Config.InitialOptions> = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/test/**',
    '!src/**/tests/**',
    '!src/**/mocks/**',
    '!src/**/types/**',
    '!src/**/index.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Per-file thresholds for critical modules
    './src/core/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/api/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '/coverage/'
  ]
};

/**
 * NYC (Istanbul) configuration for Node.js projects
 */
export const nycConfig = {
  extends: '@istanbuljs/nyc-config-typescript',
  all: true,
  'check-coverage': true,
  reporter: ['html', 'text', 'lcov', 'json', 'cobertura'],
  include: ['src/**/*.ts'],
  exclude: [
    '**/*.d.ts',
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/test/**',
    '**/tests/**',
    '**/mocks/**',
    '**/node_modules/**'
  ],
  branches: 90,
  lines: 90,
  functions: 90,
  statements: 90,
  watermarks: {
    lines: [80, 90],
    functions: [80, 90],
    branches: [80, 90],
    statements: [80, 90]
  }
};

/**
 * Coverage report analyzer
 */
export class CoverageAnalyzer {
  private coverage: any;

  constructor(coverageData: any) {
    this.coverage = coverageData;
  }

  /**
   * Get files below threshold
   */
  getFilesBelowThreshold(threshold = 90): string[] {
    const files: string[] = [];
    
    Object.entries(this.coverage).forEach(([file, data]: [string, any]) => {
      const summary = data.s;
      const coverage = this.calculateCoverage(summary);
      
      if (coverage < threshold) {
        files.push(file);
      }
    });
    
    return files;
  }

  /**
   * Get uncovered lines for a file
   */
  getUncoveredLines(file: string): number[] {
    const fileData = this.coverage[file];
    if (!fileData) return [];
    
    const uncoveredLines: number[] = [];
    const statementMap = fileData.statementMap;
    const statements = fileData.s;
    
    Object.entries(statements).forEach(([key, count]: [string, any]) => {
      if (count === 0) {
        const statement = statementMap[key];
        if (statement) {
          for (let i = statement.start.line; i <= statement.end.line; i++) {
            if (!uncoveredLines.includes(i)) {
              uncoveredLines.push(i);
            }
          }
        }
      }
    });
    
    return uncoveredLines.sort((a, b) => a - b);
  }

  /**
   * Generate coverage summary
   */
  generateSummary(): CoverageSummary {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;
    
    Object.values(this.coverage).forEach((fileData: any) => {
      // Statements
      const statements = Object.values(fileData.s || {});
      totalStatements += statements.length;
      coveredStatements += statements.filter((count: any) => count > 0).length;
      
      // Branches
      const branches = Object.values(fileData.b || {});
      branches.forEach((branch: any) => {
        totalBranches += branch.length;
        coveredBranches += branch.filter((count: any) => count > 0).length;
      });
      
      // Functions
      const functions = Object.values(fileData.f || {});
      totalFunctions += functions.length;
      coveredFunctions += functions.filter((count: any) => count > 0).length;
      
      // Lines (approximate)
      const lineNumbers = new Set<number>();
      Object.values(fileData.statementMap || {}).forEach((statement: any) => {
        for (let i = statement.start.line; i <= statement.end.line; i++) {
          lineNumbers.add(i);
        }
      });
      totalLines += lineNumbers.size;
      
      // Count covered lines
      const coveredLineNumbers = new Set<number>();
      Object.entries(fileData.s || {}).forEach(([key, count]: [string, any]) => {
        if (count > 0) {
          const statement = fileData.statementMap[key];
          if (statement) {
            for (let i = statement.start.line; i <= statement.end.line; i++) {
              coveredLineNumbers.add(i);
            }
          }
        }
      });
      coveredLines += coveredLineNumbers.size;
    });
    
    return {
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
      },
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
      }
    };
  }

  private calculateCoverage(statements: Record<string, number>): number {
    const total = Object.keys(statements).length;
    const covered = Object.values(statements).filter(count => count > 0).length;
    return total > 0 ? (covered / total) * 100 : 0;
  }
}

export interface CoverageSummary {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

/**
 * Coverage badge generator
 */
export class CoverageBadgeGenerator {
  static generate(percentage: number): string {
    const color = this.getColor(percentage);
    const roundedPercentage = Math.round(percentage);
    
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="114" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="114" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h63v20H0z"/>
    <path fill="${color}" d="M63 0h51v20H63z"/>
    <path fill="url(#b)" d="M0 0h114v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="31.5" y="15" fill="#010101" fill-opacity=".3">coverage</text>
    <text x="31.5" y="14">coverage</text>
    <text x="87.5" y="15" fill="#010101" fill-opacity=".3">${roundedPercentage}%</text>
    <text x="87.5" y="14">${roundedPercentage}%</text>
  </g>
</svg>
    `.trim();
  }

  private static getColor(percentage: number): string {
    if (percentage >= 90) return '#4c1'; // Bright green
    if (percentage >= 80) return '#97ca00'; // Green
    if (percentage >= 70) return '#a4a61d'; // Yellow green
    if (percentage >= 60) return '#dfb317'; // Yellow
    if (percentage >= 50) return '#fe7d37'; // Orange
    return '#e05d44'; // Red
  }
}

/**
 * Coverage report generator for different formats
 */
export class CoverageReportGenerator {
  /**
   * Generate markdown report
   */
  static generateMarkdownReport(summary: CoverageSummary): string {
    return `
# Coverage Report

## Summary

| Type | Coverage | Total | Covered |
|------|----------|-------|---------|
| Statements | ${summary.statements.percentage.toFixed(2)}% | ${summary.statements.total} | ${summary.statements.covered} |
| Branches | ${summary.branches.percentage.toFixed(2)}% | ${summary.branches.total} | ${summary.branches.covered} |
| Functions | ${summary.functions.percentage.toFixed(2)}% | ${summary.functions.total} | ${summary.functions.covered} |
| Lines | ${summary.lines.percentage.toFixed(2)}% | ${summary.lines.total} | ${summary.lines.covered} |

## Coverage Threshold: 90%

${this.getThresholdStatus(summary)}
    `.trim();
  }

  private static getThresholdStatus(summary: CoverageSummary): string {
    const threshold = 90;
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    const failing: string[] = [];
    
    metrics.forEach(metric => {
      const percentage = (summary as any)[metric].percentage;
      if (percentage < threshold) {
        failing.push(`- ❌ ${metric}: ${percentage.toFixed(2)}% (below ${threshold}%)`);
      } else {
        failing.push(`- ✅ ${metric}: ${percentage.toFixed(2)}%`);
      }
    });
    
    return failing.join('\n');
  }

  /**
   * Generate HTML summary
   */
  static generateHTMLSummary(summary: CoverageSummary): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .coverage-summary { margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; max-width: 600px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .good { color: #4c1; }
    .warning { color: #dfb317; }
    .bad { color: #e05d44; }
  </style>
</head>
<body>
  <h1>Coverage Report</h1>
  <div class="coverage-summary">
    <h2>Summary</h2>
    <table>
      <tr>
        <th>Type</th>
        <th>Coverage</th>
        <th>Total</th>
        <th>Covered</th>
      </tr>
      ${this.generateHTMLRows(summary)}
    </table>
  </div>
</body>
</html>
    `.trim();
  }

  private static generateHTMLRows(summary: CoverageSummary): string {
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    
    return metrics.map(metric => {
      const data = (summary as any)[metric];
      const className = data.percentage >= 90 ? 'good' : 
                       data.percentage >= 80 ? 'warning' : 'bad';
      
      return `
      <tr>
        <td>${metric.charAt(0).toUpperCase() + metric.slice(1)}</td>
        <td class="${className}">${data.percentage.toFixed(2)}%</td>
        <td>${data.total}</td>
        <td>${data.covered}</td>
      </tr>
      `;
    }).join('');
  }
}

/**
 * Script to enforce coverage thresholds
 */
export const enforceCoverageScript = `
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('Coverage summary not found. Run tests with coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const summary = coverage.total;

// Check thresholds
const threshold = 90;
const metrics = ['statements', 'branches', 'functions', 'lines'];
let failed = false;

console.log('\nCoverage Report:');
console.log('================\n');

metrics.forEach(metric => {
  const percentage = summary[metric].pct;
  const status = percentage >= threshold ? '✅' : '❌';
  
  console.log(\`\${status} \${metric}: \${percentage}%\`);
  
  if (percentage < threshold) {
    failed = true;
  }
});

if (failed) {
  console.log(\`\n❌ Coverage is below \${threshold}% threshold\`);
  process.exit(1);
} else {
  console.log(\`\n✅ All coverage thresholds met!\`);
  process.exit(0);
}
`;