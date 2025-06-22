/**
 * URL Generation Utility for IDE Integration
 * 
 * This module provides robust URL generation for VSCode and Cursor IDEs with:
 * - Cross-platform path handling
 * - Security validation
 * - Proper URL encoding
 * - Error handling and logging
 */

import path from 'path'
import os from 'os'
import { URL } from 'url'

// Supported IDE types
export type SupportedIDE = 'vscode' | 'cursor'

// Configuration interface for URL generation
export interface URLGeneratorConfig {
  ide: SupportedIDE
  projectName: string
  generationId: string
  customPath?: string
  allowRelativePaths?: boolean
  strictValidation?: boolean
}

// Result interface for URL generation
export interface URLGenerationResult {
  success: boolean
  ideUrl?: string | null
  localPath?: string
  downloadUrl?: string
  error?: string
  warnings?: string[]
  supportsUrlScheme?: boolean
  commandLine?: string
  metadata?: {
    platform: string
    pathSeparator: string
    isAbsolute: boolean
    normalizedPath: string
  }
}

// IDE configuration mapping
const IDE_CONFIG = {
  vscode: {
    urlScheme: 'vscode',
    downloadUrl: 'https://code.visualstudio.com/download',
    displayName: 'Visual Studio Code',
    supportsUrlScheme: true,
    commandLine: 'code'
  },
  cursor: {
    urlScheme: null, // Cursor doesn't have a documented URL scheme
    downloadUrl: 'https://cursor.sh/download',
    displayName: 'Cursor',
    supportsUrlScheme: false,
    commandLine: 'cursor'
  }
} as const

// Security constants
const SECURITY_CONFIG = {
  MAX_PATH_LENGTH: 4096,
  FORBIDDEN_PATTERNS: [
    /\.\./,           // Directory traversal
    /\/\.\./,         // Unix directory traversal
    /\\\.\./,         // Windows directory traversal
    /^[a-zA-Z]:\\/,   // Windows drive letter (when not expected)
    /\/\//,           // Double slashes
    /\0/,             // Null bytes
    /[<>:"|?*]/       // Invalid filename characters
  ],
  ALLOWED_EXTENSIONS: [
    '.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.env',
    '.yml', '.yaml', '.xml', '.html', '.css', '.scss', '.sql',
    '.py', '.go', '.java', '.cpp', '.c', '.h', '.rs', '.rb', '.php'
  ]
}

/**
 * Validates a file path for security vulnerabilities
 */
export function validatePath(filePath: string, options: { 
  allowRelative?: boolean
  strictMode?: boolean 
} = {}): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check path length
  if (filePath.length > SECURITY_CONFIG.MAX_PATH_LENGTH) {
    errors.push(`Path exceeds maximum length of ${SECURITY_CONFIG.MAX_PATH_LENGTH} characters`)
  }

  // Check for forbidden patterns
  for (const pattern of SECURITY_CONFIG.FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      errors.push(`Path contains forbidden pattern: ${pattern.source}`)
    }
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    errors.push('Path contains null bytes')
  }

  // Validate path structure
  if (!options.allowRelative && !path.isAbsolute(filePath)) {
    if (options.strictMode) {
      errors.push('Relative paths are not allowed in strict mode')
    } else {
      warnings.push('Using relative path - consider using absolute paths for better security')
    }
  }

  // Check for suspicious characters in Windows paths
  if (process.platform === 'win32' && /[<>:"|?*]/.test(filePath)) {
    errors.push('Path contains characters invalid on Windows filesystem')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Normalizes a path for cross-platform compatibility
 */
export function normalizePath(inputPath: string): {
  normalized: string
  platform: string
  separator: string
  isAbsolute: boolean
} {
  const platform = process.platform
  const separator = path.sep
  
  // Normalize path separators
  let normalized = inputPath.replace(/[/\\]+/g, path.sep)
  
  // Resolve path to handle . and .. segments safely
  try {
    normalized = path.resolve(normalized)
  } catch {
    // If resolve fails, fall back to normalize
    normalized = path.normalize(normalized)
  }

  // Convert to forward slashes for URL usage (except for Windows absolute paths)
  const urlPath = platform === 'win32' 
    ? normalized.replace(/\\/g, '/') 
    : normalized

  return {
    normalized: urlPath,
    platform,
    separator,
    isAbsolute: path.isAbsolute(inputPath)
  }
}

/**
 * Encodes a path for safe URL usage
 */
export function encodePath(filePath: string): string {
  // Split path into segments to avoid encoding path separators
  const segments = filePath.split('/')
  
  // Encode each segment individually
  const encodedSegments = segments.map(segment => {
    // Don't encode empty segments (from leading slashes)
    if (segment === '') return segment
    
    // Encode the segment, but preserve some safe characters
    return encodeURIComponent(segment)
      .replace(/'/g, '%27')  // Encode single quotes
      .replace(/"/g, '%22')  // Encode double quotes
  })
  
  return encodedSegments.join('/')
}

/**
 * Creates a secure project path in the user's home directory
 */
export function createProjectPath(projectName: string, generationId: string, customPath?: string): {
  path: string
  created: boolean
  error?: string
} {
  try {
    let projectPath: string

    if (customPath) {
      // Validate custom path
      const validation = validatePath(customPath, { strictMode: true })
      if (!validation.isValid) {
        return {
          path: '',
          created: false,
          error: `Invalid custom path: ${validation.errors.join(', ')}`
        }
      }
      projectPath = customPath
    } else {
      // Create default path in user's home directory
      const homeDir = os.homedir()
      const projectsDir = path.join(homeDir, 'DevXProjects')
      
      // Sanitize project name and generation ID
      const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-')
      const sanitizedGenerationId = generationId.replace(/[^a-zA-Z0-9-_]/g, '-')
      
      projectPath = path.join(projectsDir, `${sanitizedProjectName}-${sanitizedGenerationId}`)
    }

    const normalized = normalizePath(projectPath)
    
    return {
      path: normalized.normalized,
      created: true
    }
  } catch (error) {
    return {
      path: '',
      created: false,
      error: error instanceof Error ? error.message : 'Unknown error creating project path'
    }
  }
}

/**
 * Generates IDE URL with comprehensive validation and error handling
 */
export function generateIDEUrl(config: URLGeneratorConfig): URLGenerationResult {
  const warnings: string[] = []
  
  try {
    // Validate IDE type
    if (!IDE_CONFIG[config.ide]) {
      return {
        success: false,
        error: `Unsupported IDE: ${config.ide}. Supported IDEs: ${Object.keys(IDE_CONFIG).join(', ')}`
      }
    }

    // Create project path
    const pathResult = createProjectPath(config.projectName, config.generationId, config.customPath)
    
    if (!pathResult.created) {
      return {
        success: false,
        error: pathResult.error
      }
    }

    // Validate the path
    const validation = validatePath(pathResult.path, {
      allowRelative: config.allowRelativePaths,
      strictMode: config.strictValidation
    })

    if (!validation.isValid) {
      return {
        success: false,
        error: `Path validation failed: ${validation.errors.join(', ')}`
      }
    }

    warnings.push(...validation.warnings)

    // Normalize and encode the path
    const pathInfo = normalizePath(pathResult.path)
    const encodedPath = encodePath(pathInfo.normalized)

    // Generate the IDE URL (if supported)
    const ideConfig = IDE_CONFIG[config.ide]
    let ideUrl: string | null = null
    
    if (ideConfig.supportsUrlScheme && ideConfig.urlScheme) {
      ideUrl = `${ideConfig.urlScheme}://file/${encodedPath}`
      
      // Validate the generated URL
      try {
        new URL(ideUrl)
      } catch {
        return {
          success: false,
          error: `Generated URL is invalid: ${ideUrl}`
        }
      }
    } else {
      // Add warning for IDEs that don't support URL schemes
      warnings.push(`${ideConfig.displayName} doesn't support automatic opening via URL scheme. Use command line or manual opening.`)
    }

    // Generate command line instruction
    const commandLine = `${ideConfig.commandLine} "${pathResult.path}"`

    return {
      success: true,
      ideUrl,
      localPath: pathResult.path,
      downloadUrl: ideConfig.downloadUrl,
      supportsUrlScheme: ideConfig.supportsUrlScheme,
      commandLine,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        platform: pathInfo.platform,
        pathSeparator: pathInfo.separator,
        isAbsolute: pathInfo.isAbsolute,
        normalizedPath: pathInfo.normalized
      }
    }

  } catch (error) {
    return {
      success: false,
      error: `URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Generates URLs for multiple IDEs at once
 */
export function generateMultipleIDEUrls(
  config: Omit<URLGeneratorConfig, 'ide'>,
  ides: SupportedIDE[]
): Record<SupportedIDE, URLGenerationResult> {
  const results: Record<string, URLGenerationResult> = {}
  
  for (const ide of ides) {
    results[ide] = generateIDEUrl({ ...config, ide })
  }
  
  return results as Record<SupportedIDE, URLGenerationResult>
}

/**
 * Gets system information for debugging
 */
export function getSystemInfo(): {
  platform: string
  homedir: string
  pathSeparator: string
  supportedIDEs: SupportedIDE[]
} {
  return {
    platform: process.platform,
    homedir: os.homedir(),
    pathSeparator: path.sep,
    supportedIDEs: Object.keys(IDE_CONFIG) as SupportedIDE[]
  }
}

/**
 * Export configurations separately for easier testing
 */
export { IDE_CONFIG, SECURITY_CONFIG }

/**
 * Default export with all functions
 */
const urlGeneratorUtils = {
  generateIDEUrl,
  generateMultipleIDEUrls,
  validatePath,
  normalizePath,
  encodePath,
  createProjectPath,
  getSystemInfo,
  IDE_CONFIG,
  SECURITY_CONFIG
}

export default urlGeneratorUtils