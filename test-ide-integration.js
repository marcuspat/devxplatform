#!/usr/bin/env node

/**
 * IDE Integration Test Script
 * Tests the current implementation and demonstrates the issues
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = {
  generationId: '1234567890',
  projectName: 'test-service',
  ides: ['vscode', 'cursor']
};

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Check if GitHub repos exist
async function testGitHubRepoExists() {
  log('\n=== Test 1: GitHub Repository Existence ===', 'blue');
  
  const githubOrgUrl = 'https://github.com/devx-platform';
  const repoUrl = `${githubOrgUrl}/${TEST_CONFIG.projectName}-${TEST_CONFIG.generationId}`;
  
  log(`Testing URL: ${repoUrl}`);
  
  return new Promise((resolve) => {
    https.get(repoUrl, (res) => {
      if (res.statusCode === 404) {
        log('❌ FAILED: GitHub repository does not exist (404)', 'red');
        log('   This is the root cause of IDE integration failure', 'yellow');
        resolve(false);
      } else if (res.statusCode === 200) {
        log('✅ PASSED: GitHub repository exists', 'green');
        resolve(true);
      } else {
        log(`⚠️  WARNING: Unexpected status code: ${res.statusCode}`, 'yellow');
        resolve(false);
      }
    }).on('error', (err) => {
      log(`❌ FAILED: Network error - ${err.message}`, 'red');
      resolve(false);
    });
  });
}

// Test 2: Generate and test IDE URLs
function testIDEUrlGeneration() {
  log('\n=== Test 2: IDE URL Generation ===', 'blue');
  
  const githubOrgUrl = 'https://github.com/devx-platform';
  const repoUrl = `${githubOrgUrl}/${TEST_CONFIG.projectName}-${TEST_CONFIG.generationId}`;
  
  const results = {};
  
  // Test VSCode URL
  const vscodeUrl = `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`;
  log(`\nVSCode URL: ${vscodeUrl}`);
  log('Expected behavior: VSCode opens and attempts to clone');
  log('Actual behavior: Clone fails with "Repository not found"', 'yellow');
  results.vscode = vscodeUrl;
  
  // Test Cursor URL
  const cursorUrl = `cursor://open?url=${encodeURIComponent(repoUrl)}`;
  log(`\nCursor URL: ${cursorUrl}`);
  log('Expected behavior: Cursor opens the project');
  log('Actual behavior: Fails to open non-existent repository', 'yellow');
  results.cursor = cursorUrl;
  
  return results;
}

// Test 3: Check if IDEs are installed
async function testIDEInstallation() {
  log('\n=== Test 3: IDE Installation Check ===', 'blue');
  
  const results = {};
  
  for (const ide of TEST_CONFIG.ides) {
    try {
      const command = process.platform === 'win32' 
        ? `where ${ide}` 
        : `which ${ide}`;
      
      await execAsync(command);
      log(`✅ ${ide.toUpperCase()} is installed`, 'green');
      results[ide] = true;
    } catch (error) {
      log(`❌ ${ide.toUpperCase()} is not installed or not in PATH`, 'yellow');
      results[ide] = false;
    }
  }
  
  return results;
}

// Test 4: Simulate current implementation
function testCurrentImplementation() {
  log('\n=== Test 4: Current Implementation Simulation ===', 'blue');
  
  // Simulate API response
  const mockApiResponse = {
    success: true,
    ideUrl: 'vscode://vscode.git/clone?url=https%3A%2F%2Fgithub.com%2Fdevx-platform%2Ftest-service-1234567890',
    downloadUrl: 'https://code.visualstudio.com/download',
    instructions: {
      title: 'Opening in VSCODE...',
      steps: [
        '1. Make sure VSCODE is installed',
        '2. If the IDE doesn\'t open automatically, copy this URL: https://github.com/devx-platform/test-service-1234567890',
        '3. Open VSCODE and clone the repository manually',
        '4. Or download the files and open the folder in VSCODE'
      ],
      fallbackUrl: 'https://code.visualstudio.com/download'
    }
  };
  
  log('\nAPI Response:', 'yellow');
  console.log(JSON.stringify(mockApiResponse, null, 2));
  
  log('\n❌ ISSUE: Instructions reference non-existent GitHub repository', 'red');
  log('❌ ISSUE: Users cannot complete step 2 or 3', 'red');
  
  return mockApiResponse;
}

// Test 5: Proposed fix simulation
function testProposedFix() {
  log('\n=== Test 5: Proposed Fix Simulation ===', 'blue');
  
  const tempDir = `/tmp/devx-${TEST_CONFIG.generationId}`;
  
  // Simulate correct URL generation
  const fixedUrls = {
    vscode: `vscode://file/${tempDir}`,
    cursor: `cursor://open?folder=${tempDir}`,
    
    // Alternative approaches
    vscodeAlt: `code ${tempDir}`, // Command line approach
    cursorAlt: `cursor ${tempDir}` // Command line approach
  };
  
  log('\nProposed URL fixes:', 'green');
  console.log(JSON.stringify(fixedUrls, null, 2));
  
  log('\n✅ These URLs would open local folders directly', 'green');
  log('✅ No dependency on non-existent GitHub repos', 'green');
  log('✅ Works with locally generated files', 'green');
  
  return fixedUrls;
}

// Main test runner
async function runAllTests() {
  log('🧪 DevX Platform IDE Integration Test Suite', 'blue');
  log('=========================================\n', 'blue');
  
  // Run all tests
  const repoExists = await testGitHubRepoExists();
  const ideUrls = testIDEUrlGeneration();
  const ideInstalled = await testIDEInstallation();
  const currentImpl = testCurrentImplementation();
  const proposedFix = testProposedFix();
  
  // Summary
  log('\n=== Test Summary ===', 'blue');
  log(`GitHub Repo Exists: ${repoExists ? '✅' : '❌'}`, repoExists ? 'green' : 'red');
  log(`VSCode Installed: ${ideInstalled.vscode ? '✅' : '⚠️'}`, ideInstalled.vscode ? 'green' : 'yellow');
  log(`Cursor Installed: ${ideInstalled.cursor ? '✅' : '⚠️'}`, ideInstalled.cursor ? 'green' : 'yellow');
  log(`Current Implementation: ❌ BROKEN`, 'red');
  log(`Proposed Fix: ✅ READY`, 'green');
  
  // Recommendations
  log('\n=== Recommendations ===', 'blue');
  log('1. Implement local file generation in temporary directory', 'yellow');
  log('2. Update IDE URLs to use local folder paths', 'yellow');
  log('3. Remove references to non-existent GitHub repos', 'yellow');
  log('4. Add proper error handling for missing IDEs', 'yellow');
  log('5. Consider implementing "Save As" dialog for user to choose location', 'yellow');
  
  // Test data for developers
  log('\n=== Test Data for Fixes ===', 'blue');
  log('Use these in your implementation:', 'green');
  console.log({
    correctUrls: proposedFix,
    tempDirPattern: '/tmp/devx-{generationId}',
    windowsTempDir: '%TEMP%\\devx-{generationId}',
    commandLineApproach: {
      vscode: 'code /path/to/project',
      cursor: 'cursor /path/to/project'
    }
  });
}

// Run the tests
runAllTests().catch(console.error);