import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  placeholder?: string
  readOnly?: boolean
  className?: string
  minHeight?: string
  maxHeight?: string
  lineNumbers?: boolean
}

export function CodeEditor({
  value,
  onChange,
  language = 'markdown',
  placeholder = 'Start typing...',
  readOnly = false,
  className,
  minHeight = '200px',
  maxHeight = '500px',
  lineNumbers = true,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineCountRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  useEffect(() => {
    const lines = (value || '').split('\n').length
    setLineCount(lines)
  }, [value])

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineCountRef.current) {
      lineCountRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }, [value, onChange])

  return (
    <div className={cn('relative rounded-lg border border-border overflow-hidden bg-bg-primary', className)}>
      <div className="flex" style={{ minHeight, maxHeight }}>
        {lineNumbers && (
          <div
            ref={lineCountRef}
            className="flex-shrink-0 select-none overflow-hidden py-3 px-2 text-right border-r border-border bg-bg-secondary"
            style={{ minWidth: '3.5rem' }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-xs leading-6 text-text-muted font-mono">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            'flex-1 py-3 px-4 bg-transparent text-text-primary text-sm font-mono',
            'leading-6 resize-none focus:outline-none',
            'placeholder:text-text-muted',
            readOnly && 'opacity-70 cursor-not-allowed'
          )}
          style={{ minHeight, maxHeight }}
        />
      </div>
      {language && (
        <div className="absolute bottom-2 right-3 text-xs text-text-muted font-mono">
          {language}
        </div>
      )}
    </div>
  )
}
