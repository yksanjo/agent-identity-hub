export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400);
    if (details) {
      (this as unknown as Record<string, unknown>).details = details;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class DIDError extends AppError {
  constructor(message: string, code: string = 'DID_ERROR') {
    super(message, code, 400);
  }
}

export class CapabilityError extends AppError {
  constructor(message: string, code: string = 'CAPABILITY_ERROR') {
    super(message, code, 403);
  }
}

export class AttestationError extends AppError {
  constructor(message: string, code: string = 'ATTESTATION_ERROR') {
    super(message, code, 400);
  }
}

export function handleError(error: Error): {
  code: string;
  message: string;
  statusCode: number;
  stack?: string;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  // Handle unexpected errors
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}
