type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL as LogLevel]
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    // JSON format for production
    return JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      ...entry.context,
      ...(entry.error && {
        error: {
          message: entry.error.message,
          stack: entry.error.stack,
          name: entry.error.name,
        },
      }),
    })
  } else {
    // Human-readable format for development
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : ''
    const errorStr = entry.error
      ? `\n${entry.error.stack}`
      : ''
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}${errorStr}`
  }
}

function log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    error,
  }

  const formatted = formatLogEntry(entry)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug(message: string, context?: Record<string, any>) {
    log('debug', message, context)
  },

  info(message: string, context?: Record<string, any>) {
    log('info', message, context)
  },

  warn(message: string, context?: Record<string, any>) {
    log('warn', message, context)
  },

  error(message: string, error?: Error | Record<string, any>) {
    if (error instanceof Error) {
      log('error', message, undefined, error)
    } else {
      log('error', message, error)
    }
  },
}
