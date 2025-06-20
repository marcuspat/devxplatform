import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { logger } from '../utils/logger.js';
import { QualityGatesManager, QualityGateConfig } from '../lib/quality-gates.js';
import { CodeValidator } from '../lib/code-validator.js';
import { DependencyValidator } from '../lib/dependency-validator.js';
import { TemplateTester, defaultTemplateTests } from '../lib/template-tester.js';

export const validateCommand = new Command('validate')
  .description('Validate code quality, security, and dependencies')
  .argument('[path]', 'Path to project directory', process.cwd())
  .option('-t, --type <type>', 'Validation type', 'all')
  .option('--gates <gates>', 'Comma-separated list of quality gates to run')
  .option('--skip-optional', 'Skip optional quality gates')
  .option('--fail-fast', 'Stop on first required gate failure')
  .option('--template <template>', 'Validate specific template')
  .option('--output <format>', 'Output format (text|json|junit)', 'text')
  .option('--report-file <file>', 'Save report to file')
  .action(async (projectPath, options) => {
    try {
      const fullPath = path.resolve(projectPath);
      
      console.log(chalk.bold(`\n🔍 DevX Platform - Code Validation`));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Project Path: ${fullPath}`);
      console.log(`Validation Type: ${options.type}`);
      console.log('');

      // Handle different validation types
      switch (options.type) {
        case 'code':
          await runCodeValidation(fullPath, options);
          break;
        
        case 'dependencies':
          await runDependencyValidation(fullPath, options);
          break;
        
        case 'templates':
          await runTemplateValidation(options);
          break;
        
        case 'security':
          await runSecurityValidation(fullPath, options);
          break;
        
        case 'gates':
        case 'all':
        default:
          await runQualityGates(fullPath, options);
          break;
      }

    } catch (error: any) {
      console.error(chalk.red('Validation failed:'), error.message);
      logger.error('Validation command failed', error);
      process.exit(1);
    }
  });

async function runCodeValidation(projectPath: string, options: any) {
  const spinner = ora('Running code validation...').start();
  
  try {
    const validator = new CodeValidator();
    const results = await validator.validateProject(projectPath);
    
    spinner.stop();
    
    const report = validator.generateValidationReport(results);
    console.log(report);
    
    const hasErrors = results.some(r => r.errors.length > 0);
    
    if (options.reportFile) {
      await saveReport(options.reportFile, report, options.output);
    }
    
    if (hasErrors) {
      process.exit(1);
    }
    
  } catch (error: any) {
    spinner.fail('Code validation failed');
    throw error;
  }
}

async function runDependencyValidation(projectPath: string, options: any) {
  const spinner = ora('Running dependency validation...').start();
  
  try {
    const validator = new DependencyValidator();
    const result = await validator.validateDependencies(projectPath);
    
    spinner.stop();
    
    const report = validator.generateDependencyReport(result);
    console.log(report);
    
    if (options.reportFile) {
      await saveReport(options.reportFile, report, options.output);
    }
    
    if (!result.valid) {
      process.exit(1);
    }
    
  } catch (error: any) {
    spinner.fail('Dependency validation failed');
    throw error;
  }
}

async function runTemplateValidation(options: any) {
  const spinner = ora('Running template validation...').start();
  
  try {
    const tester = new TemplateTester();
    
    let testsToRun = defaultTemplateTests;
    
    if (options.template) {
      testsToRun = defaultTemplateTests.filter(t => t.templateId === options.template);
      if (testsToRun.length === 0) {
        throw new Error(`Template not found: ${options.template}`);
      }
    }
    
    const results = await tester.testAllTemplates(testsToRun);
    
    spinner.stop();
    
    const report = tester.generateTestReport(results);
    console.log(report);
    
    if (options.reportFile) {
      await saveReport(options.reportFile, report, options.output);
    }
    
    const hasFailures = results.some(r => !r.success);
    if (hasFailures) {
      process.exit(1);
    }
    
  } catch (error: any) {
    spinner.fail('Template validation failed');
    throw error;
  }
}

async function runSecurityValidation(projectPath: string, options: any) {
  const spinner = ora('Running security validation...').start();
  
  try {
    // Run both code and dependency security checks
    const codeValidator = new CodeValidator();
    const dependencyValidator = new DependencyValidator();
    
    const [codeResults, dependencyResults] = await Promise.all([
      codeValidator.validateProject(projectPath),
      dependencyValidator.validateDependencies(projectPath)
    ]);
    
    spinner.stop();
    
    console.log(chalk.bold('Security Validation Report\n'));
    
    // Check for security-related code issues
    const securityIssues = codeResults.flatMap(r => 
      r.errors.filter(e => 
        e.message.toLowerCase().includes('security') ||
        e.message.toLowerCase().includes('vulnerability') ||
        e.rule?.includes('security')
      )
    );
    
    if (securityIssues.length > 0) {
      console.log(chalk.red('🚨 Security Issues in Code:'));
      for (const issue of securityIssues) {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      }
      console.log('');
    }
    
    // Show dependency vulnerabilities
    if (dependencyResults.vulnerabilities.length > 0) {
      console.log(chalk.red('🚨 Dependency Vulnerabilities:'));
      const criticalVulns = dependencyResults.vulnerabilities.filter(v => v.severity === 'critical');
      const highVulns = dependencyResults.vulnerabilities.filter(v => v.severity === 'high');
      
      console.log(`  Critical: ${criticalVulns.length}`);
      console.log(`  High: ${highVulns.length}`);
      console.log(`  Total: ${dependencyResults.vulnerabilities.length}`);
      console.log('');
    }
    
    // Show license issues
    if (dependencyResults.licenseIssues.length > 0) {
      console.log(chalk.yellow('⚖️ License Issues:'));
      for (const license of dependencyResults.licenseIssues) {
        console.log(`  ${license.package}: ${license.license} (${license.riskLevel} risk)`);
      }
      console.log('');
    }
    
    const hasSecurityIssues = securityIssues.length > 0 || 
                             dependencyResults.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length > 0;
    
    if (hasSecurityIssues) {
      console.log(chalk.red('❌ Security validation failed'));
      process.exit(1);
    } else {
      console.log(chalk.green('✅ Security validation passed'));
    }
    
  } catch (error: any) {
    spinner.fail('Security validation failed');
    throw error;
  }
}

async function runQualityGates(projectPath: string, options: any) {
  const spinner = ora('Running quality gates...').start();
  
  try {
    const gatesManager = new QualityGatesManager();
    
    const gateOptions = {
      skipOptional: options.skipOptional,
      failFast: options.failFast
    };
    
    let customGates: QualityGateConfig[] | undefined;
    
    if (options.gates) {
      const requestedGates = options.gates.split(',').map((g: string) => g.trim());
      // Filter default gates to only include requested ones
      const allGates = await gatesManager['getDefaultGates']();
      customGates = allGates.filter(gate => requestedGates.includes(gate.name));
      
      if (customGates.length === 0) {
        throw new Error(`No valid gates found in: ${options.gates}`);
      }
    }
    
    const report = await gatesManager.runQualityGates(projectPath, customGates, gateOptions);
    
    spinner.stop();
    
    const output = gatesManager.generateQualityGatesReport(report);
    console.log(output);
    
    if (options.reportFile) {
      await saveReport(options.reportFile, output, options.output);
    }
    
    if (report.overallResult === 'FAILED') {
      console.log(chalk.red('\n❌ Quality gates failed'));
      process.exit(1);
    } else if (report.overallResult === 'WARNING') {
      console.log(chalk.yellow('\n⚠️ Quality gates passed with warnings'));
    } else {
      console.log(chalk.green('\n✅ All quality gates passed'));
    }
    
  } catch (error: any) {
    spinner.fail('Quality gates failed');
    throw error;
  }
}

async function saveReport(filePath: string, content: string, format: string) {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    let output = content;
    
    if (format === 'json') {
      // Convert text report to JSON structure
      output = JSON.stringify({
        timestamp: new Date().toISOString(),
        report: content
      }, null, 2);
    } else if (format === 'junit') {
      // Convert to JUnit XML format (simplified)
      output = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="DevX Validation" tests="1" failures="0" errors="0" time="0">
  <testcase name="validation" classname="DevX">
    <system-out><![CDATA[${content}]]></system-out>
  </testcase>
</testsuite>`;
    }
    
    await fs.writeFile(filePath, output);
    console.log(chalk.gray(`Report saved to: ${filePath}`));
    
  } catch (error: any) {
    console.warn(chalk.yellow(`Warning: Could not save report to ${filePath}: ${error.message}`));
  }
}

// Add subcommands
validateCommand
  .command('code [path]')
  .description('Validate code syntax, linting, and type checking')
  .action((projectPath = process.cwd()) => {
    return runCodeValidation(path.resolve(projectPath), { type: 'code' });
  });

validateCommand
  .command('deps [path]')
  .description('Validate dependencies for security and license issues')
  .action((projectPath = process.cwd()) => {
    return runDependencyValidation(path.resolve(projectPath), { type: 'dependencies' });
  });

validateCommand
  .command('templates')
  .description('Validate all service templates')
  .option('-t, --template <name>', 'Validate specific template')
  .action((options) => {
    return runTemplateValidation(options);
  });

validateCommand
  .command('security [path]')
  .description('Run comprehensive security validation')
  .action((projectPath = process.cwd()) => {
    return runSecurityValidation(path.resolve(projectPath), { type: 'security' });
  });

validateCommand
  .command('gates [path]')
  .description('Run quality gates validation')
  .option('--gates <gates>', 'Comma-separated list of gates to run')
  .option('--skip-optional', 'Skip optional gates')
  .option('--fail-fast', 'Stop on first failure')
  .action((projectPath = process.cwd(), options) => {
    return runQualityGates(path.resolve(projectPath), options);
  });