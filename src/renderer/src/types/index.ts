// Re-export all types
export * from './api'
export * from './config'

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
}

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  action: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface ActivityItem {
  id: string
  type: 'command' | 'skill' | 'hook' | 'config' | 'session'
  message: string
  timestamp: number
  status: 'success' | 'error' | 'warning' | 'info'
}
