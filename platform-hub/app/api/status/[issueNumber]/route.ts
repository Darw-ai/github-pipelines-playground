/**
 * GET /api/status/[issueNumber]
 * Gets the status of a task by querying its GitHub issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import GitHubClient from '@/lib/github-client';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(
  req: NextRequest,
  { params }: { params: { issueNumber: string } }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse parameters
    const issueNumber = parseInt(params.issueNumber, 10);

    if (isNaN(issueNumber)) {
      return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 });
    }

    // 3. Get repo from query params
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get('repo'); // Format: owner/repo

    if (!repo || !repo.includes('/')) {
      return NextResponse.json(
        { error: 'Missing or invalid "repo" query parameter (format: owner/repo)' },
        { status: 400 }
      );
    }

    const [owner, repoName] = repo.split('/');

    console.log(`[Status] Querying ${owner}/${repoName}#${issueNumber}`);

    // 4. Call GitHub API
    const client = new GitHubClient();
    const status = await client.getStatus(owner, repoName, issueNumber);

    // 5. Return response
    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error('[Status] Error:', error);

    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Issue not found or repository not accessible' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
