# Critical Security Fixes Required

**Priority:** IMMEDIATE  
**Severity:** CRITICAL  
**Status:** BLOCKING PRODUCTION DEPLOYMENT  

## Critical Path Traversal Vulnerability

### Issue Description
The current implementation allows path traversal attacks through unsanitized user inputs in project names and generation IDs.

### Vulnerable Code Pattern
```typescript
// Current vulnerable implementation
const projectPath = path.join(homeDir, 'DevXProjects', `${projectName}-${generationId}`);
```

### Attack Example
```javascript
// Malicious input
projectName = "../../../etc/passwd"
// Results in path: /Users/user/DevXProjects/../../../etc/passwd-123
// Which resolves to: /etc/passwd-123
```

### Required Fix
```typescript
// Add these sanitization functions
function sanitizeProjectName(name: string): string {
  // Allow only alphanumeric characters, hyphens, and underscores
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

function sanitizeGenerationId(id: string): string {
  // Allow only alphanumeric characters
  return id
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 20); // Limit length
}

// Updated safe implementation
const sanitizedProjectName = sanitizeProjectName(projectName);
const sanitizedGenerationId = sanitizeGenerationId(generationId);
const projectPath = path.join(homeDir, 'DevXProjects', `${sanitizedProjectName}-${sanitizedGenerationId}`);

// Additional validation
const devxProjectsPath = path.join(homeDir, 'DevXProjects');
const normalizedPath = path.normalize(projectPath);
if (!normalizedPath.startsWith(devxProjectsPath)) {
  throw new Error('Invalid project path detected');
}
```

## XSS Vulnerability Fix

### Issue Description
Frontend uses `innerHTML` with user-controlled content, potentially allowing XSS attacks.

### Vulnerable Code
```javascript
// Current vulnerable implementation
modal.innerHTML = `<div>${userContent}</div>`;
```

### Required Fix
```javascript
// Safe DOM manipulation
function createSafeElement(tag: string, content: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = content; // Safe text content
  if (className) element.className = className;
  return element;
}

// Usage
const messageDiv = createSafeElement('div', userMessage, 'message-content');
modal.appendChild(messageDiv);
```

## Implementation Files to Update

### 1. Enhanced IDE Launch Endpoint
**File:** `app/api/generate/ide-launch-enhanced/route.ts`
```typescript
// Add at the top of the file
function sanitizeInputs(projectName: string, generationId: string) {
  const sanitizedProjectName = projectName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
    
  const sanitizedGenerationId = generationId
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 20);
    
  if (!sanitizedProjectName || !sanitizedGenerationId) {
    throw new Error('Invalid project name or generation ID');
  }
  
  return { sanitizedProjectName, sanitizedGenerationId };
}

function validateProjectPath(projectPath: string, homeDir: string): boolean {
  const devxProjectsPath = path.join(homeDir, 'DevXProjects');
  const normalizedPath = path.normalize(projectPath);
  return normalizedPath.startsWith(devxProjectsPath);
}

// Update the POST function
export async function POST(request: NextRequest) {
  try {
    const body: IDELaunchRequest = await request.json();
    const { generationId, ide, projectName } = body;
    
    // SECURITY FIX: Sanitize inputs
    const { sanitizedProjectName, sanitizedGenerationId } = sanitizeInputs(projectName, generationId);
    
    // ... existing code ...
    
    const projectPath = path.join(projectsDir, `${sanitizedProjectName}-${sanitizedGenerationId}`);
    
    // SECURITY FIX: Validate path
    if (!validateProjectPath(projectPath, homeDir)) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      );
    }
    
    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

### 2. Basic IDE Launch Endpoint
**File:** `app/api/generate/ide-launch/route.ts`
```typescript
// Add the same sanitization functions and validation
```

### 3. File Extraction Endpoint
**File:** `app/api/generate/extract-files/route.ts`
```typescript
// Add the same sanitization functions and validation
```

### 4. Frontend Security Fix
**File:** `app/page.tsx`
```typescript
// Replace all innerHTML usage with safe DOM manipulation
function createModal(content: { title: string, message: string, buttons: Array<{text: string, action: () => void}> }) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full';
  
  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-white mb-4';
  title.textContent = content.title;
  
  const message = document.createElement('p');
  message.className = 'text-gray-300 mb-6';
  message.textContent = content.message;
  
  modalContent.appendChild(title);
  modalContent.appendChild(message);
  
  // Add buttons safely
  content.buttons.forEach(button => {
    const btn = document.createElement('button');
    btn.textContent = button.text;
    btn.onclick = button.action;
    modalContent.appendChild(btn);
  });
  
  modal.appendChild(modalContent);
  return modal;
}
```

## Testing the Fixes

### 1. Path Traversal Test
```javascript
// Test with malicious inputs
const testInputs = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32',
  'test; rm -rf /',
  '${process.env.HOME}',
  '<script>alert("xss")</script>'
];

testInputs.forEach(input => {
  const sanitized = sanitizeProjectName(input);
  console.log(`Input: ${input} -> Sanitized: ${sanitized}`);
  // Should all become safe alphanumeric strings
});
```

### 2. XSS Test
```javascript
// Test with XSS payloads
const xssPayloads = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  'javascript:alert("xss")'
];

xssPayloads.forEach(payload => {
  // Should be safely rendered as text, not executed
  const element = createSafeElement('div', payload);
  console.log('Safe text content:', element.textContent);
});
```

## Validation Checklist

Before deploying to production, verify:

- [ ] All user inputs are sanitized in all three endpoints
- [ ] Path traversal attempts are blocked
- [ ] Project paths are validated to stay within DevXProjects directory
- [ ] Frontend no longer uses innerHTML with user content
- [ ] XSS payloads are safely rendered as text
- [ ] Existing functionality still works correctly
- [ ] Tests pass with both normal and malicious inputs

## Estimated Fix Time
- **Path Traversal Fix**: 2-3 hours
- **XSS Fix**: 1-2 hours
- **Testing**: 1-2 hours
- **Total**: 4-7 hours

## After Fixes Applied
Once these security fixes are implemented, the IDE integration will be:
- ✅ **PRODUCTION READY**
- ✅ **SECURE**
- ✅ **FULLY FUNCTIONAL**

This will upgrade the security status from "CRITICAL VULNERABILITY" to "SECURE" and allow immediate production deployment.