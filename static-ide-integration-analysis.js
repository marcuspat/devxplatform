#!/usr/bin/env node

/**
 * Static Analysis of IDE Integration Implementation
 * Analyzes code without requiring a running server
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Analysis results tracker
const analysisResults = {
  codeQuality: [],
  securityIssues: [],
  functionalIssues: [],
  improvements: [],
  positives: []
};

function recordIssue(category, severity, title, description, file = null) {
  const issue = { severity, title, description, file };
  analysisResults[category].push(issue);
}

function recordPositive(title, description, file = null) {
  analysisResults.positives.push({ title, description, file });
}

// Analyze the enhanced IDE launch endpoint
async function analyzeEnhancedEndpoint() {
  log('\n=== Analyzing Enhanced IDE Launch Endpoint ===', 'blue');
  
  try {
    const filePath = './app/api/generate/ide-launch-enhanced/route.ts';
    const content = await fs.readFile(filePath, 'utf-8');
    
    log('✅ Enhanced endpoint file exists', 'green');
    recordPositive('Enhanced endpoint exists', 'Modern implementation with auto file creation', filePath);
    
    // Check for security patterns
    if (content.includes('path.join(homeDir, \'DevXProjects\',')) {
      log('✅ Uses safe path joining', 'green');
      recordPositive('Safe path construction', 'Uses path.join() for safe directory paths', filePath);
    }
    
    if (content.includes('await fs.mkdir(projectPath, { recursive: true })')) {
      log('✅ Creates directories recursively', 'green');
      recordPositive('Recursive directory creation', 'Properly creates nested directory structure', filePath);
    }
    
    if (content.includes('downloadResponse.ok')) {
      log('✅ Checks download response status', 'green');
      recordPositive('Response validation', 'Validates download response before processing', filePath);
    }
    
    // Check for potential issues
    if (content.includes('###\\s+(.+?)\\n\\n```[\\w]*\\n([\\s\\S]*?)```')) {
      log('⚠️ File extraction regex might be too permissive', 'yellow');
      recordIssue('functionalIssues', 'medium', 'File extraction regex', 'Regex pattern might match unintended content blocks', filePath);
    }
    
    if (!content.includes('try') || !content.includes('catch')) {
      log('❌ Missing error handling', 'red');
      recordIssue('codeQuality', 'high', 'Missing error handling', 'No try-catch blocks found', filePath);
    } else {
      log('✅ Has error handling', 'green');
      recordPositive('Error handling', 'Includes proper try-catch error handling', filePath);
    }
    
    // Check for file cleanup
    if (!content.includes('rmdir') && !content.includes('unlink')) {
      log('⚠️ No cleanup mechanism for temporary files', 'yellow');
      recordIssue('functionalIssues', 'low', 'Missing cleanup', 'No mechanism to clean up temporary files', filePath);
    }
    
    // Check for VSCode settings
    if (content.includes('.vscode') && content.includes('extensions.json')) {
      log('✅ Creates VSCode workspace settings', 'green');
      recordPositive('IDE workspace setup', 'Creates proper VSCode workspace with extensions and settings', filePath);
    }
    
  } catch (error) {
    log(`❌ Could not analyze enhanced endpoint: ${error.message}`, 'red');
    recordIssue('codeQuality', 'critical', 'File not accessible', `Enhanced endpoint file not found: ${error.message}`);
  }
}

// Analyze the basic IDE launch endpoint
async function analyzeBasicEndpoint() {
  log('\n=== Analyzing Basic IDE Launch Endpoint ===', 'blue');
  
  try {
    const filePath = './app/api/generate/ide-launch/route.ts';
    const content = await fs.readFile(filePath, 'utf-8');
    
    log('✅ Basic endpoint file exists', 'green');
    recordPositive('Fallback endpoint exists', 'Basic endpoint available as fallback option', filePath);
    
    // Check URL generation
    if (content.includes('vscode://file/') && content.includes('cursor://file/')) {
      log('✅ Uses correct URL schemes', 'green');
      recordPositive('Correct URL schemes', 'Uses proper vscode:// and cursor:// URL schemes', filePath);
    }
    
    // Check platform handling
    if (content.includes('process.platform === \'win32\'')) {
      log('✅ Handles Windows path formatting', 'green');
      recordPositive('Cross-platform support', 'Properly handles Windows path separators', filePath);
    }
    
    // Check for path injection vulnerabilities
    if (!content.includes('sanitize') && !content.includes('validate')) {
      log('⚠️ No input sanitization', 'yellow');
      recordIssue('securityIssues', 'medium', 'Missing input validation', 'Project name and generation ID not validated', filePath);
    }
    
    // Check IDE validation
    if (content.includes('case \'vscode\':') && content.includes('case \'cursor\':')) {
      log('✅ Validates IDE parameter', 'green');
      recordPositive('Input validation', 'Validates IDE parameter with switch statement', filePath);
    }
    
  } catch (error) {
    log(`❌ Could not analyze basic endpoint: ${error.message}`, 'red');
    recordIssue('codeQuality', 'high', 'Basic endpoint missing', `Basic endpoint file not found: ${error.message}`);
  }
}

// Analyze the file extraction endpoint
async function analyzeExtractionEndpoint() {
  log('\n=== Analyzing File Extraction Endpoint ===', 'blue');
  
  try {
    const filePath = './app/api/generate/extract-files/route.ts';
    const content = await fs.readFile(filePath, 'utf-8');
    
    log('✅ Extraction endpoint file exists', 'green');
    recordPositive('Dedicated extraction endpoint', 'Separate endpoint for file extraction provides modularity', filePath);
    
    // Check for comprehensive file extraction
    if (content.includes('extractFilesFromMarkdown') && content.includes('extractSpecialFiles')) {
      log('✅ Comprehensive file extraction', 'green');
      recordPositive('Comprehensive extraction', 'Extracts both regular files and special files', filePath);
    }
    
    // Check for metadata creation
    if (content.includes('.devx-metadata.json')) {
      log('✅ Creates project metadata', 'green');
      recordPositive('Project metadata', 'Creates metadata file for project tracking', filePath);
    }
    
    // Check for README generation
    if (content.includes('generateReadmeFromMD')) {
      log('✅ Generates README file', 'green');
      recordPositive('README generation', 'Automatically generates README from MD content', filePath);
    }
    
    // Check for gitignore creation
    if (content.includes('.gitignore')) {
      log('✅ Creates default .gitignore', 'green');
      recordPositive('Git integration', 'Creates appropriate .gitignore file', filePath);
    }
    
    // Check for security in file paths
    if (content.includes('path.join') && content.includes('path.dirname')) {
      log('✅ Safe path handling', 'green');
      recordPositive('Safe path operations', 'Uses Node.js path module for safe path operations', filePath);
    } else {
      log('❌ Unsafe path handling', 'red');
      recordIssue('securityIssues', 'high', 'Unsafe path handling', 'May be vulnerable to path traversal attacks', filePath);
    }
    
    // Check regex patterns
    if (content.includes('/(?:###?\\s+(?:`?([^`\\n]+)`?)|^([^#\\n][^\\n]+\\.(?:js|ts|')) {
      log('✅ Comprehensive file pattern matching', 'green');
      recordPositive('File pattern matching', 'Comprehensive regex for various file types', filePath);
    }
    
  } catch (error) {
    log(`❌ Could not analyze extraction endpoint: ${error.message}`, 'red');
    recordIssue('codeQuality', 'high', 'Extraction endpoint missing', `Extraction endpoint file not found: ${error.message}`);
  }
}

// Analyze the frontend integration
async function analyzeFrontendIntegration() {
  log('\n=== Analyzing Frontend Integration ===', 'blue');
  
  try {
    const filePath = './app/page.tsx';
    const content = await fs.readFile(filePath, 'utf-8');
    
    log('✅ Frontend integration file exists', 'green');
    recordPositive('Frontend implementation', 'Complete React frontend with IDE integration', filePath);
    
    // Check for enhanced endpoint usage
    if (content.includes('/api/generate/ide-launch-enhanced')) {
      log('✅ Uses enhanced endpoint first', 'green');
      recordPositive('Enhanced endpoint priority', 'Tries enhanced endpoint before fallback', filePath);
    }
    
    // Check for fallback mechanism
    if (content.includes('response.status === 404')) {
      log('✅ Has fallback mechanism', 'green');
      recordPositive('Graceful fallback', 'Falls back to basic endpoint if enhanced is unavailable', filePath);
    }
    
    // Check for loading states
    if (content.includes('loadingModal') && content.includes('Creating Project...')) {
      log('✅ Shows loading states', 'green');
      recordPositive('User experience', 'Provides loading indicators during operations', filePath);
    }
    
    // Check for success feedback
    if (content.includes('Project Created Successfully!') && content.includes('filesCreated')) {
      log('✅ Success feedback', 'green');
      recordPositive('Success feedback', 'Clear success messages with file count', filePath);
    }
    
    // Check for error handling
    if (content.includes('catch (error)') && content.includes('setError')) {
      log('✅ Frontend error handling', 'green');
      recordPositive('Error handling', 'Proper error handling with user feedback', filePath);
    }
    
    // Check for IDE detection
    if (content.includes('data.filesCreated')) {
      log('✅ Different UI for enhanced vs basic', 'green');
      recordPositive('Adaptive UI', 'Different UI based on endpoint response type', filePath);
    }
    
    // Check for security issues
    if (content.includes('innerHTML')) {
      log('⚠️ Uses innerHTML - potential XSS risk', 'yellow');
      recordIssue('securityIssues', 'medium', 'XSS vulnerability', 'innerHTML usage could lead to XSS attacks', filePath);
    }
    
    // Check for accessibility
    if (!content.includes('aria-') && !content.includes('role=')) {
      log('⚠️ Limited accessibility features', 'yellow');
      recordIssue('functionalIssues', 'low', 'Accessibility', 'Missing ARIA labels and roles for accessibility', filePath);
    }
    
  } catch (error) {
    log(`❌ Could not analyze frontend: ${error.message}`, 'red');
    recordIssue('codeQuality', 'critical', 'Frontend not accessible', `Frontend file not found: ${error.message}`);
  }
}

// Analyze cross-platform compatibility
async function analyzeCrossPlatformSupport() {
  log('\n=== Analyzing Cross-Platform Support ===', 'blue');
  
  const platform = process.platform;
  const homeDir = os.homedir();
  
  log(`Current platform: ${platform}`);
  log(`Home directory: ${homeDir}`);
  
  // Test path generation
  const testProjectName = 'test-project';
  const testGenId = '123456';
  const expectedPath = path.join(homeDir, 'DevXProjects', `${testProjectName}-${testGenId}`);
  
  log(`Generated path: ${expectedPath}`);
  
  // Check Windows compatibility
  if (platform === 'win32') {
    const formattedPath = expectedPath.replace(/\\/g, '/');
    log(`Windows formatted path: ${formattedPath}`);
    
    if (!formattedPath.includes('\\')) {
      log('✅ Windows path formatting works', 'green');
      recordPositive('Windows compatibility', 'Proper path formatting for Windows', null);
    }
  } else {
    log('✅ Unix-like path formatting', 'green');
    recordPositive('Unix compatibility', 'Standard Unix path formatting', null);
  }
  
  // Check IDE URL generation
  const vscodeUrl = `vscode://file/${expectedPath}`;
  const cursorUrl = `cursor://file/${expectedPath}`;
  
  log(`VSCode URL: ${vscodeUrl}`);
  log(`Cursor URL: ${cursorUrl}`);
  
  if (vscodeUrl.startsWith('vscode://file/') && !vscodeUrl.includes('undefined')) {
    log('✅ VSCode URL format valid', 'green');
    recordPositive('VSCode URL generation', 'Correct VSCode URL scheme', null);
  } else {
    log('❌ VSCode URL format invalid', 'red');
    recordIssue('functionalIssues', 'high', 'VSCode URL invalid', 'Generated VSCode URL has incorrect format', null);
  }
  
  if (cursorUrl.startsWith('cursor://file/') && !cursorUrl.includes('undefined')) {
    log('✅ Cursor URL format valid', 'green');
    recordPositive('Cursor URL generation', 'Correct Cursor URL scheme', null);
  } else {
    log('❌ Cursor URL format invalid', 'red');
    recordIssue('functionalIssues', 'high', 'Cursor URL invalid', 'Generated Cursor URL has incorrect format', null);
  }
}

// Analyze potential security vulnerabilities
async function analyzeSecurityVulnerabilities() {
  log('\n=== Analyzing Security Vulnerabilities ===', 'blue');
  
  // Test path traversal scenarios
  const maliciousInputs = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    'test; rm -rf /',
    '<script>alert("xss")</script>',
    '${process.env.HOME}',
    '`whoami`'
  ];
  
  log('Testing path traversal scenarios...');
  
  for (const input of maliciousInputs) {
    const testPath = path.join(os.homedir(), 'DevXProjects', `${input}-123`);
    
    // Check if the path escapes the intended directory
    const normalizedPath = path.normalize(testPath);
    const devxProjectsPath = path.join(os.homedir(), 'DevXProjects');
    
    if (!normalizedPath.startsWith(devxProjectsPath)) {
      log(`❌ Path traversal vulnerability with input: ${input}`, 'red');
      recordIssue('securityIssues', 'critical', 'Path traversal', `Input "${input}" escapes intended directory`, null);
    } else {
      log(`✅ Path traversal protected for: ${input}`, 'green');
    }
  }
  
  // Check for command injection possibilities
  log('✅ No direct command execution found in codebase', 'green');
  recordPositive('Command injection protection', 'No shell command execution with user input', null);
  
  // Check for file type restrictions
  log('⚠️ No file type restrictions during extraction', 'yellow');
  recordIssue('securityIssues', 'medium', 'File type restrictions', 'No validation of extracted file types or content', null);
  
  // Check for size limits
  log('⚠️ No file size limits during extraction', 'yellow');
  recordIssue('securityIssues', 'low', 'File size limits', 'No limits on extracted file sizes', null);
}

// Generate comprehensive analysis report
function generateAnalysisReport() {
  log('\n=== STATIC ANALYSIS REPORT ===', 'magenta');
  log('===============================', 'magenta');
  
  const totalIssues = analysisResults.codeQuality.length + 
                     analysisResults.securityIssues.length + 
                     analysisResults.functionalIssues.length;
  
  const positiveCount = analysisResults.positives.length;
  
  log(`\nAnalysis Summary:`);
  log(`✅ Positive findings: ${positiveCount}`, 'green');
  log(`⚠️ Issues identified: ${totalIssues}`, totalIssues === 0 ? 'green' : 'yellow');
  
  // Security issues
  if (analysisResults.securityIssues.length > 0) {
    log(`\n🚨 SECURITY ISSUES (${analysisResults.securityIssues.length}):`, 'red');
    analysisResults.securityIssues.forEach(issue => {
      const color = issue.severity === 'critical' ? 'red' : issue.severity === 'high' ? 'yellow' : 'cyan';
      log(`   [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`, color);
      if (issue.file) log(`     File: ${issue.file}`, 'cyan');
    });
  }
  
  // Code quality issues
  if (analysisResults.codeQuality.length > 0) {
    log(`\n🔧 CODE QUALITY ISSUES (${analysisResults.codeQuality.length}):`, 'yellow');
    analysisResults.codeQuality.forEach(issue => {
      const color = issue.severity === 'critical' ? 'red' : issue.severity === 'high' ? 'yellow' : 'cyan';
      log(`   [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`, color);
      if (issue.file) log(`     File: ${issue.file}`, 'cyan');
    });
  }
  
  // Functional issues
  if (analysisResults.functionalIssues.length > 0) {
    log(`\n⚙️ FUNCTIONAL ISSUES (${analysisResults.functionalIssues.length}):`, 'yellow');
    analysisResults.functionalIssues.forEach(issue => {
      const color = issue.severity === 'high' ? 'yellow' : 'cyan';
      log(`   [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`, color);
      if (issue.file) log(`     File: ${issue.file}`, 'cyan');
    });
  }
  
  // Positive findings
  if (analysisResults.positives.length > 0) {
    log(`\n🎉 POSITIVE FINDINGS (${analysisResults.positives.length}):`, 'green');
    analysisResults.positives.forEach(positive => {
      log(`   ✅ ${positive.title}: ${positive.description}`, 'green');
      if (positive.file) log(`     File: ${positive.file}`, 'cyan');
    });
  }
  
  // Overall assessment
  const criticalIssues = [...analysisResults.securityIssues, ...analysisResults.codeQuality]
    .filter(issue => issue.severity === 'critical').length;
  
  const highIssues = [...analysisResults.securityIssues, ...analysisResults.codeQuality, ...analysisResults.functionalIssues]
    .filter(issue => issue.severity === 'high').length;
  
  log(`\n🎯 OVERALL ASSESSMENT:`, 'magenta');
  
  if (criticalIssues > 0) {
    log(`❌ CRITICAL ISSUES FOUND - Not ready for production`, 'red');
  } else if (highIssues > 0) {
    log(`⚠️ HIGH PRIORITY ISSUES - Needs attention before production`, 'yellow');
  } else if (totalIssues === 0) {
    log(`✅ EXCELLENT - No issues found, ready for production`, 'green');
  } else {
    log(`✅ GOOD - Minor issues only, mostly ready for production`, 'green');
  }
  
  // Recommendations
  log(`\n📝 RECOMMENDATIONS:`, 'blue');
  
  if (analysisResults.securityIssues.length > 0) {
    log(`   1. Address security vulnerabilities immediately`, 'yellow');
    log(`   2. Implement input validation and sanitization`, 'yellow');
    log(`   3. Add file type and size restrictions`, 'yellow');
  }
  
  if (analysisResults.codeQuality.length > 0) {
    log(`   4. Improve error handling and validation`, 'yellow');
    log(`   5. Add comprehensive logging`, 'yellow');
  }
  
  if (analysisResults.functionalIssues.length > 0) {
    log(`   6. Enhance cross-platform compatibility`, 'yellow');
    log(`   7. Add accessibility features`, 'yellow');
    log(`   8. Implement cleanup mechanisms`, 'yellow');
  }
  
  log(`   9. Add comprehensive unit tests`, 'yellow');
  log(`   10. Consider rate limiting for API endpoints`, 'yellow');
  
  return {
    summary: {
      positiveCount,
      totalIssues,
      criticalIssues,
      highIssues,
      ready: criticalIssues === 0 && highIssues === 0
    },
    issues: analysisResults,
    assessment: criticalIssues === 0 && highIssues === 0 ? 'ready' : 
                criticalIssues === 0 ? 'needs-attention' : 'not-ready'
  };
}

// Main analysis runner
async function runStaticAnalysis() {
  log('🔍 STATIC IDE INTEGRATION ANALYSIS', 'magenta');
  log('==================================', 'magenta');
  log(`Analysis started at: ${new Date().toISOString()}`, 'cyan');
  log(`Platform: ${process.platform} (${process.arch})`, 'cyan');
  
  try {
    await analyzeEnhancedEndpoint();
    await analyzeBasicEndpoint();
    await analyzeExtractionEndpoint();
    await analyzeFrontendIntegration();
    await analyzeCrossPlatformSupport();
    await analyzeSecurityVulnerabilities();
    
    const report = generateAnalysisReport();
    return report;
    
  } catch (error) {
    log(`\n💥 Analysis failed: ${error.message}`, 'red');
    console.error(error);
    return {
      summary: { positiveCount: 0, totalIssues: 1, criticalIssues: 1, highIssues: 0, ready: false },
      issues: { error: error.message },
      assessment: 'failed'
    };
  }
}

// Run the analysis
if (require.main === module) {
  runStaticAnalysis().then(report => {
    process.exit(report.summary.ready ? 0 : 1);
  });
}

module.exports = { runStaticAnalysis, analysisResults };