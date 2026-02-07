import React from 'react'
import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'error' | 'warning' | 'info'
  label: string
  className?: string
  pulse?: boolean
}

const statusStyles = {
  connected: 'bg-accent-green/10 text-accent-green',
  disconnected: 'bg-text-muted/10 text-text-muted',
  error: 'bg-accent-red/10 text-accent-red',
  warning: 'bg-accent-yellow/10 text-accent-yellow',
  info: 'bg-accent-blue/10 text-accent-blue',
}

const dotStyles = {
  connected: 'bg-accent-green',
  disconnected: 'bg-text-muted',
  error: 'bg-accent-red',
  warning: 'bg-accent-yellow',
  info: 'bg-accent-blue',
}

export function StatusBadge({ status, label, className, pulse }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', statusStyles[status], className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[status], pulse && 'animate-pulse')} />
      {label}
    </span>
  )
}
