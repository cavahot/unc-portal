import * as fs from 'fs'
import * as path from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'
export type LogCategory = 'cms' | 'portal' | 'database' | 'auth' | 'api' | 'security' | 'performance'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  details?: Record<string, any>
  userId?: string
  ip?: string
  duration?: number
}

class Logger {
  private logDir: string
  private currentDate: string = new Date().toISOString().split('T')[0]

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs')
    this.ensureLogDirectory()
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getLogFile(category: LogCategory): string {
    return path.join(this.logDir, `${category}-${this.currentDate}.log`)
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n'
  }

  private writeLog(entry: LogEntry) {
    const logFile = this.getLogFile(entry.category)

    try {
      fs.appendFileSync(logFile, this.formatLogEntry(entry))
    } catch (error) {
      console.error('Failed to write log:', error)
    }

    // Console output en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`
      console.log(`${prefix} ${entry.message}`, entry.details || '')
    }
  }

  debug(category: LogCategory, message: string, details?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      category,
      message,
      details,
    })
  }

  info(category: LogCategory, message: string, details?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      category,
      message,
      details,
    })
  }

  warn(category: LogCategory, message: string, details?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      category,
      message,
      details,
    })
  }

  error(category: LogCategory, message: string, details?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      category,
      message,
      details,
    })
  }

  critical(category: LogCategory, message: string, details?: Record<string, any>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'critical',
      category,
      message,
      details,
    })
  }

  logRequest(category: LogCategory, method: string, path: string, statusCode: number, duration: number, userId?: string, ip?: string) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      category,
      message: `${method} ${path} ${statusCode}`,
      details: { method, path, statusCode },
      duration,
      userId,
      ip,
    })
  }

  logError(category: LogCategory, error: unknown, context?: Record<string, any>) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      category,
      message: errorMessage,
      details: {
        ...context,
        stack: errorStack,
      },
    })
  }

  // Lectura de logs
  getLogs(category: LogCategory, limit: number = 100): LogEntry[] {
    const logFile = this.getLogFile(category)

    if (!fs.existsSync(logFile)) {
      return []
    }

    try {
      const content = fs.readFileSync(logFile, 'utf-8')
      const lines = content.trim().split('\n')

      return lines
        .slice(-limit)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter((entry): entry is LogEntry => entry !== null)
    } catch (error) {
      console.error('Failed to read logs:', error)
      return []
    }
  }

  getLogsByLevel(category: LogCategory, level: LogLevel, limit: number = 100): LogEntry[] {
    return this.getLogs(category, limit * 2).filter((entry) => entry.level === level)
  }

  getRecentErrors(hours: number = 24): LogEntry[] {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString()
    const errors: LogEntry[] = []

    const categories: LogCategory[] = ['cms', 'portal', 'database', 'auth', 'api', 'security', 'performance']

    categories.forEach((category) => {
      const logs = this.getLogs(category, 1000)
      logs.forEach((log) => {
        if ((log.level === 'error' || log.level === 'critical') && log.timestamp > cutoff) {
          errors.push(log)
        }
      })
    })

    return errors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
}

export const logger = new Logger()
