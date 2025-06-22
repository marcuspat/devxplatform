import { NextRequest, NextResponse } from 'next/server'
import { generateIDEUrl, getSystemInfo, type SupportedIDE } from '../../../lib/url-generator'

interface IDELaunchRequest {
  generationId: string
  ide: SupportedIDE
  projectName: string
  customPath?: string
  strictValidation?: boolean
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

    // Generate IDE URL using the secure utility
    const result = generateIDEUrl({
      ide,
      projectName,
      generationId,
      customPath,
      strictValidation: strictValidation ?? true // Default to strict validation
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to generate IDE launch URL',
          details: result.error,
          systemInfo: getSystemInfo()
        },
        { status: 400 }
      )
    }

    // Generate IDE-specific instructions based on URL scheme support
    const instructions = result.supportsUrlScheme ? {
      title: `Opening in ${ide.toUpperCase()}...`,
      steps: [
        `1. First download the generated service files`,
        `2. Extract the files to: ${result.localPath}`,
        `3. Make sure ${ide.toUpperCase()} is installed`,
        `4. The IDE should open automatically with your project`,
        `5. If it doesn't open, try: ${result.commandLine}`,
        `6. Or manually open ${ide.toUpperCase()} and select: File > Open Folder > ${result.localPath}`
      ],
      fallbackUrl: result.downloadUrl,
      downloadFirst: true,
      extractPath: result.localPath,
      platform: result.metadata?.platform,
      securityNotes: [
        'Path has been validated for security',
        'Special characters have been properly encoded',
        'Cross-platform compatibility ensured'
      ]
    } : {
      title: `${ide.toUpperCase()} setup instructions`,
      steps: [
        `1. First download the generated service files`,
        `2. Extract the files to: ${result.localPath}`,
        `3. Make sure ${ide.toUpperCase()} is installed`,
        `❗ ${ide.toUpperCase()} doesn't support automatic opening via URL`,
        ``,
        `To open your project in ${ide.toUpperCase()}:`,
        ``,
        `Option 1 - Command Line (Recommended):`,
        `Run: ${result.commandLine}`,
        ``,
        `Option 2 - Manual:`,
        `1. Open ${ide.toUpperCase()} manually`,
        `2. Select File > Open Folder`,
        `3. Navigate to: ${result.localPath}`,
        ``,
        `Note: To enable the '${result.commandLine?.split(' ')[0]}' command:`,
        `1. Open ${ide.toUpperCase()}`,
        `2. Press Cmd/Ctrl + Shift + P`,
        `3. Type "Shell Command: Install ${ide.toUpperCase()} command"`
      ],
      fallbackUrl: result.downloadUrl,
      downloadFirst: true,
      extractPath: result.localPath,
      commandLine: result.commandLine,
      platform: result.metadata?.platform,
      securityNotes: [
        'Path has been validated for security',
        'Special characters have been properly encoded',
        'Cross-platform compatibility ensured'
      ]
    }

    // Return the launch URL and instructions with enhanced information
    return NextResponse.json({
      success: true,
      ideUrl: result.ideUrl,
      downloadUrl: result.downloadUrl,
      localPath: result.localPath,
      warnings: result.warnings,
      metadata: result.metadata,
      supportsUrlScheme: result.supportsUrlScheme,
      commandLine: result.commandLine,
      instructions,
      systemInfo: getSystemInfo()
    })
  } catch (error) {
    console.error('IDE launch error:', error)
    
    // Provide detailed error information for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      systemInfo: getSystemInfo()
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate IDE launch URL',
        details: errorDetails,
        suggestion: 'Please check your request parameters and system configuration'
      },
      { status: 500 }
    )
  }
}