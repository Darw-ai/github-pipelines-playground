/**
 * POST /api/scaffold
 * Initiates AI project scaffolding
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import GitHubClient from '@/lib/github-client';
import { authOptions } from '../auth/[...nextauth]/route';

const scaffoldSchema = z.object({
  targetRepo: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/, 'Invalid repository format (owner/repo)'),
  projectName: z.string().min(1).max(100),
  prompt: z.string().min(10).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const validation = scaffoldSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { targetRepo, projectName, prompt } = validation.data;
    const [owner, repo] = targetRepo.split('/');

    console.log(`[Scaffold] User ${session.user.name} scaffolding ${projectName} in ${targetRepo}`);

    // 3. Call GitHub API
    const client = new GitHubClient();

    const result = await client.dispatchScaffold({
      owner,
      repo,
      projectName,
      prompt,
    });

    console.log(`[Scaffold] Created session ${result.sessionId}`);

    // 4. Return response
    return NextResponse.json(
      {
        sessionId: result.sessionId,
        issueNumber: result.issueNumber,
        issueUrl: result.issueUrl,
        status: 'pending',
        message: 'Scaffolding workflow initiated successfully',
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error: any) {
    console.error('[Scaffold] Error:', error);

    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Repository not found or app not installed' },
        { status: 404 }
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        { error: 'Permission denied. Ensure the GitHub App is installed on this repository.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
