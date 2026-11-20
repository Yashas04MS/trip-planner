export class ToolError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, code = 'TOOL_ERROR', retryable = false) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class ApprovalRequiredError extends Error {
  public readonly approvalId: string;

  constructor(message: string, approvalId: string) {
    super(message);
    this.name = 'ApprovalRequiredError';
    this.approvalId = approvalId;
  }
}

export class RetryableError extends ToolError {
  constructor(message: string, code = 'RETRYABLE_ERROR') {
    super(message, code, true);
    this.name = 'RetryableError';
  }
}
