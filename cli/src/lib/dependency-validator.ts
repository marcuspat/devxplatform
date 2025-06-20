import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export interface DependencyVulnerability {
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  title: string;
  description: string;
  cve?: string;
  cwe?: string;
  fixedIn?: string;
  recommendation: string;
}

export interface DependencyLicense {
  package: string;
  version: string;
  license: string;
  compatible: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface DependencyValidationResult {
  language: string;
  packageManager: string;
  totalDependencies: number;
  vulnerabilities: DependencyVulnerability[];
  licenseIssues: DependencyLicense[];
  outdatedPackages: OutdatedPackage[];
  duplicatePackages: DuplicatePackage[];
  unusedPackages: string[];
  valid: boolean;
  riskScore: number;
  recommendations: string[];
}

export interface OutdatedPackage {
  package: string;
  current: string;
  wanted: string;
  latest: string;
  location: string;
}

export interface DuplicatePackage {
  package: string;
  versions: string[];
  locations: string[];
}

// Allowed licenses (from most permissive to least)
const APPROVED_LICENSES = [
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 
  'WTFPL', 'Unlicense', 'CC0-1.0', 'Python-2.0', 'MPL-2.0'
];

const RISKY_LICENSES = [
  'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0',
  'CDDL-1.0', 'EPL-1.0', 'EPL-2.0'
];

const PROHIBITED_LICENSES = [
  'AGPL-1.0', 'AGPL-3.0', 'GPL-1.0', 'GPL-2.0-only', 'GPL-3.0-only',
  'LGPL-2.0', 'LGPL-2.1-only', 'LGPL-3.0-only'
];

export class DependencyValidator {
  
  async validateDependencies(projectPath: string): Promise<DependencyValidationResult> {
    logger.info(`Validating dependencies for project: ${projectPath}`);
    
    const language = await this.detectLanguage(projectPath);
    const packageManager = await this.detectPackageManager(projectPath);
    
    if (!packageManager) {
      throw new Error('Unable to determine package manager');
    }

    const result: DependencyValidationResult = {
      language,
      packageManager,
      totalDependencies: 0,
      vulnerabilities: [],
      licenseIssues: [],
      outdatedPackages: [],
      duplicatePackages: [],
      unusedPackages: [],
      valid: true,
      riskScore: 0,
      recommendations: []
    };

    try {
      // Run security audit
      result.vulnerabilities = await this.runSecurityAudit(projectPath, packageManager);
      
      // Check licenses
      result.licenseIssues = await this.checkLicenses(projectPath, packageManager);
      
      // Check for outdated packages
      result.outdatedPackages = await this.checkOutdatedPackages(projectPath, packageManager);
      
      // Check for duplicate packages
      result.duplicatePackages = await this.checkDuplicatePackages(projectPath, packageManager);
      
      // Check for unused packages (basic check)
      result.unusedPackages = await this.checkUnusedPackages(projectPath, packageManager);
      
      // Get total dependency count
      result.totalDependencies = await this.getTotalDependencies(projectPath, packageManager);
      
      // Calculate risk score and determine validity
      result.riskScore = this.calculateRiskScore(result);
      result.valid = this.isValid(result);
      
      // Generate recommendations
      result.recommendations = this.generateRecommendations(result);
      
    } catch (error: any) {
      logger.error('Dependency validation failed:', error.message);
      result.valid = false;
      result.recommendations.push(`Dependency validation failed: ${error.message}`);
    }

    return result;
  }

  private async detectLanguage(projectPath: string): Promise<string> {
    if (await this.fileExists(path.join(projectPath, 'package.json'))) {
      return 'javascript';
    }
    if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
      return 'go';
    }
    if (await this.fileExists(path.join(projectPath, 'requirements.txt')) ||
        await this.fileExists(path.join(projectPath, 'Pipfile')) ||
        await this.fileExists(path.join(projectPath, 'pyproject.toml'))) {
      return 'python';
    }
    if (await this.fileExists(path.join(projectPath, 'pom.xml'))) {
      return 'java-maven';
    }
    if (await this.fileExists(path.join(projectPath, 'build.gradle'))) {
      return 'java-gradle';
    }
    if (await this.fileExists(path.join(projectPath, 'Cargo.toml'))) {
      return 'rust';
    }
    return 'unknown';
  }

  private async detectPackageManager(projectPath: string): Promise<string> {
    if (await this.fileExists(path.join(projectPath, 'package-lock.json'))) {
      return 'npm';
    }
    if (await this.fileExists(path.join(projectPath, 'yarn.lock'))) {
      return 'yarn';
    }
    if (await this.fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (await this.fileExists(path.join(projectPath, 'package.json'))) {
      return 'npm'; // Default to npm for Node.js projects
    }
    if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
      return 'go';
    }
    if (await this.fileExists(path.join(projectPath, 'requirements.txt'))) {
      return 'pip';
    }
    if (await this.fileExists(path.join(projectPath, 'Pipfile'))) {
      return 'pipenv';
    }
    if (await this.fileExists(path.join(projectPath, 'poetry.lock'))) {
      return 'poetry';
    }
    if (await this.fileExists(path.join(projectPath, 'pom.xml'))) {
      return 'maven';
    }
    if (await this.fileExists(path.join(projectPath, 'build.gradle'))) {
      return 'gradle';
    }
    if (await this.fileExists(path.join(projectPath, 'Cargo.toml'))) {
      return 'cargo';
    }
    return '';
  }

  private async runSecurityAudit(projectPath: string, packageManager: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      switch (packageManager) {
        case 'npm':
        case 'yarn':
        case 'pnpm':
          return await this.runNpmAudit(projectPath);
        
        case 'pip':
        case 'pipenv':
        case 'poetry':
          return await this.runPythonSecurityAudit(projectPath);
        
        case 'go':
          return await this.runGoSecurityAudit(projectPath);
        
        case 'maven':
          return await this.runMavenSecurityAudit(projectPath);
        
        case 'gradle':
          return await this.runGradleSecurityAudit(projectPath);
        
        case 'cargo':
          return await this.runCargoSecurityAudit(projectPath);
        
        default:
          logger.warn(`Security audit not implemented for package manager: ${packageManager}`);
      }
    } catch (error: any) {
      logger.warn(`Security audit failed: ${error.message}`);
    }

    return vulnerabilities;
  }

  private async runNpmAudit(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      const { stdout } = await this.executeCommand('npm', ['audit', '--json'], projectPath);
      const auditResult = JSON.parse(stdout);

      if (auditResult.advisories) {
        for (const advisory of Object.values(auditResult.advisories) as any[]) {
          vulnerabilities.push({
            package: advisory.module_name,
            version: advisory.findings[0]?.version || 'unknown',
            severity: advisory.severity,
            title: advisory.title,
            description: advisory.overview,
            cve: advisory.cves?.[0],
            cwe: advisory.cwe?.[0],
            fixedIn: advisory.patched_versions,
            recommendation: advisory.recommendation
          });
        }
      }

      if (auditResult.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities) as any[]) {
          if (vulnData.via && Array.isArray(vulnData.via)) {
            for (const via of vulnData.via) {
              if (typeof via === 'object') {
                vulnerabilities.push({
                  package: packageName,
                  version: via.range || 'unknown',
                  severity: via.severity,
                  title: via.title,
                  description: via.source?.toString() || 'No description available',
                  recommendation: `Update to ${vulnData.fixAvailable ? 'available fix version' : 'a secure version'}`
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn(`npm audit failed: ${error.message}`);
    }

    return vulnerabilities;
  }

  private async runPythonSecurityAudit(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Try safety first (requires pip install safety)
      const { stdout } = await this.executeCommand('safety', ['check', '--json'], projectPath);
      const safetyResult = JSON.parse(stdout);

      for (const vuln of safetyResult) {
        vulnerabilities.push({
          package: vuln.package,
          version: vuln.installed_version,
          severity: this.mapPythonSeverity(vuln.vulnerability_id),
          title: `Vulnerability in ${vuln.package}`,
          description: vuln.advisory,
          recommendation: `Update to version ${vuln.fixed_versions?.join(' or ') || 'latest'}`
        });
      }
    } catch (error: any) {
      // Fallback to bandit for code-level security issues
      try {
        const { stdout } = await this.executeCommand('bandit', ['-r', '.', '-f', 'json'], projectPath);
        const banditResult = JSON.parse(stdout);

        if (banditResult.results) {
          for (const issue of banditResult.results) {
            vulnerabilities.push({
              package: 'code-analysis',
              version: '',
              severity: issue.issue_severity.toLowerCase() as any,
              title: issue.test_name,
              description: issue.issue_text,
              recommendation: 'Review and fix security issue in code'
            });
          }
        }
      } catch (banditError: any) {
        logger.warn(`Python security audit failed: ${banditError.message}`);
      }
    }

    return vulnerabilities;
  }

  private mapPythonSeverity(vulnId: string): 'critical' | 'high' | 'moderate' | 'low' | 'info' {
    // Simple mapping based on vulnerability ID patterns
    if (vulnId.includes('CRITICAL')) return 'critical';
    if (vulnId.includes('HIGH')) return 'high';
    if (vulnId.includes('MEDIUM')) return 'moderate';
    if (vulnId.includes('LOW')) return 'low';
    return 'moderate'; // Default
  }

  private async runGoSecurityAudit(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Use govulncheck if available
      const { stdout } = await this.executeCommand('govulncheck', ['-json', './...'], projectPath);
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const result = JSON.parse(line);
          
          if (result.finding) {
            vulnerabilities.push({
              package: result.finding.osv,
              version: '',
              severity: 'moderate', // govulncheck doesn't provide severity
              title: result.finding.summary,
              description: result.finding.details,
              recommendation: 'Update affected dependencies'
            });
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } catch (error: any) {
      logger.warn(`Go security audit failed: ${error.message}`);
    }

    return vulnerabilities;
  }

  private async runMavenSecurityAudit(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Use OWASP Dependency Check plugin
      const { stdout } = await this.executeCommand('mvn', [
        'org.owasp:dependency-check-maven:check',
        '-Dformat=JSON'
      ], projectPath);

      // Parse the generated JSON report
      const reportPath = path.join(projectPath, 'target', 'dependency-check-report.json');
      if (await this.fileExists(reportPath)) {
        const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
        
        if (report.dependencies) {
          for (const dep of report.dependencies) {
            if (dep.vulnerabilities) {
              for (const vuln of dep.vulnerabilities) {
                vulnerabilities.push({
                  package: dep.fileName,
                  version: dep.packages?.[0]?.id || 'unknown',
                  severity: this.mapCvssToSeverity(vuln.cvssV3?.baseScore || vuln.cvssV2?.score || 0),
                  title: vuln.name,
                  description: vuln.description,
                  cve: vuln.name.startsWith('CVE-') ? vuln.name : undefined,
                  recommendation: 'Update to a patched version'
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn(`Maven security audit failed: ${error.message}`);
    }

    return vulnerabilities;
  }

  private async runGradleSecurityAudit(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Use OWASP Dependency Check plugin for Gradle
      const { stdout } = await this.executeCommand('gradle', ['dependencyCheckAnalyze'], projectPath);

      // Parse the generated JSON report
      const reportPath = path.join(projectPath, 'build', 'reports', 'dependency-check-report.json');
      if (await this.fileExists(reportPath)) {
        const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
        
        if (report.dependencies) {
          for (const dep of report.dependencies) {
            if (dep.vulnerabilities) {
              for (const vuln of dep.vulnerabilities) {
                vulnerabilities.push({
                  package: dep.fileName,
                  version: dep.packages?.[0]?.id || 'unknown',
                  severity: this.mapCvssToSeverity(vuln.cvssV3?.baseScore || vuln.cvssV2?.score || 0),
                  title: vuln.name,
                  description: vuln.description,
                  cve: vuln.name.startsWith('CVE-') ? vuln.name : undefined,
                  recommendation: 'Update to a patched version'
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn(`Gradle security audit failed: ${error.message}`);
    }

    return vulnerabilities;
  }

  private async runCargoSecurityAudit(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Use cargo audit
      const { stdout } = await this.executeCommand('cargo', ['audit', '--json'], projectPath);
      const auditResult = JSON.parse(stdout);

      if (auditResult.vulnerabilities?.list) {
        for (const vuln of auditResult.vulnerabilities.list) {
          vulnerabilities.push({
            package: vuln.package.name,
            version: vuln.package.version,
            severity: 'moderate', // cargo audit doesn't provide severity levels
            title: vuln.advisory.title,
            description: vuln.advisory.description,
            recommendation: `Update to version ${vuln.versions.patched.join(' or ')}`
          });
        }
      }
    } catch (error: any) {
      logger.warn(`Cargo security audit failed: ${error.message}`);
    }

    return vulnerabilities;
  }

  private mapCvssToSeverity(score: number): 'critical' | 'high' | 'moderate' | 'low' | 'info' {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'moderate';
    if (score > 0) return 'low';
    return 'info';
  }

  private async checkLicenses(projectPath: string, packageManager: string): Promise<DependencyLicense[]> {
    const licenseIssues: DependencyLicense[] = [];

    try {
      switch (packageManager) {
        case 'npm':
        case 'yarn':
        case 'pnpm':
          return await this.checkNpmLicenses(projectPath);
        
        case 'pip':
        case 'pipenv':
        case 'poetry':
          return await this.checkPythonLicenses(projectPath);
        
        default:
          logger.warn(`License checking not implemented for package manager: ${packageManager}`);
      }
    } catch (error: any) {
      logger.warn(`License check failed: ${error.message}`);
    }

    return licenseIssues;
  }

  private async checkNpmLicenses(projectPath: string): Promise<DependencyLicense[]> {
    const licenseIssues: DependencyLicense[] = [];

    try {
      // Use license-checker package if available
      const { stdout } = await this.executeCommand('npx', ['license-checker', '--json'], projectPath);
      const licenses = JSON.parse(stdout);

      for (const [packageInfo, licenseData] of Object.entries(licenses) as any[]) {
        const [packageName, version] = packageInfo.split('@');
        const license = licenseData.licenses;

        const riskLevel = this.assessLicenseRisk(license);
        if (riskLevel !== 'low') {
          licenseIssues.push({
            package: packageName,
            version,
            license,
            compatible: !PROHIBITED_LICENSES.includes(license),
            riskLevel,
            notes: this.getLicenseNotes(license)
          });
        }
      }
    } catch (error: any) {
      logger.warn(`npm license check failed: ${error.message}`);
    }

    return licenseIssues;
  }

  private async checkPythonLicenses(projectPath: string): Promise<DependencyLicense[]> {
    const licenseIssues: DependencyLicense[] = [];

    try {
      // Use pip-licenses if available
      const { stdout } = await this.executeCommand('pip-licenses', ['--format=json'], projectPath);
      const licenses = JSON.parse(stdout);

      for (const licenseData of licenses) {
        const license = licenseData.License;
        const riskLevel = this.assessLicenseRisk(license);
        
        if (riskLevel !== 'low') {
          licenseIssues.push({
            package: licenseData.Name,
            version: licenseData.Version,
            license,
            compatible: !PROHIBITED_LICENSES.includes(license),
            riskLevel,
            notes: this.getLicenseNotes(license)
          });
        }
      }
    } catch (error: any) {
      logger.warn(`Python license check failed: ${error.message}`);
    }

    return licenseIssues;
  }

  private assessLicenseRisk(license: string): 'low' | 'medium' | 'high' {
    if (PROHIBITED_LICENSES.includes(license)) {
      return 'high';
    }
    if (RISKY_LICENSES.includes(license)) {
      return 'medium';
    }
    if (APPROVED_LICENSES.includes(license)) {
      return 'low';
    }
    return 'medium'; // Unknown licenses are medium risk
  }

  private getLicenseNotes(license: string): string {
    const notes: Record<string, string> = {
      'GPL-2.0': 'Copyleft license - requires source code disclosure',
      'GPL-3.0': 'Strong copyleft license - requires source code disclosure',
      'AGPL-3.0': 'Network copyleft - requires source disclosure even for web services',
      'LGPL-2.1': 'Weak copyleft - linking restrictions apply',
      'LGPL-3.0': 'Weak copyleft - linking restrictions apply',
      'Unknown': 'License compatibility unknown - review required'
    };

    return notes[license] || 'Review license compatibility with your project';
  }

  private async checkOutdatedPackages(projectPath: string, packageManager: string): Promise<OutdatedPackage[]> {
    const outdatedPackages: OutdatedPackage[] = [];

    try {
      switch (packageManager) {
        case 'npm':
          return await this.checkNpmOutdated(projectPath);
        case 'yarn':
          return await this.checkYarnOutdated(projectPath);
        default:
          logger.warn(`Outdated package check not implemented for: ${packageManager}`);
      }
    } catch (error: any) {
      logger.warn(`Outdated package check failed: ${error.message}`);
    }

    return outdatedPackages;
  }

  private async checkNpmOutdated(projectPath: string): Promise<OutdatedPackage[]> {
    const outdatedPackages: OutdatedPackage[] = [];

    try {
      const { stdout } = await this.executeCommand('npm', ['outdated', '--json'], projectPath);
      if (stdout.trim()) {
        const outdated = JSON.parse(stdout);

        for (const [packageName, packageInfo] of Object.entries(outdated) as any[]) {
          outdatedPackages.push({
            package: packageName,
            current: packageInfo.current,
            wanted: packageInfo.wanted,
            latest: packageInfo.latest,
            location: packageInfo.location || projectPath
          });
        }
      }
    } catch (error: any) {
      // npm outdated exits with code 1 when packages are outdated, which is expected
      if (error.message.includes('stdout')) {
        try {
          const stdout = error.message.match(/stdout: (.+)/)?.[1];
          if (stdout) {
            const outdated = JSON.parse(stdout);
            for (const [packageName, packageInfo] of Object.entries(outdated) as any[]) {
              outdatedPackages.push({
                package: packageName,
                current: packageInfo.current,
                wanted: packageInfo.wanted,
                latest: packageInfo.latest,
                location: packageInfo.location || projectPath
              });
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    return outdatedPackages;
  }

  private async checkYarnOutdated(projectPath: string): Promise<OutdatedPackage[]> {
    const outdatedPackages: OutdatedPackage[] = [];

    try {
      const { stdout } = await this.executeCommand('yarn', ['outdated', '--json'], projectPath);
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'table' && data.data?.body) {
            for (const row of data.data.body) {
              const [packageName, current, wanted, latest] = row;
              outdatedPackages.push({
                package: packageName,
                current,
                wanted,
                latest,
                location: projectPath
              });
            }
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } catch (error: any) {
      logger.warn(`Yarn outdated check failed: ${error.message}`);
    }

    return outdatedPackages;
  }

  private async checkDuplicatePackages(projectPath: string, packageManager: string): Promise<DuplicatePackage[]> {
    const duplicatePackages: DuplicatePackage[] = [];

    try {
      if (packageManager === 'npm') {
        const { stdout } = await this.executeCommand('npm', ['ls', '--json', '--all'], projectPath);
        const dependencyTree = JSON.parse(stdout);
        
        const packageVersions = new Map<string, Set<string>>();
        
        const traverseDependencies = (deps: any, location: string) => {
          if (!deps) return;
          
          for (const [name, info] of Object.entries(deps) as any[]) {
            const version = info.version;
            if (!packageVersions.has(name)) {
              packageVersions.set(name, new Set());
            }
            packageVersions.get(name)!.add(`${version}@${location}`);
            
            if (info.dependencies) {
              traverseDependencies(info.dependencies, `${location}/${name}`);
            }
          }
        };

        traverseDependencies(dependencyTree.dependencies, projectPath);

        for (const [packageName, versionSet] of packageVersions) {
          const versions = Array.from(versionSet);
          const uniqueVersions = new Set(versions.map(v => v.split('@')[0]));
          
          if (uniqueVersions.size > 1) {
            duplicatePackages.push({
              package: packageName,
              versions: Array.from(uniqueVersions),
              locations: versions.map(v => v.split('@')[1])
            });
          }
        }
      }
    } catch (error: any) {
      logger.warn(`Duplicate package check failed: ${error.message}`);
    }

    return duplicatePackages;
  }

  private async checkUnusedPackages(projectPath: string, packageManager: string): Promise<string[]> {
    const unusedPackages: string[] = [];

    try {
      if (packageManager === 'npm' || packageManager === 'yarn') {
        // Use depcheck if available
        const { stdout } = await this.executeCommand('npx', ['depcheck', '--json'], projectPath);
        const result = JSON.parse(stdout);
        
        if (result.dependencies) {
          unusedPackages.push(...result.dependencies);
        }
      }
    } catch (error: any) {
      logger.warn(`Unused package check failed: ${error.message}`);
    }

    return unusedPackages;
  }

  private async getTotalDependencies(projectPath: string, packageManager: string): Promise<number> {
    try {
      switch (packageManager) {
        case 'npm':
        case 'yarn':
        case 'pnpm':
          const packageJson = JSON.parse(
            await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
          );
          return Object.keys({
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          }).length;
        
        case 'pip':
          if (await this.fileExists(path.join(projectPath, 'requirements.txt'))) {
            const requirements = await fs.readFile(path.join(projectPath, 'requirements.txt'), 'utf-8');
            return requirements.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
          }
          break;
      }
    } catch (error: any) {
      logger.warn(`Failed to count dependencies: ${error.message}`);
    }

    return 0;
  }

  private calculateRiskScore(result: DependencyValidationResult): number {
    let score = 0;

    // Vulnerability scoring
    for (const vuln of result.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score += 10; break;
        case 'high': score += 7; break;
        case 'moderate': score += 4; break;
        case 'low': score += 2; break;
        case 'info': score += 1; break;
      }
    }

    // License risk scoring
    for (const license of result.licenseIssues) {
      switch (license.riskLevel) {
        case 'high': score += 8; break;
        case 'medium': score += 4; break;
        case 'low': score += 1; break;
      }
    }

    // Outdated packages scoring
    score += result.outdatedPackages.length * 0.5;

    // Duplicate packages scoring
    score += result.duplicatePackages.length * 2;

    // Unused packages scoring
    score += result.unusedPackages.length * 0.5;

    return Math.round(score * 100) / 100;
  }

  private isValid(result: DependencyValidationResult): boolean {
    // Fail on critical vulnerabilities
    const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      return false;
    }

    // Fail on prohibited licenses
    const prohibitedLicenses = result.licenseIssues.filter(l => !l.compatible);
    if (prohibitedLicenses.length > 0) {
      return false;
    }

    // Fail on high risk score
    if (result.riskScore > 50) {
      return false;
    }

    return true;
  }

  private generateRecommendations(result: DependencyValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.vulnerabilities.length > 0) {
      const criticalCount = result.vulnerabilities.filter(v => v.severity === 'critical').length;
      const highCount = result.vulnerabilities.filter(v => v.severity === 'high').length;
      
      if (criticalCount > 0) {
        recommendations.push(`🚨 Fix ${criticalCount} critical vulnerabilities immediately`);
      }
      if (highCount > 0) {
        recommendations.push(`⚠️ Address ${highCount} high severity vulnerabilities`);
      }
      
      recommendations.push('Run security updates and review vulnerability details');
    }

    if (result.licenseIssues.length > 0) {
      const prohibited = result.licenseIssues.filter(l => !l.compatible).length;
      if (prohibited > 0) {
        recommendations.push(`⚖️ Replace ${prohibited} packages with prohibited licenses`);
      }
      recommendations.push('Review license compatibility with your project requirements');
    }

    if (result.outdatedPackages.length > 0) {
      recommendations.push(`📦 Update ${result.outdatedPackages.length} outdated packages`);
    }

    if (result.duplicatePackages.length > 0) {
      recommendations.push(`🔄 Resolve ${result.duplicatePackages.length} duplicate package versions`);
    }

    if (result.unusedPackages.length > 0) {
      recommendations.push(`🧹 Remove ${result.unusedPackages.length} unused packages`);
    }

    if (result.riskScore > 30) {
      recommendations.push(`🎯 Reduce overall risk score from ${result.riskScore}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Dependencies look good! Consider regular maintenance.');
    }

    return recommendations;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async executeCommand(
    command: string,
    args: string[],
    cwd: string,
    timeout: number = 60000
  ): Promise<{ stdout: string; stderr: string }> {
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
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  generateDependencyReport(result: DependencyValidationResult): string {
    let report = '\n' + chalk.bold('Dependency Validation Report') + '\n';
    report += chalk.gray('='.repeat(50)) + '\n\n';

    report += chalk.bold('Overview:\n');
    report += `Language: ${result.language}\n`;
    report += `Package Manager: ${result.packageManager}\n`;
    report += `Total Dependencies: ${result.totalDependencies}\n`;
    report += `Risk Score: ${result.riskScore}/100\n`;
    report += `Status: ${result.valid ? chalk.green('VALID') : chalk.red('INVALID')}\n\n`;

    if (result.vulnerabilities.length > 0) {
      report += chalk.bold('🚨 Security Vulnerabilities:\n');
      const grouped = this.groupBy(result.vulnerabilities, 'severity');
      
      for (const [severity, vulns] of Object.entries(grouped)) {
        const color = severity === 'critical' ? chalk.red : 
                     severity === 'high' ? chalk.magenta :
                     severity === 'moderate' ? chalk.yellow : chalk.gray;
        
        report += color(`  ${severity.toUpperCase()}: ${vulns.length} issues\n`);
        
        for (const vuln of vulns.slice(0, 3)) {
          report += `    • ${vuln.package}@${vuln.version}: ${vuln.title}\n`;
        }
        if (vulns.length > 3) {
          report += chalk.gray(`    ... and ${vulns.length - 3} more\n`);
        }
      }
      report += '\n';
    }

    if (result.licenseIssues.length > 0) {
      report += chalk.bold('⚖️ License Issues:\n');
      for (const license of result.licenseIssues) {
        const color = license.riskLevel === 'high' ? chalk.red :
                     license.riskLevel === 'medium' ? chalk.yellow : chalk.gray;
        
        report += color(`  ${license.package}@${license.version}: ${license.license}\n`);
        if (license.notes) {
          report += chalk.gray(`    ${license.notes}\n`);
        }
      }
      report += '\n';
    }

    if (result.outdatedPackages.length > 0) {
      report += chalk.bold('📦 Outdated Packages:\n');
      for (const pkg of result.outdatedPackages.slice(0, 5)) {
        report += chalk.yellow(`  ${pkg.package}: ${pkg.current} → ${pkg.latest}\n`);
      }
      if (result.outdatedPackages.length > 5) {
        report += chalk.gray(`  ... and ${result.outdatedPackages.length - 5} more\n`);
      }
      report += '\n';
    }

    if (result.duplicatePackages.length > 0) {
      report += chalk.bold('🔄 Duplicate Packages:\n');
      for (const dup of result.duplicatePackages) {
        report += chalk.cyan(`  ${dup.package}: ${dup.versions.join(', ')}\n`);
      }
      report += '\n';
    }

    if (result.unusedPackages.length > 0) {
      report += chalk.bold('🧹 Unused Packages:\n');
      for (const pkg of result.unusedPackages.slice(0, 5)) {
        report += chalk.gray(`  ${pkg}\n`);
      }
      if (result.unusedPackages.length > 5) {
        report += chalk.gray(`  ... and ${result.unusedPackages.length - 5} more\n`);
      }
      report += '\n';
    }

    if (result.recommendations.length > 0) {
      report += chalk.bold('💡 Recommendations:\n');
      for (const rec of result.recommendations) {
        report += `  ${rec}\n`;
      }
    }

    return report;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}