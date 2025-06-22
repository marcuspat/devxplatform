# URL Generator Utility

A robust, secure URL generation system for VSCode and Cursor IDE integration with comprehensive cross-platform support and security validation.

## Features

### 🔒 Security
- **Path Validation**: Prevents directory traversal attacks
- **Input Sanitization**: Sanitizes all user inputs
- **Cross-platform Security**: Handles platform-specific security concerns
- **Path Length Limits**: Enforces maximum path length restrictions
- **Forbidden Pattern Detection**: Blocks malicious path patterns

### 🌍 Cross-Platform Support
- **Windows Compatibility**: Handles Windows drive letters and backslashes
- **Unix/Linux Support**: Native forward slash support
- **macOS Support**: Full macOS filesystem compatibility
- **Path Normalization**: Consistent path handling across platforms

### 🎯 IDE Integration
- **VSCode Support**: Full VSCode URL scheme support
- **Cursor Support**: Cursor IDE integration (with fallback commands)
- **Extensible Design**: Easy to add new IDE support

### 🛡️ Robust Error Handling
- **Comprehensive Validation**: Multi-layer validation system
- **Clear Error Messages**: Detailed error reporting
- **Warning System**: Non-blocking warnings for better UX
- **System Information**: Debugging information included

## Usage

### Basic URL Generation

```typescript
import { generateIDEUrl } from './url-generator'

const result = generateIDEUrl({
  ide: 'vscode',
  projectName: 'my-awesome-project',
  generationId: 'gen-123',
  strictValidation: true
})

if (result.success) {
  console.log('IDE URL:', result.ideUrl)
  console.log('Local Path:', result.localPath)
  console.log('Download URL:', result.downloadUrl)
} else {
  console.error('Error:', result.error)
}
```

### Custom Path Validation

```typescript
import { validatePath } from './url-generator'

const validation = validatePath('/custom/project/path', {
  allowRelative: false,
  strictMode: true
})

if (validation.isValid) {
  console.log('Path is secure')
} else {
  console.error('Security issues:', validation.errors)
}
```

### Cross-Platform Path Normalization

```typescript
import { normalizePath } from './url-generator'

const pathInfo = normalizePath('C:\\Users\\Project\\my-app')
console.log('Normalized:', pathInfo.normalized) // C:/Users/Project/my-app
console.log('Platform:', pathInfo.platform)     // win32
console.log('Is Absolute:', pathInfo.isAbsolute) // true
```

### Multiple IDE Support

```typescript
import { generateMultipleIDEUrls } from './url-generator'

const results = generateMultipleIDEUrls(
  {
    projectName: 'multi-ide-project',
    generationId: 'gen-456'
  },
  ['vscode', 'cursor']
)

console.log('VSCode URL:', results.vscode.ideUrl)
console.log('Cursor URL:', results.cursor.ideUrl)
```

## Security Features

### Path Validation Rules

The utility enforces several security rules to prevent malicious path manipulation:

1. **Directory Traversal Prevention**: Blocks `../` patterns
2. **Null Byte Protection**: Prevents null byte injection
3. **Path Length Limits**: Maximum 4096 characters
4. **Platform-Specific Validation**: Windows invalid characters detection
5. **Absolute Path Enforcement**: Strict mode requires absolute paths

### Forbidden Patterns

The following patterns are automatically blocked:

- `../` (Directory traversal)
- `\../` (Windows directory traversal)
- `/./` (Current directory references)
- `//` (Double slashes)
- `\0` (Null bytes)
- `<>:"|?*` (Windows invalid characters)

### Safe Defaults

- Strict validation enabled by default
- All paths are sanitized and normalized
- Project names are automatically sanitized
- Generation IDs are cleaned of special characters

## API Reference

### `generateIDEUrl(config: URLGeneratorConfig): URLGenerationResult`

Generates a secure IDE URL with comprehensive validation.

#### Parameters

```typescript
interface URLGeneratorConfig {
  ide: 'vscode' | 'cursor'
  projectName: string
  generationId: string
  customPath?: string
  allowRelativePaths?: boolean
  strictValidation?: boolean
}
```

#### Returns

```typescript
interface URLGenerationResult {
  success: boolean
  ideUrl?: string
  localPath?: string
  downloadUrl?: string
  error?: string
  warnings?: string[]
  metadata?: {
    platform: string
    pathSeparator: string
    isAbsolute: boolean
    normalizedPath: string
  }
}
```

### `validatePath(path: string, options?): ValidationResult`

Validates a file path for security vulnerabilities.

#### Options

```typescript
interface ValidationOptions {
  allowRelative?: boolean
  strictMode?: boolean
}
```

#### Returns

```typescript
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
```

### `normalizePath(inputPath: string): PathInfo`

Normalizes a path for cross-platform compatibility.

#### Returns

```typescript
interface PathInfo {
  normalized: string
  platform: string
  separator: string
  isAbsolute: boolean
}
```

### `encodePath(filePath: string): string`

Encodes a path for safe URL usage while preserving path structure.

### `createProjectPath(projectName: string, generationId: string, customPath?: string): PathResult`

Creates a secure project path in the user's home directory.

#### Returns

```typescript
interface PathResult {
  path: string
  created: boolean
  error?: string
}
```

### `getSystemInfo(): SystemInfo`

Returns system information for debugging purposes.

#### Returns

```typescript
interface SystemInfo {
  platform: string
  homedir: string
  pathSeparator: string
  supportedIDEs: SupportedIDE[]
}
```

## Error Handling

The utility provides comprehensive error handling with detailed messages:

```typescript
const result = generateIDEUrl({ /* config */ })

if (!result.success) {
  // Handle specific error types
  if (result.error?.includes('directory traversal')) {
    console.error('Security violation detected')
  } else if (result.error?.includes('Unsupported IDE')) {
    console.error('IDE not supported')
  }
  
  // Access system info for debugging
  console.log('System:', result.systemInfo)
}
```

## Integration Examples

### Express.js Route

```typescript
import express from 'express'
import { generateIDEUrl } from '../lib/url-generator'

const router = express.Router()

router.post('/ide-launch', async (req, res) => {
  const { ide, projectName, generationId } = req.body
  
  const result = generateIDEUrl({
    ide,
    projectName,
    generationId,
    strictValidation: true
  })
  
  if (result.success) {
    res.json({
      success: true,
      ideUrl: result.ideUrl,
      localPath: result.localPath,
      instructions: `Open ${ide.toUpperCase()} with: ${result.ideUrl}`
    })
  } else {
    res.status(400).json({
      error: result.error,
      systemInfo: result.metadata
    })
  }
})
```

### Next.js API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateIDEUrl } from '../../../lib/url-generator'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const result = generateIDEUrl({
    ide: body.ide,
    projectName: body.projectName,
    generationId: body.generationId,
    strictValidation: true
  })
  
  return NextResponse.json(result)
}
```

## Best Practices

### Security
- Always enable strict validation in production
- Validate all user inputs before processing
- Use absolute paths whenever possible
- Monitor and log security validation failures

### Error Handling
- Check the `success` property before using results
- Provide fallback instructions for users
- Log system information for debugging
- Handle platform-specific edge cases

### Performance
- Cache system information when possible
- Validate paths early in the request cycle
- Use batch operations for multiple IDE URLs
- Monitor path validation performance

### User Experience
- Provide clear error messages
- Include fallback instructions
- Show platform-specific guidance
- Display security notices when appropriate

## Supported Platforms

- **Windows 10/11**: Full support with drive letter handling
- **macOS**: Native filesystem support
- **Linux**: All major distributions supported
- **Unix**: General Unix filesystem compatibility

## Supported IDEs

- **Visual Studio Code**: Full URL scheme support
- **Cursor**: Limited URL support with command-line fallback

## Contributing

When adding new IDE support:

1. Add the IDE to the `SupportedIDE` type
2. Update the `IDE_CONFIG` with URL scheme and download URL
3. Test cross-platform compatibility
4. Update documentation

## Security Considerations

This utility is designed with security as a primary concern:

- **No Code Execution**: Only generates URLs, never executes commands
- **Path Sanitization**: All paths are cleaned and validated
- **Platform Awareness**: Handles platform-specific security concerns
- **Audit Trail**: All validation failures are logged
- **Defense in Depth**: Multiple layers of validation

For security issues, please follow responsible disclosure practices.