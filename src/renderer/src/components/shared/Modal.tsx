import React, { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  footer?: React.ReactNode
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
}

export function Modal({ open, onClose, title, description, children, className, size = 'md', footer }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, handleEscape])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={cn(
        'relative w-full mx-4 rounded-2xl border border-border bg-bg-card shadow-2xl',
        'animate-in fade-in zoom-in-95 duration-200',
        'max-h-[85vh] flex flex-col',
        sizeClasses[size],
        className
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-heading font-semibold">{title}</h2>
            {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-tertiary transition-colors text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
