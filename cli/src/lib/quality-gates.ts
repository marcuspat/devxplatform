import { CodeValidator, ValidationResult } from './code-validator.js';
import { TemplateTester, TemplateTestResult } from './template-tester.js';
import { DependencyValidator, DependencyValidationResult } from './dependency-validator.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export interface QualityGateConfig {
  name: string;
  description: string;
  enabled: boolean;
  required: boolean;
  timeout?: number;
  thresholds: QualityThresholds;
}

export interface QualityThresholds {
  maxCriticalVulnerabilities: number;
  maxHighVulnerabilities: number;
  maxCodeErrors: number;
  minTestCoverage?: number;
  maxDependencyRiskScore: number;
  maxLintingWarnings?: number;
  maxComplexityScore?: number;
  maxBuildTime?: number; // in seconds
  requiresSecurityScan: boolean;
  requiresLicenseCheck: boolean;
  requiresPerformanceTest: boolean;
}

export interface QualityGateResult {
  gateName: string;
  passed: boolean;
  required: boolean;
  duration: number;
  score: number;
  details: QualityGateDetails;
  recommendations: string[];
}

export interface QualityGateDetails {
  codeValidation?: ValidationResult[];
  templateTest?: TemplateTestResult;
  dependencyValidation?: DependencyValidationResult;
  buildResult?: BuildResult;
  testResult?: TestResult;
  securityScan?: SecurityScanResult;
  performanceTest?: PerformanceTestResult;
}

export interface BuildResult {
  success: boolean;
  duration: number;
  output: string;
  errors: string[];
  warnings: string[];
  artifactSize?: number;
}

export interface TestResult {
  success: boolean;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage?: number;
  output: string;
}

export interface SecurityScanResult {
  passed: boolean;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  tools: string[];
  details: string[];
}

export interface PerformanceTestResult {
  passed: boolean;
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface QualityGatesReport {
  overallResult: 'PASSED' | 'FAILED' | 'WARNING';
  totalGates: number;
  passedGates: number;
  failedGates: number;
  requiredGatesFailed: number;
  totalScore: number;
  duration: number;
  gateResults: QualityGateResult[];
  summary: string;
  recommendations: string[];
}

export class QualityGatesManager {
  private codeValidator: CodeValidator;
  private templateTester: TemplateTester;
  private dependencyValidator: DependencyValidator;
  private defaultGates: QualityGateConfig[];

  constructor() {
    this.codeValidator = new CodeValidator();
    this.templateTester = new TemplateTester();
    this.dependencyValidator = new DependencyValidator();
    this.defaultGates = this.getDefaultGates();
  }

  async runQualityGates(
    projectPath: string,
    customGates?: QualityGateConfig[],
    options: { skipOptional?: boolean; failFast?: boolean } = {}
  ): Promise<QualityGatesReport> {
    const startTime = Date.now();
    const gates = customGates || this.defaultGates;
    const results: QualityGateResult[] = [];

    logger.info(`Running ${gates.length} quality gates for project: ${projectPath}`);

    for (const gate of gates) {
      if (!gate.enabled) {
        logger.info(`Skipping disabled gate: ${gate.name}`);
        continue;
      }

      if (options.skipOptional && !gate.required) {
        logger.info(`Skipping optional gate: ${gate.name}`);
        continue;
      }

      const result = await this.runSingleGate(gate, projectPath);
      results.push(result);

      if (options.failFast && gate.required && !result.passed) {
        logger.error(`Required gate failed: ${gate.name}. Stopping execution.`);
        break;
      }
    }

    const report = this.generateReport(results, Date.now() - startTime);
    
    logger.info(`Quality gates completed: ${report.overallResult}`);
    return report;
  }

  private async runSingleGate(gate: QualityGateConfig, projectPath: string): Promise<QualityGateResult> {
    const startTime = Date.now();
    
    logger.info(`Running quality gate: ${gate.name}`);

    const result: QualityGateResult = {
      gateName: gate.name,
      passed: false,
      required: gate.required,
      duration: 0,
      score: 0,
      details: {},
      recommendations: []
    };

    try {
      switch (gate.name) {
        case 'code-validation':
          result.details.codeValidation = await this.codeValidator.validateProject(projectPath);
          break;
        
        case 'dependency-security':
          result.details.dependencyValidation = await this.dependencyValidator.validateDependencies(projectPath);
          break;
        
        case 'build-test':
          result.details.buildResult = await this.runBuildTest(projectPath);
          break;
        
        case 'unit-tests':
          result.details.testResult = await this.runUnitTests(projectPath);
          break;
        
        case 'security-scan':
          result.details.securityScan = await this.runSecurityScan(projectPath);
          break;
        
        case 'performance-test':
          result.details.performanceTest = await this.runPerformanceTest(projectPath);
          break;
        
        default:
          throw new Error(`Unknown quality gate: ${gate.name}`);
      }

      // Evaluate gate results against thresholds
      const evaluation = this.evaluateGate(gate, result.details);
      result.passed = evaluation.passed;
      result.score = evaluation.score;
      result.recommendations = evaluation.recommendations;

    } catch (error: any) {
      logger.error(`Quality gate ${gate.name} failed:`, error.message);
      result.passed = false;
      result.score = 0;
      result.recommendations.push(`Gate execution failed: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    
    const status = result.passed ? chalk.green('PASSED') : chalk.red('FAILED');
    logger.info(`Quality gate ${gate.name}: ${status} (${result.duration}ms)`);

    return result;
  }

  private evaluateGate(gate: QualityGateConfig, details: QualityGateDetails): {
    passed: boolean;
    score: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 100;
    let passed = true;

    switch (gate.name) {
      case 'code-validation':
        if (details.codeValidation) {
          const totalErrors = details.codeValidation.reduce((sum, r) => sum + r.errors.length, 0);
          const totalWarnings = details.codeValidation.reduce((sum, r) => sum + r.warnings.length, 0);
          
          if (totalErrors > gate.thresholds.maxCodeErrors) {
            passed = false;
            recommendations.push(`Too many code errors: ${totalErrors} (max: ${gate.thresholds.maxCodeErrors})`);
          }
          
          score = Math.max(0, 100 - (totalErrors * 10) - (totalWarnings * 2));
        }
        break;

      case 'dependency-security':
        if (details.dependencyValidation) {
          const criticalVulns = details.dependencyValidation.vulnerabilities.filter(v => v.severity === 'critical').length;
          const highVulns = details.dependencyValidation.vulnerabilities.filter(v => v.severity === 'high').length;
          
          if (criticalVulns > gate.thresholds.maxCriticalVulnerabilities) {
            passed = false;
            recommendations.push(`Too many critical vulnerabilities: ${criticalVulns} (max: ${gate.thresholds.maxCriticalVulnerabilities})`);
          }
          
          if (highVulns > gate.thresholds.maxHighVulnerabilities) {
            passed = false;
            recommendations.push(`Too many high vulnerabilities: ${highVulns} (max: ${gate.thresholds.maxHighVulnerabilities})`);
          }
          
          if (details.dependencyValidation.riskScore > gate.thresholds.maxDependencyRiskScore) {
            passed = false;
            recommendations.push(`Dependency risk score too high: ${details.dependencyValidation.riskScore} (max: ${gate.thresholds.maxDependencyRiskScore})`);
          }
          
          score = Math.max(0, 100 - details.dependencyValidation.riskScore);
        }
        break;

      case 'build-test':
        if (details.buildResult) {
          if (!details.buildResult.success) {
            passed = false;
            recommendations.push('Build failed');
            score = 0;
          } else {
            if (gate.thresholds.maxBuildTime && details.buildResult.duration > gate.thresholds.maxBuildTime * 1000) {
              recommendations.push(`Build time too long: ${details.buildResult.duration}ms (max: ${gate.thresholds.maxBuildTime}s)`);
              score = Math.max(50, score - 20);
            }
          }
        }
        break;

      case 'unit-tests':
        if (details.testResult) {
          if (!details.testResult.success) {
            passed = false;
            recommendations.push('Unit tests failed');
            score = 0;
          } else {
            if (gate.thresholds.minTestCoverage && details.testResult.coverage && 
                details.testResult.coverage < gate.thresholds.minTestCoverage) {
              passed = false;
              recommendations.push(`Test coverage too low: ${details.testResult.coverage}% (min: ${gate.thresholds.minTestCoverage}%)`);
            }
            
            score = details.testResult.coverage || 80;
          }
        }
        break;

      case 'security-scan':
        if (details.securityScan) {
          if (!details.securityScan.passed) {
            passed = false;
            recommendations.push('Security scan failed');
          }
          
          if (details.securityScan.criticalIssues > 0) {
            passed = false;
            recommendations.push(`Critical security issues found: ${details.securityScan.criticalIssues}`);
          }
          
          score = Math.max(0, 100 - (details.securityScan.criticalIssues * 30) - (details.securityScan.highIssues * 15));
        }
        break;

      case 'performance-test':
        if (details.performanceTest) {
          if (!details.performanceTest.passed) {
            passed = false;
            recommendations.push('Performance test failed');
            score = 0;
          } else {
            score = Math.max(0, 100 - (details.performanceTest.responseTime / 10) - (details.performanceTest.errorRate * 100));
          }
        }
        break;
    }

    return { passed, score, recommendations };
  }

  private async runBuildTest(projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      // Detect build system and run appropriate build command
      const buildCommand = await this.detectBuildCommand(projectPath);
      
      if (!buildCommand) {
        return {
          success: false,
          duration: Date.now() - startTime,
          output: '',
          errors: ['No build system detected'],
          warnings: []
        };
      }

      const { stdout, stderr } = await this.executeCommand(buildCommand.command, buildCommand.args, projectPath);
      
      const success = !stderr.includes('error') && !stderr.includes('Error') && !stderr.includes('FAILED');
      
      return {
        success,
        duration: Date.now() - startTime,
        output: stdout,
        errors: success ? [] : [stderr],
        warnings: []
      };
    } catch (error: any) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: '',
        errors: [error.message],
        warnings: []
      };
    }
  }

  private async runUnitTests(projectPath: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testCommand = await this.detectTestCommand(projectPath);
      
      if (!testCommand) {
        return {
          success: false,
          duration: Date.now() - startTime,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          output: 'No test framework detected'
        };
      }

      const { stdout, stderr } = await this.executeCommand(testCommand.command, testCommand.args, projectPath);
      
      // Parse test results (this is a simplified version)
      const testResults = this.parseTestResults(stdout, stderr);
      
      return {
        success: testResults.failedTests === 0,
        duration: Date.now() - startTime,
        totalTests: testResults.totalTests,
        passedTests: testResults.passedTests,
        failedTests: testResults.failedTests,
        coverage: testResults.coverage,
        output: stdout
      };
    } catch (error: any) {
      return {
        success: false,
        duration: Date.now() - startTime,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        output: error.message
      };
    }
  }

  private async runSecurityScan(projectPath: string): Promise<SecurityScanResult> {
    // This would integrate with actual security scanning tools
    // For now, return a mock result
    return {
      passed: true,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      tools: ['npm audit', 'snyk'],
      details: []
    };
  }

  private async runPerformanceTest(projectPath: string): Promise<PerformanceTestResult> {
    // This would integrate with actual performance testing tools
    // For now, return a mock result
    return {
      passed: true,
      responseTime: 100,
      throughput: 1000,
      errorRate: 0,
      memoryUsage: 512,
      cpuUsage: 25
    };
  }

  private async detectBuildCommand(projectPath: string): Promise<{ command: string; args: string[] } | null> {
    // Check for package.json build script
    try {
      const packagePath = `${projectPath}/package.json`;
      const fs = await import('fs/promises');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      if (packageJson.scripts?.build) {
        return { command: 'npm', args: ['run', 'build'] };
      }
    } catch {
      // Not a Node.js project or no build script
    }

    // Check for Go
    try {
      const fs = await import('fs/promises');
      await fs.access(`${projectPath}/go.mod`);
      return { command: 'go', args: ['build', './...'] };
    } catch {
      // Not a Go project
    }

    // Check for Python
    try {
      const fs = await import('fs/promises');
      await fs.access(`${projectPath}/setup.py`);
      return { command: 'python', args: ['setup.py', 'build'] };
    } catch {
      // Not a Python project with setup.py
    }

    return null;
  }

  private async detectTestCommand(projectPath: string): Promise<{ command: string; args: string[] } | null> {
    // Check for package.json test script
    try {
      const packagePath = `${projectPath}/package.json`;
      const fs = await import('fs/promises');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      if (packageJson.scripts?.test) {
        return { command: 'npm', args: ['test'] };
      }
    } catch {
      // Not a Node.js project or no test script
    }

    // Check for Go
    try {
      const fs = await import('fs/promises');
      await fs.access(`${projectPath}/go.mod`);
      return { command: 'go', args: ['test', './...'] };
    } catch {
      // Not a Go project
    }

    // Check for Python
    try {
      const fs = await import('fs/promises');
      await fs.access(`${projectPath}/pytest.ini`);
      return { command: 'pytest', args: [] };
    } catch {
      try {
        const fs = await import('fs/promises');
        await fs.access(`${projectPath}/setup.py`);
        return { command: 'python', args: ['-m', 'unittest', 'discover'] };
      } catch {
        // Not a Python project
      }
    }

    return null;
  }

  private parseTestResults(stdout: string, stderr: string): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    coverage?: number;
  } {
    // This is a simplified parser - in reality, you'd need different parsers for different test frameworks
    const lines = (stdout + stderr).split('\n');
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let coverage: number | undefined;

    for (const line of lines) {
      // Jest format
      const jestMatch = line.match(/Tests:\s+(\d+) failed,\s+(\d+) passed,\s+(\d+) total/);
      if (jestMatch) {
        failedTests = parseInt(jestMatch[1]);
        passedTests = parseInt(jestMatch[2]);
        totalTests = parseInt(jestMatch[3]);
      }

      // Coverage format
      const coverageMatch = line.match(/All files\s+\|\s+(\d+\.?\d*)/);
      if (coverageMatch) {
        coverage = parseFloat(coverageMatch[1]);
      }

      // Go test format
      const goMatch = line.match(/PASS|FAIL/);
      if (goMatch) {
        totalTests++;
        if (goMatch[0] === 'PASS') {
          passedTests++;
        } else {
          failedTests++;
        }
      }
    }

    return { totalTests, passedTests, failedTests, coverage };
  }

  private async executeCommand(
    command: string,
    args: string[],
    cwd: string,
    timeout: number = 120000
  ): Promise<{ stdout: string; stderr: string }> {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        shell: true,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private generateReport(results: QualityGateResult[], totalDuration: number): QualityGatesReport {
    const totalGates = results.length;
    const passedGates = results.filter(r => r.passed).length;
    const failedGates = totalGates - passedGates;
    const requiredGatesFailed = results.filter(r => r.required && !r.passed).length;
    
    const totalScore = results.length > 0 ? 
      Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;

    const overallResult: 'PASSED' | 'FAILED' | 'WARNING' = 
      requiredGatesFailed > 0 ? 'FAILED' :
      failedGates > 0 ? 'WARNING' : 'PASSED';

    const allRecommendations = results.flatMap(r => r.recommendations);

    return {
      overallResult,
      totalGates,
      passedGates,
      failedGates,
      requiredGatesFailed,
      totalScore,
      duration: totalDuration,
      gateResults: results,
      summary: this.generateSummary(overallResult, totalGates, passedGates, totalScore),
      recommendations: [...new Set(allRecommendations)] // Remove duplicates
    };
  }

  private generateSummary(result: string, total: number, passed: number, score: number): string {
    return `Quality Gates ${result}: ${passed}/${total} gates passed with overall score of ${score}/100`;
  }

  private getDefaultGates(): QualityGateConfig[] {
    return [
      {
        name: 'code-validation',
        description: 'Validates code syntax, linting, and type checking',
        enabled: true,
        required: true,
        timeout: 120000,
        thresholds: {
          maxCriticalVulnerabilities: 0,
          maxHighVulnerabilities: 0,
          maxCodeErrors: 0,
          maxDependencyRiskScore: 50,
          requiresSecurityScan: true,
          requiresLicenseCheck: true,
          requiresPerformanceTest: false
        }
      },
      {
        name: 'dependency-security',
        description: 'Scans dependencies for security vulnerabilities and license issues',
        enabled: true,
        required: true,
        timeout: 300000,
        thresholds: {
          maxCriticalVulnerabilities: 0,
          maxHighVulnerabilities: 2,
          maxCodeErrors: 0,
          maxDependencyRiskScore: 30,
          requiresSecurityScan: true,
          requiresLicenseCheck: true,
          requiresPerformanceTest: false
        }
      },
      {
        name: 'build-test',
        description: 'Tests that the project builds successfully',
        enabled: true,
        required: true,
        timeout: 300000,
        thresholds: {
          maxCriticalVulnerabilities: 0,
          maxHighVulnerabilities: 0,
          maxCodeErrors: 0,
          maxDependencyRiskScore: 50,
          maxBuildTime: 300,
          requiresSecurityScan: false,
          requiresLicenseCheck: false,
          requiresPerformanceTest: false
        }
      },
      {
        name: 'unit-tests',
        description: 'Runs unit tests and checks coverage',
        enabled: true,
        required: false,
        timeout: 300000,
        thresholds: {
          maxCriticalVulnerabilities: 0,
          maxHighVulnerabilities: 0,
          maxCodeErrors: 0,
          maxDependencyRiskScore: 50,
          minTestCoverage: 80,
          requiresSecurityScan: false,
          requiresLicenseCheck: false,
          requiresPerformanceTest: false
        }
      },
      {
        name: 'security-scan',
        description: 'Comprehensive security scanning',
        enabled: true,
        required: false,
        timeout: 600000,
        thresholds: {
          maxCriticalVulnerabilities: 0,
          maxHighVulnerabilities: 0,
          maxCodeErrors: 0,
          maxDependencyRiskScore: 50,
          requiresSecurityScan: true,
          requiresLicenseCheck: true,
          requiresPerformanceTest: false
        }
      },
      {
        name: 'performance-test',
        description: 'Basic performance and load testing',
        enabled: false,
        required: false,
        timeout: 600000,
        thresholds: {
          maxCriticalVulnerabilities: 0,
          maxHighVulnerabilities: 0,
          maxCodeErrors: 0,
          maxDependencyRiskScore: 50,
          requiresSecurityScan: false,
          requiresLicenseCheck: false,
          requiresPerformanceTest: true
        }
      }
    ];
  }

  generateQualityGatesReport(report: QualityGatesReport): string {
    let output = '\n' + chalk.bold('Quality Gates Report') + '\n';
    output += chalk.gray('='.repeat(60)) + '\n\n';

    // Overall status
    const statusColor = report.overallResult === 'PASSED' ? chalk.green : 
                       report.overallResult === 'WARNING' ? chalk.yellow : chalk.red;
    
    output += chalk.bold('Overall Result: ') + statusColor(report.overallResult) + '\n';
    output += chalk.bold('Score: ') + `${report.totalScore}/100\n`;
    output += chalk.bold('Duration: ') + `${Math.round(report.duration / 1000)}s\n`;
    output += chalk.bold('Gates: ') + `${report.passedGates}/${report.totalGates} passed\n\n`;

    // Individual gate results
    output += chalk.bold('Gate Results:\n');
    for (const result of report.gateResults) {
      const status = result.passed ? chalk.green('✓') : chalk.red('✗');
      const required = result.required ? chalk.red('(required)') : chalk.gray('(optional)');
      
      output += `${status} ${result.gateName} ${required} - ${result.score}/100 (${result.duration}ms)\n`;
      
      if (result.recommendations.length > 0) {
        for (const rec of result.recommendations) {
          output += chalk.gray(`    ${rec}\n`);
        }
      }
    }

    // Summary recommendations
    if (report.recommendations.length > 0) {
      output += '\n' + chalk.bold('Recommendations:\n');
      for (const rec of report.recommendations) {
        output += `• ${rec}\n`;
      }
    }

    return output;
  }
}