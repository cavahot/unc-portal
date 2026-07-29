/**
 * Validación y sanitización de entrada para prevenir XSS y SQL Injection
 */

export class InputValidator {
  /**
   * Valida y sanitiza strings
   */
  static sanitizeString(input: string, maxLength: number = 500): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .substring(0, maxLength)
      .replace(/[<>\"'`;]/g, (char) => {
        const map: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '`': '&#x60;',
          ';': '&#x3B;',
        }
        return map[char] || char
      })
  }

  /**
   * Valida slugs (alfanuméricos + guiones)
   */
  static validateSlug(input: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    return slugRegex.test(input)
  }

  /**
   * Valida emails
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  /**
   * Valida URLs
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Valida números
   */
  static validateNumber(input: unknown, min: number = 0, max: number = 999999): boolean {
    const num = Number(input)
    return !isNaN(num) && num >= min && num <= max
  }

  /**
   * Valida tipos de archivo permitidos
   */
  static validateFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext ? allowedTypes.includes(ext) : false
  }

  /**
   * Valida tamaño de archivo (en bytes)
   */
  static validateFileSize(sizeBytes: number, maxSizeBytes: number = 5 * 1024 * 1024): boolean {
    return sizeBytes <= maxSizeBytes && sizeBytes > 0
  }

  /**
   * Valida y sanitiza entrada JSON
   */
  static validateJSON(input: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(input)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>
      }
      return null
    } catch {
      return null
    }
  }
}

/**
 * Middleware para validar parámetros de query
 */
export function validateQueryParams(
  params: Record<string, unknown>,
  schema: Record<string, { type: string; required?: boolean; maxLength?: number }>
): Record<string, unknown> {
  const validated: Record<string, unknown> = {}

  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key]

    if (rules.required && !value) {
      throw new Error(`Parameter "${key}" is required`)
    }

    if (!value) continue

    if (rules.type === 'string') {
      validated[key] = InputValidator.sanitizeString(String(value), rules.maxLength)
    } else if (rules.type === 'number') {
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error(`Parameter "${key}" must be a number`)
      }
      validated[key] = num
    } else if (rules.type === 'email') {
      if (!InputValidator.validateEmail(String(value))) {
        throw new Error(`Parameter "${key}" must be a valid email`)
      }
      validated[key] = value
    } else if (rules.type === 'slug') {
      if (!InputValidator.validateSlug(String(value))) {
        throw new Error(`Parameter "${key}" must be a valid slug`)
      }
      validated[key] = value
    }
  }

  return validated
}
