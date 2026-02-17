export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class GuardrailViolation extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'GUARDRAIL_VIOLATION', 400, details)
    this.name = 'GuardrailViolation'
    Object.setPrototypeOf(this, GuardrailViolation.prototype)
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient credits: ${available} available, ${required} required`,
      'INSUFFICIENT_CREDITS',
      402,
      { required, available }
    )
    this.name = 'InsufficientCreditsError'
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype)
  }
}

export class GenerationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'GENERATION_ERROR', 500, details)
    this.name = 'GenerationError'
    Object.setPrototypeOf(this, GenerationError.prototype)
  }
}

export class MediaRenderError extends AppError {
  constructor(message: string, provider: string, details?: Record<string, any>) {
    super(message, 'MEDIA_RENDER_ERROR', 500, { provider, ...details })
    this.name = 'MediaRenderError'
    Object.setPrototypeOf(this, MediaRenderError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field })
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource} not found${id ? `: ${id}` : ''}`,
      'NOT_FOUND',
      404,
      { resource, id }
    )
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}
