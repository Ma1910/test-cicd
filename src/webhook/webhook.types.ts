import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

export interface WebhookPipelineData {
  repository: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  author: string;
  event: 'push' | 'pull_request';
}

export type WebhookParseResult =
  | {
      type: 'pipeline';
      data: WebhookPipelineData;
    }
  | {
      type: 'ping';
      zen: string;
      hook_id?: number;
    }
  | {
      type: 'ignored';
      reason: string;
      event: string;
    };

export type WebhookValidationResult =
  | {
      success: true;
      result: WebhookParseResult;
    }
  | {
      success: false;
      statusCode: 400;
      error: string;
      details?: string[];
    };

export interface GithubPushPayload {
  ref?: string;
  before?: string;
  after?: string;
  deleted?: boolean;
  repository?: {
    id?: number;
    name?: string;
    full_name?: string;
    html_url?: string;
    clone_url?: string;
    owner?: {
      name?: string;
      login?: string;
    };
  };
  pusher?: {
    name?: string;
    email?: string;
  };
  sender?: {
    login?: string;
  };
  head_commit?: {
    id?: string;
    message?: string;
    timestamp?: string;
    url?: string;
    author?: {
      name?: string;
      email?: string;
      username?: string;
    };
  } | null;
}

export interface GithubPullRequestPayload {
  action?: 'opened' | 'synchronize' | 'reopened' | 'closed' | string;
  number?: number;
  pull_request?: {
    id?: number;
    number?: number;
    state?: string;
    title?: string;
    user?: {
      login?: string;
    };
    head?: {
      ref?: string;
      sha?: string;
      repo?: {
        name?: string;
        full_name?: string;
      };
    };
    base?: {
      ref?: string;
      sha?: string;
      repo?: {
        name?: string;
        full_name?: string;
      };
    };
  };
  repository?: {
    name?: string;
    full_name?: string;
  };
  sender?: {
    login?: string;
  };
}

export interface GithubPingPayload {
  zen?: string;
  hook_id?: number;
}
