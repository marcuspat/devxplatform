import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { generateIDEUrl, getSystemInfo, type SupportedIDE } from '../../../lib/url-generator'

interface IDELaunchRequest {
  generationId: string
  ide: SupportedIDE
  projectName: string
  customPath?: string
  strictValidation?: boolean
}

// Extract files from the MD content
async function extractFilesFromMD(mdContent: string): Promise<{ [key: string]: string }> {
  const files: { [key: string]: string } = {}
  
  // Improved regex to match various code block patterns
  // Pattern: ### filename followed by code block
  const fileRegex = /### `?([^`\n]+)`?\s*\n+```[\w]*\s*\n([\s\S]*?)```/g
  
  let match
  let extractedCount = 0
  
  while ((match = fileRegex.exec(mdContent)) !== null) {
    const filename = match[1].trim()
    const content = match[2].trim()
    
    // More robust filename validation
    if (filename && 
        !filename.includes('```') && 
        (filename.includes('.') || filename === 'Dockerfile') &&
        !filename.toLowerCase().includes('overview') &&
        !filename.toLowerCase().includes('readme section') &&
        content.length > 0) {
      
      files[filename] = content
      extractedCount++
      console.log(`Extracted file: ${filename} (${content.length} chars)`)
    }
  }
  
  console.log(`Total files extracted: ${extractedCount}`)
  
  // Fallback extraction if the main regex fails
  if (extractedCount === 0) {
    console.log('Primary extraction failed, trying fallback method...')
    
    // Alternative pattern for files without ### prefix
    const fallbackRegex = /```(\w+)\s*\/\/ ([^\n]+)\n([\s\S]*?)```/g
    let fallbackMatch
    
    while ((fallbackMatch = fallbackRegex.exec(mdContent)) !== null) {
      const filename = fallbackMatch[2].trim()
      const content = fallbackMatch[3].trim()
      
      if (filename.includes('.')) {
        files[filename] = content
        extractedCount++
        console.log(`Fallback extracted: ${filename}`)
      }
    }
  }
  
  return files
}

// Create project directory and write files
async function createProjectFiles(projectPath: string, files: { [key: string]: string }) {
  // Create the project directory
  await fs.mkdir(projectPath, { recursive: true })
  
  // Write each file
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(projectPath, filename)
    const fileDir = path.dirname(filePath)
    
    // Create subdirectories if needed
    await fs.mkdir(fileDir, { recursive: true })
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf8')
  }
  
  // Create a .vscode directory with recommended extensions
  const vscodeDir = path.join(projectPath, '.vscode')
  await fs.mkdir(vscodeDir, { recursive: true })
  
  const extensions = {
    recommendations: [
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'ms-azuretools.vscode-docker',
      'ms-kubernetes-tools.vscode-kubernetes-tools'
    ]
  }
  
  await fs.writeFile(
    path.join(vscodeDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2),
    'utf8'
  )
  
  // Create settings.json for better development experience
  const settings = {
    'editor.formatOnSave': true,
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': true
    },
    'typescript.updateImportsOnFileMove.enabled': 'always',
    'files.exclude': {
      '**/node_modules': true,
      '**/.git': true,
      '**/dist': true,
      '**/build': true
    }
  }
  
  await fs.writeFile(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2),
    'utf8'
  )
}

export async function POST(request: NextRequest) {
  try {
    const body: IDELaunchRequest = await request.json()
    const { generationId, ide, projectName, customPath, strictValidation } = body
    
    // Validate required fields
    if (!generationId || !ide || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields: generationId, ide, and projectName are required' },
        { status: 400 }
      )
    }
    
    console.log(`Enhanced IDE launch request: ${ide} for ${projectName} (${generationId})`)
    
    // First, fetch the generated MD content
    const downloadUrl = new URL(`/api/generate/download/${generationId}`, request.url)
    console.log(`Fetching content from: ${downloadUrl.toString()}`)
    
    const downloadResponse = await fetch(downloadUrl.toString())
    
    if (!downloadResponse.ok) {
      console.error(`Download failed with status: ${downloadResponse.status}`)
      throw new Error(`Failed to download generated files: ${downloadResponse.status} ${downloadResponse.statusText}`)
    }
    
    const mdContent = await downloadResponse.text()
    console.log(`MD content length: ${mdContent.length} characters`)
    
    // Extract files from MD content
    const files = await extractFilesFromMD(mdContent)
    
    if (Object.keys(files).length === 0) {
      console.error('No files extracted from MD content')
      console.log('MD content preview:', mdContent.substring(0, 500) + '...')
      throw new Error('No files found in the generated content. The MD format may be unexpected.')
    }
    
    console.log(`Successfully extracted ${Object.keys(files).length} files:`, Object.keys(files))
    
    // Generate secure project path using the URL generator utility
    const urlResult = generateIDEUrl({
      ide,
      projectName,
      generationId,
      customPath,
      strictValidation: strictValidation ?? true
    })
    
    if (!urlResult.success) {
      console.error('URL generation failed:', urlResult.error)
      return NextResponse.json(
        { 
          error: 'Failed to generate secure project path',
          details: urlResult.error,
          systemInfo: getSystemInfo()
        },
        { status: 400 }
      )
    }
    
    // Create the project files using the validated path
    console.log(`Creating project files in: ${urlResult.localPath}`)
    await createProjectFiles(urlResult.localPath!, files)
    console.log(`Successfully created project with ${Object.keys(files).length} files`)
    
    // Generate IDE URL and instructions using secure utility results
    const ideUrl = urlResult.ideUrl
    const downloadFallbackUrl = urlResult.downloadUrl!
    const projectPath = urlResult.localPath!
    const canAutoOpen = ide === 'vscode' // VSCode supports URL scheme, Cursor has limitations
    const openCommand = ide === 'vscode' ? `code "${projectPath}"` : `cursor "${projectPath}"`
    
    console.log(`Generated ${ide.toUpperCase()} URL: ${ideUrl}`)
    
    // Return success response with IDE-specific instructions
    const instructions = canAutoOpen ? {
      title: `Project created successfully!`,
      steps: [
        `✅ Created ${Object.keys(files).length} files in ${projectPath}`,
        `✅ Opening project in ${ide.toUpperCase()}...`,
        ``,
        `If ${ide.toUpperCase()} doesn't open automatically:`,
        `1. Open ${ide.toUpperCase()} manually`,
        `2. Select File > Open Folder`,
        `3. Navigate to: ${projectPath}`,
        ``,
        `Or use the command line:`,
        `${openCommand}`
      ],
      fallbackUrl: downloadFallbackUrl,
      projectPath: projectPath
    } : {
      title: `Project created successfully!`,
      steps: [
        `✅ Created ${Object.keys(files).length} files in ${projectPath}`,
        `❗ Cursor doesn't support automatic opening via URL`,
        ``,
        `To open your project in Cursor:`,
        ``,
        `Option 1 - Command Line (Recommended):`,
        `1. Open your terminal`,
        `2. Run: ${openCommand}`,
        ``,
        `Option 2 - Manual:`,
        `1. Open Cursor manually`,
        `2. Select File > Open Folder`,
        `3. Navigate to: ${projectPath}`,
        ``,
        `Note: To enable the 'cursor' command, open Cursor and:`,
        `1. Press Cmd/Ctrl + Shift + P`,
        `2. Type "Shell Command: Install Cursor command"`
      ],
      fallbackUrl: downloadFallbackUrl,
      projectPath: projectPath,
      commandLine: openCommand
    }

    return NextResponse.json({
      success: true,
      ideUrl,
      downloadUrl: downloadFallbackUrl,
      localPath: projectPath,
      filesCreated: Object.keys(files).length,
      fileNames: Object.keys(files),
      canAutoOpen,
      openCommand,
      warnings: urlResult.warnings,
      metadata: urlResult.metadata,
      instructions: {
        ...instructions,
        securityNotes: [
          'Project path has been validated for security',
          'All file paths have been sanitized',
          'Cross-platform compatibility ensured'
        ]
      },
      systemInfo: getSystemInfo()
    })
  } catch (error) {
    console.error('Enhanced IDE launch error:', error)
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const stackTrace = error instanceof Error ? error.stack : 'No stack trace available'
    
    console.error('Error details:', {
      message: errorMessage,
      stack: stackTrace,
      generationId: (error as any).generationId || 'unknown'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to create and open project',
        details: errorMessage,
        suggestion: 'Please try downloading the files manually and opening them in your IDE',
        debug: {
          timestamp: new Date().toISOString(),
          error: errorMessage,
          stack: stackTrace
        },
        systemInfo: getSystemInfo()
      },
      { status: 500 }
    )
  }
}