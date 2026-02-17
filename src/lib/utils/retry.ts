export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (error: Error, attempt: number) => void
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      // Check if error is retriable
      if (!isRetriableError(lastError)) {
        throw lastError
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1)
      }

      // Wait with exponential backoff
      await sleep(delay)
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError!
}

export function isRetriableError(error: Error): boolean {
  const retriablePatterns = [
    /timeout/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /rate limit/i,
    /too many requests/i,
    /503/i,
    /502/i,
    /500/i,
    /network/i,
    /temporarily unavailable/i,
  ]

  const errorMessage = error.message || error.toString()
  return retriablePatterns.some((pattern) => pattern.test(errorMessage))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Retry with jitter to avoid thundering herd
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      if (!isRetriableError(lastError)) {
        throw lastError
      }

      if (onRetry) {
        onRetry(lastError, attempt + 1)
      }

      // Add random jitter (0-50% of delay)
      const jitter = Math.random() * delay * 0.5
      const delayWithJitter = delay + jitter

      await sleep(Math.min(delayWithJitter, maxDelay))
      delay = delay * backoffMultiplier
    }
  }

  throw lastError!
}
