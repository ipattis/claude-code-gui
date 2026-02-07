import React, { useState, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'

export interface WizardStepDef {
  id: string
  title: string
  description: string
}

interface StepWizardProps {
  steps: WizardStepDef[]
  currentStep: number
  onStepChange: (step: number) => void
  onComplete: () => void
  onCancel: () => void
  canAdvance: boolean
  children: React.ReactNode
  completeLabel?: string
}

export function StepWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  canAdvance,
  children,
  completeLabel = 'Create'
}: StepWizardProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center gap-1 px-6 py-4 border-b border-border bg-bg-secondary">
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => i < currentStep ? onStepChange(i) : undefined}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
                i === currentStep && 'bg-accent-orange/10 text-accent-orange font-medium',
                i < currentStep && 'text-accent-green cursor-pointer hover:bg-bg-tertiary',
                i > currentStep && 'text-text-muted'
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border',
                i === currentStep && 'border-accent-orange bg-accent-orange/20 text-accent-orange',
                i < currentStep && 'border-accent-green bg-accent-green/20 text-accent-green',
                i > currentStep && 'border-border text-text-muted'
              )}>
                {i < currentStep ? <Check size={12} /> : i + 1}
              </span>
              <span className="hidden md:inline">{step.title}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-px max-w-8',
                i < currentStep ? 'bg-accent-green/50' : 'bg-border'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4">
          <h3 className="text-lg font-heading font-semibold">{steps[currentStep].title}</h3>
          <p className="text-sm text-text-secondary mt-1">{steps[currentStep].description}</p>
        </div>
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg-secondary">
        <button onClick={onCancel} className="btn-ghost">
          <X size={16} />
          Cancel
        </button>
        <div className="flex items-center gap-3">
          {!isFirst && (
            <button onClick={() => onStepChange(currentStep - 1)} className="btn-secondary">
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          {isLast ? (
            <button onClick={onComplete} disabled={!canAdvance} className="btn-primary">
              <Check size={16} />
              {completeLabel}
            </button>
          ) : (
            <button onClick={() => onStepChange(currentStep + 1)} disabled={!canAdvance} className="btn-primary">
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
