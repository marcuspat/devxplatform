import { promises as fs } from 'fs';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { spawn, SpawnOptions } from 'child_process';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export interface ValidationResult {
  valid: boolean;
  language: string;
  validator: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics?: ValidationMetrics;
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'critical';
  rule?: string;
}

export interface ValidationWarning {
  file: string;
  line?: number;
  column?: number;
  message: string;
  rule?: string;
}

export interface ValidationMetrics {
  totalFiles: number;
  totalLines: number;
  complexityScore?: number;
  testCoverage?: number;
  duplicateLines?: number;
}

export interface LanguageConfig {
  language: string;
  fileExtensions: string[];
  validators: ValidatorConfig[];
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
  formatCommand?: string;
}

export interface ValidatorConfig {
  name: string;
  command: string;
  args: string[];
  parseOutput: (output: string, stderr: string) => ValidationResult;
  required: boolean;
  timeout?: number;
}

export class CodeValidator {
  private languageConfigs: Map<string, LanguageConfig> = new Map();

  constructor() {
    this.initializeLanguageConfigs();
  }

  private initializeLanguageConfigs() {
    // TypeScript/JavaScript configuration
    this.languageConfigs.set('typescript', {
      language: 'typescript',
      fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      buildCommand: 'npm run build',
      testCommand: 'npm test',
      lintCommand: 'npm run lint',
      formatCommand: 'npm run format',
      validators: [
        {
          name: 'typescript-compiler',
          command: 'npx',
          args: ['tsc', '--noEmit'],
          parseOutput: this.parseTypeScriptOutput.bind(this),
          required: true,
          timeout: 60000
        },
        {
          name: 'eslint',
          command: 'npx',
          args: ['eslint', '--format', 'json'],
          parseOutput: this.parseESLintOutput.bind(this),
          required: true,
          timeout: 30000
        },
        {
          name: 'jest',
          command: 'npm',
          args: ['test', '--passWithNoTests', '--coverage', '--json'],
          parseOutput: this.parseJestOutput.bind(this),
          required: false,
          timeout: 120000
        }
      ]
    });

    // Go configuration
    this.languageConfigs.set('go', {
      language: 'go',
      fileExtensions: ['.go'],
      buildCommand: 'go build',
      testCommand: 'go test',
      lintCommand: 'golangci-lint run',
      validators: [
        {
          name: 'go-build',
          command: 'go',
          args: ['build', './...'],
          parseOutput: this.parseGoBuildOutput.bind(this),
          required: true,
          timeout: 60000
        },
        {
          name: 'go-test',
          command: 'go',
          args: ['test', '-json', './...'],
          parseOutput: this.parseGoTestOutput.bind(this),
          required: false,
          timeout: 120000
        },
        {
          name: 'go-vet',
          command: 'go',
          args: ['vet', './...'],
          parseOutput: this.parseGoVetOutput.bind(this),
          required: true,
          timeout: 30000
        },
        {
          name: 'golangci-lint',
          command: 'golangci-lint',
          args: ['run', '--out-format', 'json'],
          parseOutput: this.parseGolangCIOutput.bind(this),
          required: false,
          timeout: 60000
        }
      ]
    });

    // Python configuration
    this.languageConfigs.set('python', {
      language: 'python',
      fileExtensions: ['.py'],
      buildCommand: 'python -m compileall .',
      testCommand: 'python -m pytest',
      lintCommand: 'flake8',
      formatCommand: 'black',
      validators: [
        {
          name: 'python-compile',
          command: 'python',
          args: ['-m', 'compileall', '-q', '.'],
          parseOutput: this.parsePythonCompileOutput.bind(this),
          required: true,
          timeout: 30000
        },
        {
          name: 'flake8',
          command: 'flake8',
          args: ['--format=json'],
          parseOutput: this.parseFlake8Output.bind(this),
          required: true,
          timeout: 60000
        },
        {
          name: 'pytest',
          command: 'python',
          args: ['-m', 'pytest', '--json-report', '--json-report-file=/tmp/pytest-report.json'],
          parseOutput: this.parsePytestOutput.bind(this),
          required: false,
          timeout: 120000
        },
        {
          name: 'mypy',
          command: 'mypy',
          args: ['--json-report', '/tmp/mypy-report', '.'],
          parseOutput: this.parseMypyOutput.bind(this),
          required: false,
          timeout: 60000
        }
      ]
    });

    // Java configuration
    this.languageConfigs.set('java', {
      language: 'java',
      fileExtensions: ['.java'],
      buildCommand: 'mvn compile',
      testCommand: 'mvn test',
      lintCommand: 'mvn checkstyle:check',
      validators: [
        {
          name: 'javac',
          command: 'javac',
          args: ['-cp', '.', '*.java'],
          parseOutput: this.parseJavacOutput.bind(this),
          required: true,
          timeout: 60000
        },
        {
          name: 'maven-compile',
          command: 'mvn',
          args: ['compile'],
          parseOutput: this.parseMavenOutput.bind(this),
          required: false,
          timeout: 120000
        }
      ]
    });

    // Rust configuration
    this.languageConfigs.set('rust', {
      language: 'rust',
      fileExtensions: ['.rs'],
      buildCommand: 'cargo build',
      testCommand: 'cargo test',
      lintCommand: 'cargo clippy',
      validators: [
        {
          name: 'cargo-check',
          command: 'cargo',
          args: ['check', '--message-format=json'],
          parseOutput: this.parseCargoOutput.bind(this),
          required: true,
          timeout: 120000
        },
        {
          name: 'cargo-test',
          command: 'cargo',
          args: ['test', '--no-run'],
          parseOutput: this.parseCargoTestOutput.bind(this),
          required: false,
          timeout: 120000
        },
        {
          name: 'clippy',
          command: 'cargo',
          args: ['clippy', '--message-format=json', '--', '-D', 'warnings'],
          parseOutput: this.parseClippyOutput.bind(this),
          required: false,
          timeout: 60000
        }
      ]
    });
  }

  async validateProject(projectPath: string): Promise<ValidationResult[]> {
    logger.info(`Starting validation for project: ${projectPath}`);
    
    const language = await this.detectLanguage(projectPath);
    if (!language) {
      throw new Error('Unable to determine project language');
    }

    const config = this.languageConfigs.get(language);
    if (!config) {
      throw new Error(`No validation configuration found for language: ${language}`);
    }

    const results: ValidationResult[] = [];
    const cwd = projectPath;

    // Install dependencies first if needed
    await this.installDependencies(projectPath, language);

    for (const validator of config.validators) {
      try {
        logger.info(`Running ${validator.name} validation...`);
        const result = await this.runValidator(validator, cwd);
        results.push(result);

        if (validator.required && !result.valid) {
          logger.error(`Required validator ${validator.name} failed`);
          break; // Stop on first required failure
        }
      } catch (error: any) {
        logger.error(`Validator ${validator.name} encountered an error:`, error.message);
        results.push({
          valid: false,
          language,
          validator: validator.name,
          errors: [{
            file: '',
            message: `Validator error: ${error.message}`,
            severity: 'critical'
          }],
          warnings: []
        });

        if (validator.required) {
          break; // Stop on required validator error
        }
      }
    }

    return results;
  }

  private async detectLanguage(projectPath: string): Promise<string | null> {
    try {
      // Check for package.json (Node.js/TypeScript)
      if (await this.fileExists(path.join(projectPath, 'package.json'))) {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
        );
        
        // Check if TypeScript is in dependencies or has TypeScript files
        if (packageJson.devDependencies?.typescript || 
            packageJson.dependencies?.typescript ||
            await this.hasFilesWithExtension(projectPath, ['.ts', '.tsx'])) {
          return 'typescript';
        }
        return 'javascript';
      }

      // Check for go.mod (Go)
      if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
        return 'go';
      }

      // Check for requirements.txt or setup.py (Python)
      if (await this.fileExists(path.join(projectPath, 'requirements.txt')) ||
          await this.fileExists(path.join(projectPath, 'setup.py')) ||
          await this.fileExists(path.join(projectPath, 'pyproject.toml'))) {
        return 'python';
      }

      // Check for pom.xml or build.gradle (Java)
      if (await this.fileExists(path.join(projectPath, 'pom.xml')) ||
          await this.fileExists(path.join(projectPath, 'build.gradle'))) {
        return 'java';
      }

      // Check for Cargo.toml (Rust)
      if (await this.fileExists(path.join(projectPath, 'Cargo.toml'))) {
        return 'rust';
      }

      return null;
    } catch (error: any) {
      logger.error('Error detecting language:', error.message);
      return null;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async hasFilesWithExtension(dir: string, extensions: string[]): Promise<boolean> {
    try {
      const files = await fs.readdir(dir, { recursive: true });
      return files.some(file => 
        extensions.some(ext => file.toString().endsWith(ext))
      );
    } catch {
      return false;
    }
  }

  private async installDependencies(projectPath: string, language: string): Promise<void> {
    const cwd = projectPath;
    
    try {
      switch (language) {
        case 'typescript':
        case 'javascript':
          if (await this.fileExists(path.join(projectPath, 'package.json'))) {
            logger.info('Installing Node.js dependencies...');
            await this.executeCommand('npm', ['install'], cwd, 120000);
          }
          break;
        
        case 'go':
          if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
            logger.info('Installing Go dependencies...');
            await this.executeCommand('go', ['mod', 'download'], cwd, 60000);
          }
          break;
        
        case 'python':
          if (await this.fileExists(path.join(projectPath, 'requirements.txt'))) {
            logger.info('Installing Python dependencies...');
            await this.executeCommand('pip', ['install', '-r', 'requirements.txt'], cwd, 120000);
          }
          break;
      }
    } catch (error: any) {
      logger.warn(`Failed to install dependencies: ${error.message}`);
    }
  }

  private async runValidator(validator: ValidatorConfig, cwd: string): Promise<ValidationResult> {
    const { stdout, stderr } = await this.executeCommand(
      validator.command,
      validator.args,
      cwd,
      validator.timeout || 30000
    );

    return validator.parseOutput(stdout, stderr);
  }

  private async executeCommand(
    command: string,
    args: string[],
    cwd: string,
    timeout: number = 30000
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const options: SpawnOptions = {
        cwd,
        shell: true,
        stdio: 'pipe'
      };

      const child = spawn(command, args, options);
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
        if (code === 0 || (command === 'npm' && args[0] === 'test')) {
          resolve({ stdout, stderr });
        } else {
          resolve({ stdout, stderr }); // Don't reject, let parsers handle errors
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  // Output parsers for each language/tool
  private parseTypeScriptOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse TypeScript compiler output
    const lines = stderr.split('\n');
    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)$/);
      if (match) {
        const [, file, lineNum, colNum, severity, code, message] = match;
        
        if (severity === 'error') {
          errors.push({
            file,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            message,
            severity: 'error',
            rule: `TS${code}`
          });
        } else {
          warnings.push({
            file,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            message,
            rule: `TS${code}`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'typescript',
      validator: 'typescript-compiler',
      errors,
      warnings
    };
  }

  private parseESLintOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const results = JSON.parse(stdout);
      
      for (const result of results) {
        for (const message of result.messages) {
          if (message.severity === 2) {
            errors.push({
              file: result.filePath,
              line: message.line,
              column: message.column,
              message: message.message,
              severity: 'error',
              rule: message.ruleId
            });
          } else {
            warnings.push({
              file: result.filePath,
              line: message.line,
              column: message.column,
              message: message.message,
              rule: message.ruleId
            });
          }
        }
      }
    } catch (error) {
      // If JSON parsing fails, try to parse text output
      errors.push({
        file: '',
        message: 'ESLint output parsing failed',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'typescript',
      validator: 'eslint',
      errors,
      warnings
    };
  }

  private parseJestOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let metrics: ValidationMetrics | undefined;

    try {
      const result = JSON.parse(stdout);
      
      if (result.testResults) {
        for (const testFile of result.testResults) {
          for (const assertionResult of testFile.assertionResults) {
            if (assertionResult.status === 'failed') {
              errors.push({
                file: testFile.name,
                message: assertionResult.failureMessages?.[0] || 'Test failed',
                severity: 'error'
              });
            }
          }
        }
      }

      if (result.coverageMap) {
        const coverage = result.coverageMap;
        const totalLines = Object.values(coverage).reduce((sum: number, file: any) => 
          sum + (file.s ? Object.keys(file.s).length : 0), 0);
        
        metrics = {
          totalFiles: Object.keys(coverage).length,
          totalLines,
          testCoverage: result.coverageMap.total?.lines?.pct || 0
        };
      }
    } catch (error) {
      errors.push({
        file: '',
        message: 'Jest output parsing failed',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'typescript',
      validator: 'jest',
      errors,
      warnings,
      metrics
    };
  }

  private parseGoBuildOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const lines = stderr.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const match = line.match(/^(.+?):(\d+):(\d+): (.+)$/);
        if (match) {
          const [, file, lineNum, colNum, message] = match;
          errors.push({
            file,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            message,
            severity: 'error'
          });
        } else if (line.includes('error')) {
          errors.push({
            file: '',
            message: line,
            severity: 'error'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'go',
      validator: 'go-build',
      errors,
      warnings
    };
  }

  private parseGoTestOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const result = JSON.parse(line);
          
          if (result.Action === 'fail' && result.Test) {
            errors.push({
              file: result.Package || '',
              message: `Test failed: ${result.Test}`,
              severity: 'error'
            });
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } catch (error) {
      errors.push({
        file: '',
        message: 'Go test output parsing failed',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'go',
      validator: 'go-test',
      errors,
      warnings
    };
  }

  private parseGoVetOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const lines = stderr.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const match = line.match(/^(.+?):(\d+):(\d+): (.+)$/);
        if (match) {
          const [, file, lineNum, colNum, message] = match;
          errors.push({
            file,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            message,
            severity: 'error'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'go',
      validator: 'go-vet',
      errors,
      warnings
    };
  }

  private parseGolangCIOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const result = JSON.parse(stdout);
      
      if (result.Issues) {
        for (const issue of result.Issues) {
          if (issue.Severity === 'error') {
            errors.push({
              file: issue.Pos.Filename,
              line: issue.Pos.Line,
              column: issue.Pos.Column,
              message: issue.Text,
              severity: 'error',
              rule: issue.FromLinter
            });
          } else {
            warnings.push({
              file: issue.Pos.Filename,
              line: issue.Pos.Line,
              column: issue.Pos.Column,
              message: issue.Text,
              rule: issue.FromLinter
            });
          }
        }
      }
    } catch (error) {
      // If golangci-lint is not available, don't fail
      warnings.push({
        file: '',
        message: 'golangci-lint not available',
        rule: 'setup'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'go',
      validator: 'golangci-lint',
      errors,
      warnings
    };
  }

  private parsePythonCompileOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const lines = stderr.split('\n');
    for (const line of lines) {
      if (line.includes('SyntaxError') || line.includes('Error')) {
        const match = line.match(/File "(.+?)", line (\d+)/);
        if (match) {
          const [, file, lineNum] = match;
          errors.push({
            file,
            line: parseInt(lineNum),
            message: line,
            severity: 'error'
          });
        } else {
          errors.push({
            file: '',
            message: line,
            severity: 'error'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'python',
      validator: 'python-compile',
      errors,
      warnings
    };
  }

  private parseFlake8Output(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const results = JSON.parse(stdout);
      
      for (const file in results) {
        for (const issue of results[file]) {
          if (issue.code.startsWith('E')) {
            errors.push({
              file,
              line: issue.line_number,
              column: issue.column_number,
              message: issue.text,
              severity: 'error',
              rule: issue.code
            });
          } else {
            warnings.push({
              file,
              line: issue.line_number,
              column: issue.column_number,
              message: issue.text,
              rule: issue.code
            });
          }
        }
      }
    } catch (error) {
      // Parse text format if JSON fails
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+?):(\d+):(\d+): ([EW]\d+) (.+)$/);
        if (match) {
          const [, file, lineNum, colNum, code, message] = match;
          
          if (code.startsWith('E')) {
            errors.push({
              file,
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message,
              severity: 'error',
              rule: code
            });
          } else {
            warnings.push({
              file,
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message,
              rule: code
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'python',
      validator: 'flake8',
      errors,
      warnings
    };
  }

  private parsePytestOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const reportFile = '/tmp/pytest-report.json';
      if (existsSync(reportFile)) {
        const report = JSON.parse(readFileSync(reportFile, 'utf-8'));
        
        if (report.tests) {
          for (const test of report.tests) {
            if (test.outcome === 'failed') {
              errors.push({
                file: test.nodeid.split('::')[0],
                message: `Test failed: ${test.nodeid}`,
                severity: 'error'
              });
            }
          }
        }
      }
    } catch (error) {
      errors.push({
        file: '',
        message: 'Pytest output parsing failed',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'python',
      validator: 'pytest',
      errors,
      warnings
    };
  }

  private parseMypyOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+): (error|warning): (.+)$/);
      if (match) {
        const [, file, lineNum, severity, message] = match;
        
        if (severity === 'error') {
          errors.push({
            file,
            line: parseInt(lineNum),
            message,
            severity: 'error'
          });
        } else {
          warnings.push({
            file,
            line: parseInt(lineNum),
            message
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'python',
      validator: 'mypy',
      errors,
      warnings
    };
  }

  private parseJavacOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const lines = stderr.split('\n');
    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+): (error|warning): (.+)$/);
      if (match) {
        const [, file, lineNum, severity, message] = match;
        
        if (severity === 'error') {
          errors.push({
            file,
            line: parseInt(lineNum),
            message,
            severity: 'error'
          });
        } else {
          warnings.push({
            file,
            line: parseInt(lineNum),
            message
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      language: 'java',
      validator: 'javac',
      errors,
      warnings
    };
  }

  private parseMavenOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (stderr.includes('BUILD FAILURE')) {
      errors.push({
        file: '',
        message: 'Maven build failed',
        severity: 'error'
      });
    }

    const lines = stderr.split('\n');
    for (const line of lines) {
      if (line.includes('[ERROR]')) {
        errors.push({
          file: '',
          message: line.replace('[ERROR]', '').trim(),
          severity: 'error'
        });
      } else if (line.includes('[WARNING]')) {
        warnings.push({
          file: '',
          message: line.replace('[WARNING]', '').trim()
        });
      }
    }

    return {
      valid: errors.length === 0,
      language: 'java',
      validator: 'maven-compile',
      errors,
      warnings
    };
  }

  private parseCargoOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          
          if (message.message && message.message.level === 'error') {
            errors.push({
              file: message.message.spans?.[0]?.file_name || '',
              line: message.message.spans?.[0]?.line_start,
              column: message.message.spans?.[0]?.column_start,
              message: message.message.message,
              severity: 'error'
            });
          } else if (message.message && message.message.level === 'warning') {
            warnings.push({
              file: message.message.spans?.[0]?.file_name || '',
              line: message.message.spans?.[0]?.line_start,
              column: message.message.spans?.[0]?.column_start,
              message: message.message.message
            });
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } catch (error) {
      errors.push({
        file: '',
        message: 'Cargo output parsing failed',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'rust',
      validator: 'cargo-check',
      errors,
      warnings
    };
  }

  private parseCargoTestOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (stderr.includes('error:') || stdout.includes('FAILED')) {
      errors.push({
        file: '',
        message: 'Cargo test compilation failed',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'rust',
      validator: 'cargo-test',
      errors,
      warnings
    };
  }

  private parseClippyOutput(stdout: string, stderr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          
          if (message.message && message.message.level === 'error') {
            errors.push({
              file: message.message.spans?.[0]?.file_name || '',
              line: message.message.spans?.[0]?.line_start,
              column: message.message.spans?.[0]?.column_start,
              message: message.message.message,
              severity: 'error'
            });
          } else if (message.message && message.message.level === 'warning') {
            warnings.push({
              file: message.message.spans?.[0]?.file_name || '',
              line: message.message.spans?.[0]?.line_start,
              column: message.message.spans?.[0]?.column_start,
              message: message.message.message
            });
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } catch (error) {
      warnings.push({
        file: '',
        message: 'Clippy not available'
      });
    }

    return {
      valid: errors.length === 0,
      language: 'rust',
      validator: 'clippy',
      errors,
      warnings
    };
  }

  generateValidationReport(results: ValidationResult[]): string {
    let report = '\n' + chalk.bold('Code Validation Report') + '\n';
    report += chalk.gray('='.repeat(50)) + '\n\n';

    let totalErrors = 0;
    let totalWarnings = 0;
    let validValidators = 0;

    for (const result of results) {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      
      if (result.valid) {
        validValidators++;
        report += chalk.green(`✓ ${result.validator}`);
      } else {
        report += chalk.red(`✗ ${result.validator}`);
      }
      
      if (result.errors.length > 0) {
        report += chalk.red(` (${result.errors.length} errors)`);
      }
      if (result.warnings.length > 0) {
        report += chalk.yellow(` (${result.warnings.length} warnings)`);
      }
      
      report += '\n';

      // Show first few errors/warnings for each validator
      const maxShown = 3;
      
      if (result.errors.length > 0) {
        report += chalk.red('  Errors:\n');
        for (const error of result.errors.slice(0, maxShown)) {
          report += `    ${error.file}:${error.line || '?'} - ${error.message}\n`;
        }
        if (result.errors.length > maxShown) {
          report += chalk.gray(`    ... and ${result.errors.length - maxShown} more errors\n`);
        }
      }

      if (result.warnings.length > 0) {
        report += chalk.yellow('  Warnings:\n');
        for (const warning of result.warnings.slice(0, maxShown)) {
          report += `    ${warning.file}:${warning.line || '?'} - ${warning.message}\n`;
        }
        if (result.warnings.length > maxShown) {
          report += chalk.gray(`    ... and ${result.warnings.length - maxShown} more warnings\n`);
        }
      }

      if (result.metrics) {
        report += chalk.blue('  Metrics:\n');
        if (result.metrics.totalFiles) {
          report += `    Files: ${result.metrics.totalFiles}\n`;
        }
        if (result.metrics.totalLines) {
          report += `    Lines: ${result.metrics.totalLines}\n`;
        }
        if (result.metrics.testCoverage !== undefined) {
          report += `    Test Coverage: ${result.metrics.testCoverage}%\n`;
        }
      }

      report += '\n';
    }

    // Summary
    report += chalk.bold('Summary:\n');
    report += `${chalk.green(`${validValidators}/${results.length} validators passed`)}\n`;
    report += `${chalk.red(`${totalErrors} total errors`)}\n`;
    report += `${chalk.yellow(`${totalWarnings} total warnings`)}\n`;

    const overallValid = totalErrors === 0;
    report += '\n' + chalk.bold(`Overall Result: ${overallValid ? chalk.green('VALID') : chalk.red('INVALID')}`);

    return report;
  }
}