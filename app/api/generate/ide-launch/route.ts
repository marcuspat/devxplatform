import { NextRequest, NextResponse } from 'next/server'

interface IDELaunchRequest {
  generationId: string
  ide: 'vscode' | 'cursor'
  projectName: string
}

export async function POST(request: NextRequest) {
  try {
    const body: IDELaunchRequest = await request.json()
    const { generationId, ide, projectName } = body

    // Generate the appropriate URL scheme for the IDE
    let ideUrl: string
    let downloadUrl: string
    
    // Create a GitHub repository URL that can be cloned
    // In production, this would create a temporary repo or use a template
    const githubOrgUrl = 'https://github.com/devx-platform'
    const repoUrl = `${githubOrgUrl}/${projectName}-${generationId}`
    
    switch (ide) {
      case 'vscode':
        // VSCode supports git clone URLs
        ideUrl = `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`
        downloadUrl = 'https://code.visualstudio.com/download'
        break
        
      case 'cursor':
        // Cursor uses similar URL scheme
        ideUrl = `cursor://open?url=${encodeURIComponent(repoUrl)}`
        downloadUrl = 'https://cursor.sh/download'
        break
        
      default:
        return NextResponse.json(
          { error: 'Unsupported IDE' },
          { status: 400 }
        )
    }
    
    // Return the launch URL and fallback information
    return NextResponse.json({
      success: true,
      ideUrl,
      downloadUrl,
      instructions: {
        title: `Opening in ${ide.toUpperCase()}...`,
        steps: [
          `1. Make sure ${ide.toUpperCase()} is installed`,
          `2. If the IDE doesn't open automatically, copy this URL: ${repoUrl}`,
          `3. Open ${ide.toUpperCase()} and clone the repository manually`,
          `4. Or download the files and open the folder in ${ide.toUpperCase()}`
        ],
        fallbackUrl: downloadUrl
      }
    })
  } catch (error) {
    console.error('IDE launch error:', error)
    return NextResponse.json(
      { error: 'Failed to generate IDE launch URL' },
      { status: 500 }
    )
  }
}