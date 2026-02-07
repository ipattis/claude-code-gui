import React, { useState, useCallback } from 'react'
import {
  FolderOpen, Plus, Check, X, ArrowRight, Globe,
  FileText, Settings, Zap, Bot, Command, Server, Pencil,
  Brain, BookOpen, Lock
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
        <div className="text-xs text-text-muted">
          {currentProjectDir ? `Current: ${currentProjectDir}` : 'No project selected'}
        </div>
        <button onClick={openProject} className="btn-primary text-sm">
          <FolderOpen size={16} /> Open Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Project */}
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
                      {/* Status badges */}
                      {item.projectExists ? (
                        <span className="badge-green text-[10px]"><Check size={10} /> Project</span>
                      ) : item.globalExists ? (
                        <span className="badge text-[10px] bg-accent-blue/10 text-accent-blue">
                          <Globe size={10} /> Global
                        </span>
                      ) : (
                        <span className="badge bg-bg-tertiary text-text-muted text-[10px]"><X size={10} /> Missing</span>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit/Create project-level */}
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
                        {/* Edit global */}
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

          {/* Recent Projects */}
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
      </div>
    </div>
  )
}
