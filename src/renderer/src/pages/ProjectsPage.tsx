import React, { useState, useCallback, useEffect } from 'react'
import {
  FolderOpen, Plus, Check, X, ArrowRight, Globe,
  FileText, Settings, Zap, Bot, Command, Server, Pencil,
  Brain, BookOpen, Lock, ChevronRight, ChevronDown,
  Folder, File, Play, Loader2, ArrowLeft, Eye, Copy, CheckCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { useEditorStore } from '../stores/editor-store'
import { EmptyState } from '../components/shared/EmptyState'
import type { ProjectScan } from '../types/api'

interface ConfigAction {
  label: string
  projectExists: boolean
  globalExists: boolean
  scope: 'project-only' | 'both'
  navigateTo: string
  globalNavigateTo?: string
  onNavigate?: () => void
  onGlobalNavigate?: () => void
  icon: React.ReactNode
}

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  modified: string
  ext: string
}

const EXECUTABLE_EXTS = ['py', 'js', 'ts', 'sh', 'bash']

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(entry: FileEntry): React.ReactNode {
  if (entry.isDirectory) return <Folder size={14} className="text-accent-blue" />
  const ext = entry.ext?.toLowerCase()
  if (EXECUTABLE_EXTS.includes(ext)) return <File size={14} className="text-accent-green" />
  if (['md', 'txt', 'json', 'yml', 'yaml', 'toml'].includes(ext)) return <FileText size={14} className="text-text-muted" />
  return <File size={14} className="text-text-muted" />
}

export function ProjectsPage() {
  const { currentProjectDir, setCurrentProjectDir, addActivity } = useAppStore()
  const { setClaudeMdTab, setSettingsTab } = useEditorStore()
  const navigate = useNavigate()
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentProjects') || '[]')
    } catch { return [] }
  })
  const [scan, setScan] = useState<ProjectScan | null>(null)
  const [scanning, setScanning] = useState(false)

  // File browser state
  const [activeTab, setActiveTab] = useState<'config' | 'files'>('config')
  const [browserPath, setBrowserPath] = useState<string | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [running, setRunning] = useState(false)
  const [runOutput, setRunOutput] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const openProject = useCallback(async () => {
    const api = getApi()
    if (!api) return

    const dir = await api.fs.pickDirectory()
    if (!dir) return

    setCurrentProjectDir(dir)
    setScanning(true)

    const result = await api.fs.scanProject(dir)
    setScan(result)
    setScanning(false)

    const updated = [dir, ...recentProjects.filter(p => p !== dir)].slice(0, 10)
    setRecentProjects(updated)
    localStorage.setItem('recentProjects', JSON.stringify(updated))

    addActivity({ type: 'session', message: `Opened project: ${dir}`, status: 'success' })
  }, [setCurrentProjectDir, addActivity, recentProjects])

  const selectRecent = useCallback(async (dir: string) => {
    const api = getApi()
    if (!api) return

    setCurrentProjectDir(dir)
    setScanning(true)
    const result = await api.fs.scanProject(dir)
    setScan(result)
    setScanning(false)
  }, [setCurrentProjectDir])

  // Load directory contents for file browser
  const loadDirectory = useCallback(async (dirPath: string) => {
    const api = getApi()
    if (!api) return

    setLoadingFiles(true)
    setSelectedFile(null)
    setFileContent(null)
    setRunOutput(null)

    try {
      const result = await api.fs.listDir(dirPath)
      if (Array.isArray(result)) {
        // Sort: directories first, then files, alphabetically
        const sorted = result.sort((a: FileEntry, b: FileEntry) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
        setFiles(sorted)
      } else {
        setFiles([])
      }
      setBrowserPath(dirPath)
    } catch {
      setFiles([])
    }
    setLoadingFiles(false)
  }, [])

  // Initialize file browser when project is opened
  useEffect(() => {
    if (currentProjectDir && activeTab === 'files' && !browserPath) {
      loadDirectory(currentProjectDir)
    }
  }, [currentProjectDir, activeTab, browserPath, loadDirectory])

  // View a file
  const viewFile = useCallback(async (entry: FileEntry) => {
    const api = getApi()
    if (!api) return

    setSelectedFile(entry)
    setRunOutput(null)
    setLoadingContent(true)

    try {
      const result = await api.fs.read(entry.path)
      setFileContent(result.content || '')
    } catch {
      setFileContent('[Unable to read file]')
    }
    setLoadingContent(false)
  }, [])

  // Execute a script
  const runScript = useCallback(async () => {
    const api = getApi()
    if (!api || !selectedFile) return

    setRunning(true)
    setRunOutput(null)

    try {
      const result = await api.cli.runScript(selectedFile.path, browserPath || undefined)
      setRunOutput(
        (result.success ? '[Exit code: 0]\n' : `[Exit code: ${result.exitCode ?? 'unknown'}]\n`) +
        (result.output || '(no output)')
      )
      addActivity({
        type: 'session',
        message: `Ran ${selectedFile.name}: ${result.success ? 'success' : 'failed'}`,
        status: result.success ? 'success' : 'error'
      })
    } catch (e: any) {
      setRunOutput(`[Error] ${e.message}`)
    }
    setRunning(false)
  }, [selectedFile, browserPath, addActivity])

  // Navigate up one directory
  const goUp = useCallback(() => {
    if (!browserPath || browserPath === currentProjectDir) return
    const parent = browserPath.split('/').slice(0, -1).join('/')
    if (parent) loadDirectory(parent)
  }, [browserPath, currentProjectDir, loadDirectory])

  // Copy file content to clipboard
  const copyContent = useCallback(() => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [fileContent])

  const goTo = (path: string, setup?: () => void) => {
    if (setup) setup()
    navigate(path)
  }

  const configItems: ConfigAction[] = scan ? [
    {
      label: 'CLAUDE.md (project root)',
      projectExists: scan.claudeMd,
      globalExists: scan.globalClaudeMd,
      scope: 'both',
      navigateTo: '/claude-md',
      globalNavigateTo: '/claude-md',
      onNavigate: () => setClaudeMdTab('project'),
      onGlobalNavigate: () => setClaudeMdTab('global'),
      icon: <FileText size={14} />,
    },
    {
      label: '.claude/CLAUDE.md (local)',
      projectExists: scan.dotClaudeMd,
      globalExists: scan.globalClaudeMd,
      scope: 'both',
      navigateTo: '/claude-md',
      globalNavigateTo: '/claude-md',
      onNavigate: () => setClaudeMdTab('local'),
      onGlobalNavigate: () => setClaudeMdTab('global'),
      icon: <FileText size={14} />,
    },
    {
      label: 'CLAUDE.local.md (private)',
      projectExists: scan.claudeLocalMd,
      globalExists: false,
      scope: 'project-only',
      navigateTo: '/claude-md',
      onNavigate: () => setClaudeMdTab('private'),
      icon: <Lock size={14} />,
    },
    {
      label: '.claude/rules/',
      projectExists: scan.rules,
      globalExists: scan.globalRules,
      scope: 'both',
      navigateTo: '/rules',
      globalNavigateTo: '/rules',
      icon: <BookOpen size={14} />,
    },
    {
      label: 'Auto Memory',
      projectExists: scan.autoMemory,
      globalExists: scan.globalAutoMemory,
      scope: 'both',
      navigateTo: '/memory',
      globalNavigateTo: '/memory',
      icon: <Brain size={14} />,
    },
    {
      label: '.claude/settings.json',
      projectExists: scan.settings,
      globalExists: scan.globalSettings,
      scope: 'both',
      navigateTo: '/settings',
      globalNavigateTo: '/settings',
      onNavigate: () => setSettingsTab('project'),
      onGlobalNavigate: () => setSettingsTab('user'),
      icon: <Settings size={14} />,
    },
    {
      label: '.claude/settings.local.json',
      projectExists: scan.localSettings,
      globalExists: scan.globalSettings,
      scope: 'both',
      navigateTo: '/settings',
      globalNavigateTo: '/settings',
      onNavigate: () => setSettingsTab('local'),
      onGlobalNavigate: () => setSettingsTab('user'),
      icon: <Settings size={14} />,
    },
    {
      label: '.claude/skills/',
      projectExists: scan.skills,
      globalExists: scan.globalSkills,
      scope: 'both',
      navigateTo: '/skills',
      globalNavigateTo: '/skills',
      icon: <Zap size={14} />,
    },
    {
      label: '.claude/agents/',
      projectExists: scan.agents,
      globalExists: scan.globalAgents,
      scope: 'both',
      navigateTo: '/agents',
      globalNavigateTo: '/agents',
      icon: <Bot size={14} />,
    },
    {
      label: '.claude/commands/',
      projectExists: scan.commands,
      globalExists: scan.globalCommands,
      scope: 'both',
      navigateTo: '/commands',
      globalNavigateTo: '/commands',
      icon: <Command size={14} />,
    },
    {
      label: '.mcp.json',
      projectExists: scan.mcpJson,
      globalExists: scan.globalMcp,
      scope: 'both',
      navigateTo: '/mcp',
      globalNavigateTo: '/mcp',
      icon: <Server size={14} />,
    },
  ] : []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="text-xs text-text-muted">
            {currentProjectDir ? `Current: ${currentProjectDir}` : 'No project selected'}
          </div>
          {currentProjectDir && (
            <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('config')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  activeTab === 'config'
                    ? 'bg-bg-secondary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                Configuration
              </button>
              <button
                onClick={() => { setActiveTab('files'); if (!browserPath && currentProjectDir) loadDirectory(currentProjectDir) }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  activeTab === 'files'
                    ? 'bg-bg-secondary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                File Browser
              </button>
            </div>
          )}
        </div>
        <button onClick={openProject} className="btn-primary text-sm">
          <FolderOpen size={16} /> Open Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ==================== CONFIG TAB ==================== */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scan && (
              <div>
                <h3 className="section-title">Project Configuration</h3>
                <div className="card space-y-0.5">
                  <div className="text-sm font-mono font-medium mb-3">{scan.projectDir}</div>
                  {configItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-text-muted flex-shrink-0">{item.icon}</span>
                        <span className="text-xs text-text-secondary truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.projectExists ? (
                          <span className="badge-green text-[10px]"><Check size={10} /> Project</span>
                        ) : item.globalExists ? (
                          <span className="badge text-[10px] bg-accent-blue/10 text-accent-blue">
                            <Globe size={10} /> Global
                          </span>
                        ) : (
                          <span className="badge bg-bg-tertiary text-text-muted text-[10px]"><X size={10} /> Missing</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => goTo(item.navigateTo, item.onNavigate)}
                            className="btn-ghost text-[10px] px-2 py-1"
                            title={item.projectExists ? `Edit ${item.label}` : `Create project-level ${item.label}`}
                          >
                            {item.projectExists ? (
                              <><Pencil size={10} /> Edit</>
                            ) : (
                              <><Plus size={10} /> Create</>
                            )}
                          </button>
                          {item.globalExists && item.globalNavigateTo && (
                            <button
                              onClick={() => goTo(item.globalNavigateTo!, item.onGlobalNavigate)}
                              className="btn-ghost text-[10px] px-2 py-1 text-accent-blue"
                              title={`Edit global ${item.label}`}
                            >
                              <Globe size={10} /> Global
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="section-title">Recent Projects</h3>
              {recentProjects.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen size={24} />}
                  title="No Recent Projects"
                  description="Open a project directory to get started."
                />
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((dir) => (
                    <button
                      key={dir}
                      onClick={() => selectRecent(dir)}
                      className={cn(
                        'w-full card-hover text-left flex items-center justify-between',
                        dir === currentProjectDir && 'border-accent-orange/30'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen size={14} className="text-text-muted" />
                        <span className="text-xs font-mono truncate">{dir}</span>
                      </div>
                      <ArrowRight size={14} className="text-text-muted" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== FILE BROWSER TAB ==================== */}
        {activeTab === 'files' && currentProjectDir && (
          <div className="flex gap-4 h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* File list panel */}
            <div className="w-80 flex-shrink-0 flex flex-col">
              {/* Breadcrumb / path bar */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={goUp}
                  disabled={!browserPath || browserPath === currentProjectDir}
                  className="btn-ghost text-xs px-2 py-1 disabled:opacity-30"
                  title="Go up one level"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="text-xs font-mono text-text-muted truncate flex-1" title={browserPath || ''}>
                  {browserPath ? browserPath.replace(currentProjectDir, '.') || '.' : '.'}
                </div>
                <button
                  onClick={() => loadDirectory(currentProjectDir)}
                  className="btn-ghost text-xs px-2 py-1"
                  title="Go to project root"
                >
                  <FolderOpen size={14} />
                </button>
              </div>

              {/* File list */}
              <div className="card flex-1 overflow-y-auto p-0">
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={16} className="animate-spin text-text-muted" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-xs text-text-muted text-center py-8">Empty directory</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {files.map((entry) => (
                      <button
                        key={entry.path}
                        onClick={() => {
                          if (entry.isDirectory) {
                            loadDirectory(entry.path)
                          } else {
                            viewFile(entry)
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-tertiary transition-colors',
                          selectedFile?.path === entry.path && 'bg-bg-tertiary'
                        )}
                      >
                        {getFileIcon(entry)}
                        <span className="text-xs truncate flex-1">{entry.name}</span>
                        {entry.isFile && (
                          <span className="text-[10px] text-text-muted flex-shrink-0">
                            {formatFileSize(entry.size)}
                          </span>
                        )}
                        {entry.isDirectory && (
                          <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* File viewer panel */}
            <div className="flex-1 flex flex-col min-w-0">
              {selectedFile ? (
                <>
                  {/* File header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(selectedFile)}
                      <span className="text-sm font-mono font-medium truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-text-muted">{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={copyContent}
                        className="btn-ghost text-xs px-2 py-1 gap-1"
                        title="Copy file contents"
                      >
                        {copied ? <CheckCheck size={12} className="text-accent-green" /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      {EXECUTABLE_EXTS.includes(selectedFile.ext?.toLowerCase()) && (
                        <button
                          onClick={runScript}
                          disabled={running}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            'bg-accent-green/10 text-accent-green border border-accent-green/20',
                            'hover:bg-accent-green/20 hover:border-accent-green/30',
                            'disabled:opacity-40 disabled:cursor-not-allowed'
                          )}
                        >
                          {running ? (
                            <><Loader2 size={13} className="animate-spin" /> Running...</>
                          ) : (
                            <><Play size={13} /> Run Script</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File content */}
                  <div className="card flex-1 overflow-auto p-0 font-mono text-xs">
                    {loadingContent ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={16} className="animate-spin text-text-muted" />
                      </div>
                    ) : (
                      <pre className="p-4 whitespace-pre-wrap break-words leading-relaxed text-text-secondary">
                        {fileContent}
                      </pre>
                    )}
                  </div>

                  {/* Script output */}
                  {runOutput !== null && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-text-secondary mb-1">Output</div>
                      <div className="card p-0 max-h-48 overflow-auto">
                        <pre className="p-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text-secondary">
                          {runOutput}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={<Eye size={24} />}
                    title="Select a File"
                    description="Click a file in the list to view its contents. Executable scripts (.py, .js, .ts, .sh) can be run directly."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* No project selected */}
        {activeTab === 'files' && !currentProjectDir && (
          <EmptyState
            icon={<FolderOpen size={24} />}
            title="No Project Selected"
            description="Open a project directory to browse its files."
          />
        )}
      </div>
    </div>
  )
}
