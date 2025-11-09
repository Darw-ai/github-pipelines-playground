/**
 * POST /api/sdlc-deploy
 * Initiates SDLC deployment cycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import GitHubClient from '@/lib/github-client';
import { authOptions } from '../auth/[...nextauth]/route';

const sdlcSchema = z.object({
  targetRepo: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/, 'Invalid repository format (owner/repo)'),
  branch: z.string().min(1).max(100).optional().default('main'),
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
    const validation = sdlcSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { targetRepo, branch } = validation.data;
    const [owner, repo] = targetRepo.split('/');

    console.log(`[SDLC] User ${session.user.name} deploying ${targetRepo}@${branch}`);

    // 3. Call GitHub API
    const client = new GitHubClient();

    const result = await client.dispatchSDLC({
      owner,
      repo,
      branch,
    });

    console.log(`[SDLC] Created session ${result.sessionId}`);

    // 4. Return response
    return NextResponse.json(
      {
        sessionId: result.sessionId,
        issueNumber: result.issueNumber,
        issueUrl: result.issueUrl,
        status: 'pending',
        message: 'SDLC deployment workflow initiated successfully',
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error: any) {
    console.error('[SDLC] Error:', error);

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
