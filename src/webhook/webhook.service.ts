import type {
  WebhookValidationResult,
  GithubPushPayload,
  GithubPullRequestPayload,
  GithubPingPayload,
} from './webhook.types.js';

export { verifyGithubSignature } from './webhook.middleware.js';

const COMMIT_SHA_REGEX = /^[0-9a-f]{7,40}$/i;
const ZERO_SHA = '0000000000000000000000000000000000000000';

export class WebhookService {
  /**
   * Parses and validates incoming GitHub webhook headers and payload.
   * Enforces Zero-Bloat native schema validation without third-party libraries.
   */
  public parseAndValidate(eventHeader: string | undefined, payload: any): WebhookValidationResult {
    // 1. Validate X-GitHub-Event header
    if (!eventHeader || typeof eventHeader !== 'string' || !eventHeader.trim()) {
      return {
        success: false,
        statusCode: 400,
        error: 'Bad Request: Missing or empty X-GitHub-Event header',
      };
    }

    const event = eventHeader.trim().toLowerCase();

    // 2. Validate payload object integrity
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {
        success: false,
        statusCode: 400,
        error: 'Bad Request: Payload must be a valid JSON object',
      };
    }

    // 3. Dispatch to specific event handler
    switch (event) {
      case 'push':
        return this.parsePush(payload as GithubPushPayload);
      case 'pull_request':
        return this.parsePullRequest(payload as GithubPullRequestPayload);
      case 'ping':
        return this.parsePing(payload as GithubPingPayload);
      default:
        // Gracefully ignore unsupported/non-CI events with HTTP 200
        return {
          success: true,
          result: {
            type: 'ignored',
            event,
            reason: `GitHub event '${event}' ignored`,
          },
        };
    }
  }

  private parsePush(payload: GithubPushPayload): WebhookValidationResult {
    const details: string[] = [];

    // Check for branch deletion
    const isDeleted = payload.deleted === true || payload.after === ZERO_SHA;
    if (isDeleted) {
      return {
        success: true,
        result: {
          type: 'ignored',
          event: 'push',
          reason: 'Branch deletion event ignored',
        },
      };
    }

    // Validate repository information
    const repository = payload.repository?.full_name || payload.repository?.name;
    if (!repository || typeof repository !== 'string' || !repository.trim()) {
      details.push('Missing repository full_name or name');
    }

    // Validate ref & extract branch
    const rawRef = payload.ref;
    if (!rawRef || typeof rawRef !== 'string' || !rawRef.trim()) {
      details.push('Missing or invalid ref');
    }

    let branch = 'main';
    if (typeof rawRef === 'string' && rawRef.trim()) {
      branch = rawRef.startsWith('refs/heads/')
        ? rawRef.slice('refs/heads/'.length)
        : rawRef.startsWith('refs/tags/')
        ? rawRef.slice('refs/tags/'.length)
        : rawRef;
      if (!branch.trim()) {
        details.push('Extracted branch name is empty');
      }
    }

    // Validate commit SHA
    const commitSha = payload.after && payload.after !== ZERO_SHA
      ? payload.after
      : payload.head_commit?.id;

    if (!commitSha || typeof commitSha !== 'string' || !COMMIT_SHA_REGEX.test(commitSha.trim())) {
      details.push('Invalid or missing commit SHA');
    }

    if (details.length > 0) {
      return {
        success: false,
        statusCode: 400,
        error: 'Bad Request: Malformed push payload',
        details,
      };
    }

    // Extract metadata
    const commitMessage = (payload.head_commit?.message || `Commit ${(commitSha as string).slice(0, 7)}`).trim();
    const author =
      payload.head_commit?.author?.name ||
      payload.head_commit?.author?.username ||
      payload.pusher?.name ||
      payload.sender?.login ||
      'Unknown';

    return {
      success: true,
      result: {
        type: 'pipeline',
        data: {
          repository: (repository as string).trim(),
          branch: branch.trim(),
          commit_sha: (commitSha as string).trim(),
          commit_message: commitMessage,
          author: author.trim(),
          event: 'push',
        },
      },
    };
  }

  private parsePullRequest(payload: GithubPullRequestPayload): WebhookValidationResult {
    const details: string[] = [];

    // Filter actionable PR lifecycle events
    const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : 'opened';
    const actionableActions = ['opened', 'synchronize', 'reopened'];

    if (!actionableActions.includes(action)) {
      return {
        success: true,
        result: {
          type: 'ignored',
          event: 'pull_request',
          reason: `Pull request action '${action}' ignored`,
        },
      };
    }

    const pr = payload.pull_request;
    if (!pr || typeof pr !== 'object') {
      return {
        success: false,
        statusCode: 400,
        error: 'Bad Request: Malformed pull_request payload',
        details: ['Missing pull_request object'],
      };
    }

    // Validate repository
    const repository =
      payload.repository?.full_name ||
      pr.head?.repo?.full_name ||
      pr.base?.repo?.full_name;

    if (!repository || typeof repository !== 'string' || !repository.trim()) {
      details.push('Missing repository full_name');
    }

    // Validate head branch
    const branch = pr.head?.ref;
    if (!branch || typeof branch !== 'string' || !branch.trim()) {
      details.push('Missing pull_request head branch (head.ref)');
    }

    // Validate head commit SHA (incoming code to build)
    const commitSha = pr.head?.sha;
    if (!commitSha || typeof commitSha !== 'string' || !COMMIT_SHA_REGEX.test(commitSha.trim())) {
      details.push('Invalid or missing pull_request head commit SHA (head.sha)');
    }

    if (details.length > 0) {
      return {
        success: false,
        statusCode: 400,
        error: 'Bad Request: Malformed pull_request payload',
        details,
      };
    }

    const commitMessage = (pr.title || `Pull Request #${payload.number || 'unknown'}`).trim();
    const author = pr.user?.login || payload.sender?.login || 'Unknown';

    return {
      success: true,
      result: {
        type: 'pipeline',
        data: {
          repository: (repository as string).trim(),
          branch: (branch as string).trim(),
          commit_sha: (commitSha as string).trim(),
          commit_message: commitMessage,
          author: author.trim(),
          event: 'pull_request',
        },
      },
    };
  }

  private parsePing(payload: GithubPingPayload): WebhookValidationResult {
    const zen = typeof payload.zen === 'string' && payload.zen.trim()
      ? payload.zen
      : 'Practicality beats purity.';
    const hookId = typeof payload.hook_id === 'number' ? payload.hook_id : undefined;

    return {
      success: true,
      result: {
        type: 'ping',
        zen,
        hook_id: hookId,
      },
    };
  }
}

export const webhookService = new WebhookService();
