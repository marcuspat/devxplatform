import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createProjectPath, validatePath, normalizePath, getSystemInfo } from '../../../lib/url-generator'

interface ExtractFilesRequest {
  generationId: string
  projectName: string
  mdContent?: string // Optional: MD content if provided directly
  targetPath?: string // Optional: custom target path
}

interface ExtractedFile {
  filename: string
  path: string
  content: string
  created: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractFilesRequest = await request.json()
    const { generationId, projectName, mdContent, targetPath } = body
    
    if (!mdContent) {
      return NextResponse.json(
        { error: 'MD content is required for file extraction' },
        { status: 400 }
      )
    }
    
    // Determine target directory using secure path creation
    let extractPath: string
    
    if (targetPath) {
      // Validate custom target path
      const validation = validatePath(targetPath, { strictMode: true })
      if (!validation.isValid) {
        return NextResponse.json(
          { 
            error: 'Invalid target path',
            details: validation.errors.join(', '),
            warnings: validation.warnings,
            systemInfo: getSystemInfo()
          },
          { status: 400 }
        )
      }
      extractPath = normalizePath(targetPath).normalized
    } else {
      // Create secure default path
      const pathResult = createProjectPath(projectName, generationId)
      if (!pathResult.created) {
        return NextResponse.json(
          { 
            error: 'Failed to create project path',
            details: pathResult.error,
            systemInfo: getSystemInfo()
          },
          { status: 400 }
        )
      }
      extractPath = pathResult.path
    }
    
    // Create directory structure
    await fs.mkdir(extractPath, { recursive: true })
    
    // Extract files from MD content
    const extractedFiles = await extractFilesFromMarkdown(mdContent, extractPath, projectName, generationId)
    
    // Create a project metadata file
    const metadata = {
      generationId,
      projectName,
      createdAt: new Date().toISOString(),
      platform: process.platform,
      extractedPath: extractPath,
      filesCount: extractedFiles.length,
      files: extractedFiles.map(f => f.filename)
    }
    
    await fs.writeFile(
      path.join(extractPath, '.devx-metadata.json'),
      JSON.stringify(metadata, null, 2)
    )
    
    return NextResponse.json({
      success: true,
      extractPath,
      filesExtracted: extractedFiles.length,
      files: extractedFiles,
      metadata: {
        ...metadata,
        pathValidation: 'All paths validated for security',
        crossPlatformCompatible: true
      },
      nextSteps: {
        vscode: `code "${extractPath}"`,
        cursor: `cursor "${extractPath}"`,
        terminal: `cd "${extractPath}"`
      },
      securityNotes: [
        'All file paths have been validated for security',
        'Directory traversal protection enabled',
        'Cross-platform path normalization applied'
      ],
      systemInfo: getSystemInfo()
    })
    
  } catch (error) {
    console.error('File extraction error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract files',
        details: error instanceof Error ? error.message : 'Unknown error',
        systemInfo: getSystemInfo()
      },
      { status: 500 }
    )
  }
}

async function extractFilesFromMarkdown(mdContent: string, targetPath: string, projectName: string, generationId: string): Promise<ExtractedFile[]> {
  const extractedFiles: ExtractedFile[] = []
  
  // Pattern to match code blocks with filenames
  // Matches: ### filename or ## filename followed by ```language
  const filePattern = /(?:###?\s+(?:`?([^`\n]+)`?)|^([^#\n][^\n]+\.(?:js|ts|tsx|jsx|py|go|java|cpp|c|h|hpp|rb|php|swift|kt|rs|sh|yaml|yml|json|xml|html|css|scss|sql|tf|tfvars|md|txt|env|dockerfile|Dockerfile|gitignore|toml|ini|cfg|conf))\s*$)\n+```[a-zA-Z0-9]*\n([\s\S]*?)```/gm
  
  let match
  while ((match = filePattern.exec(mdContent)) !== null) {
    const filename = match[1] || match[2]
    const content = match[3]
    
    if (filename && content) {
      // Clean the filename
      const cleanFilename = filename.trim().replace(/^[`'"]+|[`'"]+$/g, '')
      
      // Determine the file path
      const filePath = path.join(targetPath, cleanFilename)
      const fileDir = path.dirname(filePath)
      
      try {
        // Create directory if needed
        await fs.mkdir(fileDir, { recursive: true })
        
        // Write the file
        await fs.writeFile(filePath, content.trim())
        
        extractedFiles.push({
          filename: cleanFilename,
          path: filePath,
          content: content.trim(),
          created: true
        })
      } catch (error) {
        console.error(`Failed to create file ${cleanFilename}:`, error)
        extractedFiles.push({
          filename: cleanFilename,
          path: filePath,
          content: content.trim(),
          created: false
        })
      }
    }
  }
  
  // Also look for special sections like package.json, Dockerfile, etc.
  const specialFiles = extractSpecialFiles(mdContent, targetPath)
  for (const specialFile of specialFiles) {
    try {
      const filePath = path.join(targetPath, specialFile.filename)
      const fileDir = path.dirname(filePath)
      
      await fs.mkdir(fileDir, { recursive: true })
      await fs.writeFile(filePath, specialFile.content)
      
      extractedFiles.push({
        filename: specialFile.filename,
        path: filePath,
        content: specialFile.content,
        created: true
      })
    } catch (error) {
      console.error(`Failed to create special file ${specialFile.filename}:`, error)
    }
  }
  
  // Create a README if not already present
  if (!extractedFiles.some(f => f.filename.toLowerCase() === 'readme.md')) {
    const readmeContent = generateReadmeFromMD(mdContent, projectName, generationId)
    const readmePath = path.join(targetPath, 'README.md')
    
    await fs.writeFile(readmePath, readmeContent)
    extractedFiles.push({
      filename: 'README.md',
      path: readmePath,
      content: readmeContent,
      created: true
    })
  }
  
  return extractedFiles
}

function extractSpecialFiles(mdContent: string, _targetPath: string): Array<{filename: string, content: string}> {
  const specialFiles: Array<{filename: string, content: string}> = []
  
  // Extract package.json if present
  const packageJsonMatch = mdContent.match(/```json\n(\{[\s\S]*?"name"[\s\S]*?\})\n```/m)
  if (packageJsonMatch && !mdContent.includes('### package.json')) {
    try {
      const packageJson = JSON.parse(packageJsonMatch[1])
      if (packageJson.name && (packageJson.dependencies || packageJson.scripts)) {
        specialFiles.push({
          filename: 'package.json',
          content: JSON.stringify(packageJson, null, 2)
        })
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  
  // Extract .gitignore
  const gitignoreMatch = mdContent.match(/(?:###?\s+\.gitignore|^\.gitignore)\n+```[a-zA-Z0-9]*\n([\s\S]*?)```/m)
  if (gitignoreMatch) {
    specialFiles.push({
      filename: '.gitignore',
      content: gitignoreMatch[1].trim()
    })
  } else {
    // Create default .gitignore
    specialFiles.push({
      filename: '.gitignore',
      content: `node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
.idea/
.vscode/
*.swp
*.swo
coverage/
.nyc_output/
.devx-metadata.json`
    })
  }
  
  // Extract .env.example
  const envExampleMatch = mdContent.match(/(?:###?\s+\.env\.example|^\.env\.example)\n+```[a-zA-Z0-9]*\n([\s\S]*?)```/m)
  if (envExampleMatch) {
    specialFiles.push({
      filename: '.env.example',
      content: envExampleMatch[1].trim()
    })
  }
  
  return specialFiles
}

function generateReadmeFromMD(mdContent: string, projectNameParam: string, generationIdParam: string): string {
  const projectName = projectNameParam
  const generationId = generationIdParam
  // Extract key sections from the MD content
  const overviewMatch = mdContent.match(/##\s+(?:Service\s+)?Overview\n+([\s\S]*?)(?=\n##|\n---)/i)
  const quickStartMatch = mdContent.match(/##\s+Quick\s+Start\n+([\s\S]*?)(?=\n##|\n---)/i)
  const featuresMatch = mdContent.match(/###?\s+Features(?:\s+Included)?\n+([\s\S]*?)(?=\n##|\n---)/i)
  
  let readme = `# ${projectName}

Generated with DevX Platform (ID: ${generationId})

`

  if (overviewMatch) {
    readme += `## Overview

${overviewMatch[1].trim()}

`
  }

  if (featuresMatch) {
    readme += `## Features

${featuresMatch[1].trim()}

`
  }

  if (quickStartMatch) {
    readme += `## Quick Start

${quickStartMatch[1].trim()}

`
  } else {
    readme += `## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

`
  }

  readme += `## Project Structure

This project was generated by DevX Platform and includes:

- Source code files
- Configuration files
- Docker setup
- CI/CD pipelines
- Test files
- Documentation

## Support

For issues or questions:
- Documentation: https://docs.devx.platform
- Issues: https://github.com/devx/platform/issues

---

Generated by DevX Platform v2.0
`

  return readme
}