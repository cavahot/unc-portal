import { logger } from './logger'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertType =
  | 'service_down'
  | 'high_memory'
  | 'high_latency'
  | 'failed_approval'
  | 'security_breach'
  | 'database_connection'
  | 'backup_failed'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: string
  resolved?: boolean
  resolvedAt?: string
}

class AlertManager {
  private alerts: Map<string, Alert> = new Map()
  private thresholds = {
    memoryUsagePercent: 85,
    responseTimeMs: 2000,
    noticias_en_revision_hours: 48,
    errorRatePercent: 5,
  }

  createAlert(type: AlertType, severity: AlertSeverity, title: string, message: string): Alert {
    const alert: Alert = {
      id: `${type}-${Date.now()}`,
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
    }

    this.alerts.set(alert.id, alert)

    // Log del alerta
    logger.warn('security', `Alert: ${title}`, { alert })

    // Enviar notificación según severidad
    this.notifyAlert(alert)

    return alert
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()
      logger.info('security', `Alert resolved: ${alert.title}`)
    }
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId)
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved)
  }

  getRecentAlerts(hours: number = 24): Alert[] {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString()
    return Array.from(this.alerts.values()).filter((a) => a.timestamp > cutoff)
  }

  checkServiceHealth(services: Record<string, { status: 'up' | 'down'; responseTime: number }>) {
    Object.entries(services).forEach(([serviceName, service]) => {
      if (service.status === 'down') {
        this.createAlert('service_down', 'critical', `Servicio ${serviceName} no disponible`, `El servicio ${serviceName} está caído`)
      }

      if (service.responseTime > this.thresholds.responseTimeMs) {
        this.createAlert('high_latency', 'warning', `Latencia alta en ${serviceName}`, `Respuesta de ${service.responseTime}ms en ${serviceName}`)
      }
    })
  }

  checkMemoryUsage(usedPercent: number) {
    if (usedPercent > this.thresholds.memoryUsagePercent) {
      this.createAlert('high_memory', 'warning', 'Uso de memoria alto', `Memoria en ${usedPercent}% de capacidad`)
    }
  }

  checkApprovalBacklog(noticiasEnRevision: number) {
    if (noticiasEnRevision > 10) {
      this.createAlert('failed_approval', 'warning', 'Backlog de aprobación', `Hay ${noticiasEnRevision} noticias esperando revisión`)
    }
  }

  private async notifyAlert(alert: Alert) {
    // Aquí iría la lógica para enviar email, Slack, etc.
    // Por ahora solo logueamos

    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${alert.title}`)
      console.error(alert.message)
      // TODO: Enviar email a admins
    } else if (alert.severity === 'warning') {
      console.warn(`⚠️ WARNING: ${alert.title}`)
    } else {
      console.log(`ℹ️ INFO: ${alert.title}`)
    }
  }

  setThreshold(thresholdKey: keyof typeof this.thresholds, value: number) {
    this.thresholds[thresholdKey] = value
  }

  getThresholds() {
    return this.thresholds
  }
}

export const alertManager = new AlertManager()
