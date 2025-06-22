#!/usr/bin/env node

/**
 * Test API Security for IDE Integration
 * Tests the actual API endpoints with malicious payloads
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔒 Testing API Security for IDE Integration\n');

// Start the development server
console.log('Starting development server...');
const server = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server:', output.trim());
  if (output.includes('Ready') || output.includes('localhost:3000')) {
    serverReady = true;
    runSecurityTests();
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Wait for server to start
setTimeout(() => {
  if (!serverReady) {
    console.log('Proceeding with tests (server may be ready)...');
    runSecurityTests();
  }
}, 10000);

async function runSecurityTests() {
  console.log('\n🧪 Running Security Tests...\n');
  
  const testCases = [
    {
      name: 'Path Traversal Attack',
      payload: {
        generationId: 'test-123',
        ide: 'vscode',
        projectName: '../../../etc/passwd',
        strictValidation: true
      }
    },
    {
      name: 'Null Byte Injection',
      payload: {
        generationId: 'test-123',
        ide: 'vscode',
        projectName: 'project\u0000evil',
        strictValidation: true
      }
    },
    {
      name: 'Windows Path Traversal',
      payload: {
        generationId: 'test-123',
        ide: 'cursor',
        projectName: '..\\\\..\\\\windows\\\\system32',
        strictValidation: true
      }
    },
    {
      name: 'Valid Project Name',
      payload: {
        generationId: 'test-123',
        ide: 'vscode',
        projectName: 'my-secure-project',
        strictValidation: true
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Payload: ${JSON.stringify(testCase.payload)}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/generate/ide-launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const result = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(result, null, 2)}`);
      
      // Analyze security
      if (testCase.name.includes('Attack') || testCase.name.includes('Injection') || testCase.name.includes('Traversal')) {
        if (response.status === 400 || (result.error && result.error.includes('validation failed'))) {
          console.log('✅ SECURITY: Attack properly blocked');
        } else if (result.localPath && !result.localPath.includes('etc/passwd') && !result.localPath.includes('system32')) {
          console.log('✅ SECURITY: Input sanitized properly');
        } else {
          console.log('❌ SECURITY: Potential vulnerability detected!');
        }
      } else {
        if (response.status === 200 || result.success) {
          console.log('✅ FUNCTIONALITY: Valid request processed correctly');
        } else {
          console.log('⚠️ FUNCTIONALITY: Valid request failed unexpectedly');
        }
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    console.log('---\n');
  }
  
  console.log('🔒 Security testing complete');
  server.kill();
  process.exit(0);
}

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});