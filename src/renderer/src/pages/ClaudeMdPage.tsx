import React, { useEffect, useState, useCallback } from 'react'
import { Save, Eye, EyeOff, FileText, RotateCcw, Wand2, Link, Lock, AlertTriangle } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { useEditorStore } from '../stores/editor-store'
import { CodeEditor } from '../components/shared/CodeEditor'
import ReactMarkdown from 'react-markdown'

const TABS = [
  { id: 'global', label: 'Global', desc: '~/.claude/CLAUDE.md', icon: null },
  { id: 'project', label: 'Project Root', desc: './CLAUDE.md', icon: null },
  { id: 'local', label: 'Local', desc: '.claude/CLAUDE.md', icon: null },
  { id: 'private', label: 'Private', desc: './CLAUDE.local.md', icon: <Lock size={12} /> },
] as const

const TEMPLATES = [
  {
    name: 'React + TypeScript',
    content: `# Project Context

## Tech Stack
- React 18 with TypeScript
- Vite for bundling
- Tailwind CSS for styling
- React Router for navigation

## Coding Conventions
- Use functional components with hooks
- Prefer TypeScript strict mode
- Use named exports
- Follow ESLint recommended rules

## File Structure
- Components in src/components/
- Pages in src/pages/
- Hooks in src/hooks/
- Types in src/types/

## Commands
- \`npm run dev\` - Start dev server
- \`npm run build\` - Production build
- \`npm test\` - Run tests
`
  },
  {
    name: 'Python + FastAPI',
    content: `# Project Context

## Tech Stack
- Python 3.11+
- FastAPI for API
- SQLAlchemy for ORM
- Pydantic for validation

## Coding Conventions
- Type hints required on all functions
- Black formatter (line length 100)
- isort for import ordering
- Follow PEP 8

## File Structure
- API routes in app/routes/
- Models in app/models/
- Schemas in app/schemas/
- Services in app/services/

## Commands
- \`uvicorn app.main:app --reload\` - Start dev server
- \`pytest\` - Run tests
- \`alembic upgrade head\` - Run migrations
`
  },
  {
    name: 'Node.js + Express',
    content: `# Project Context

## Tech Stack
- Node.js with Express
- TypeScript
- Prisma ORM
- Jest for testing

## Coding Conventions
- ESM modules
- Async/await over callbacks
- Error middleware for handling
- Zod for validation

## Commands
- \`npm run dev\` - Start with nodemon
- \`npm run build\` - Compile TypeScript
- \`npm test\` - Run test suite
`
  },
  {
    name: 'Blank Template',
    content: `# Project Context

## Tech Stack
-

## Coding Conventions
-

## Important Notes
-

## Commands
-
`
  },
]

export function ClaudeMdPage() {
  const { claudePaths, currentProjectDir, addActivity } = useAppStore()
  const { claudeMdTab, setClaudeMdTab, claudeMdContent, setClaudeMdContent, claudeMdDirty, setClaudeMdDirty } = useEditorStore()
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imports, setImports] = useState<string[]>([])

  const getFilePath = useCallback((tab: string): string | null => {
    if (!claudePaths) return null
    switch (tab) {
      case 'global': return claudePaths.globalClaudeMd
      case 'project': return currentProjectDir ? `${currentProjectDir}/CLAUDE.md` : null
      case 'local': return currentProjectDir ? `${currentProjectDir}/.claude/CLAUDE.md` : null
      case 'private': return currentProjectDir ? `${currentProjectDir}/CLAUDE.local.md` : null
      default: return null
    }
  }, [claudePaths, currentProjectDir])

  // Extract @imports from content
  const extractImports = useCallback((content: string): string[] => {
    const importRegex = /(?:^|\s)@([\w./-~]+)/gm
    const found: string[] = []
    let match
    while ((match = importRegex.exec(content)) !== null) {
      // Skip if inside a code block or code span
      const before = content.slice(0, match.index)
      const backtickCount = (before.match(/`/g) || []).length
      if (backtickCount % 2 === 0) {
        found.push(match[1])
      }
    }
    return [...new Set(found)]
  }, [])

  const loadContent = useCallback(async (tab: string) => {
    const api = getApi()
    const path = getFilePath(tab)
    if (!api || !path) return

    const result = await api.fs.read(path)
    const content = result.content || ''
    setClaudeMdContent(tab, content)
    setClaudeMdDirty(tab, false)
    setImports(extractImports(content))
  }, [getFilePath, setClaudeMdContent, setClaudeMdDirty, extractImports])

  useEffect(() => {
    loadContent(claudeMdTab)
  }, [claudeMdTab, loadContent])

  // Update imports when content changes
  const currentContent = claudeMdContent[claudeMdTab] || ''
  useEffect(() => {
    setImports(extractImports(currentContent))
  }, [currentContent, extractImports])

  const handleSave = useCallback(async () => {
    const api = getApi()
    const path = getFilePath(claudeMdTab)
    const content = claudeMdContent[claudeMdTab] || ''
    if (!api || !path) return

    setSaving(true)
    try {
      await api.fs.write(path, content)
      setClaudeMdDirty(claudeMdTab, false)
      addActivity({
        type: 'config',
        message: `Saved ${claudeMdTab} CLAUDE.md`,
        status: 'success'
      })
    } catch (e) {
      addActivity({
        type: 'config',
        message: `Failed to save CLAUDE.md`,
        status: 'error'
      })
    }
    setSaving(false)
  }, [claudeMdTab, claudeMdContent, getFilePath, setClaudeMdDirty, addActivity])

  const applyTemplate = (content: string) => {
    setClaudeMdContent(claudeMdTab, content)
    setClaudeMdDirty(claudeMdTab, true)
    setShowTemplates(false)
  }

  const isDirty = claudeMdDirty[claudeMdTab] || false
  const currentPath = getFilePath(claudeMdTab)

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setClaudeMdTab(tab.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5',
                claudeMdTab === tab.id
                  ? 'bg-accent-orange/10 text-accent-orange font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              )}
              title={tab.desc}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn-ghost text-xs">
            <Wand2 size={14} />
            Templates
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost text-xs">
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Editor' : 'Preview'}
          </button>
          <button onClick={() => loadContent(claudeMdTab)} className="btn-ghost text-xs">
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving || !currentPath}
            className="btn-primary text-xs"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* File path + imports indicator */}
      <div className="px-4 py-2 text-xs text-text-muted flex items-center gap-2 border-b border-border">
        <FileText size={12} />
        <span className="font-mono">{currentPath || 'No project selected'}</span>
        {isDirty && <span className="text-accent-orange font-medium">(unsaved)</span>}
        {claudeMdTab === 'private' && (
          <span className="ml-2 badge text-[10px] bg-accent-blue/10 text-accent-blue">
            <Lock size={10} /> Auto-gitignored
          </span>
        )}
        {imports.length > 0 && (
          <span className="ml-auto badge text-[10px] bg-accent-purple/10 text-accent-purple">
            <Link size={10} /> {imports.length} import{imports.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* @Imports panel */}
      {imports.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-bg-secondary/50">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Detected @imports</div>
          <div className="flex flex-wrap gap-1.5">
            {imports.map((imp) => (
              <span key={imp} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-tertiary text-xs font-mono text-text-secondary">
                <Link size={10} className="text-accent-purple" />
                @{imp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Templates dropdown */}
      {showTemplates && (
        <div className="px-4 py-3 border-b border-border bg-bg-secondary">
          <div className="text-xs font-medium text-text-secondary mb-2">Choose a template:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => applyTemplate(t.content)}
                className="card-hover text-left text-xs p-3"
              >
                <div className="font-medium text-text-primary">{t.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No project warning */}
      {claudeMdTab !== 'global' && !currentPath && (
        <div className="px-4 py-3 border-b border-border bg-accent-yellow/10 text-accent-yellow text-xs flex items-center gap-2">
          <AlertTriangle size={14} />
          No project directory selected. Go to <strong>Projects</strong> to open one, or it will auto-detect on next restart.
        </div>
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-y-auto p-6 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{currentContent}</ReactMarkdown>
          </div>
        ) : (
          <div className="h-full">
            <CodeEditor
              value={currentContent}
              onChange={(val) => {
                setClaudeMdContent(claudeMdTab, val)
                setClaudeMdDirty(claudeMdTab, true)
              }}
              language="markdown"
              placeholder={claudeMdTab === 'private'
                ? "Write private project preferences here (auto-gitignored)..."
                : "Write your CLAUDE.md content here..."}
              minHeight="100%"
              maxHeight="100%"
            />
          </div>
        )}
      </div>
    </div>
  )
}
