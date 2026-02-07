import React, { useEffect, useState, useCallback } from 'react'
import { Shield, Plus, Trash2, Save, AlertTriangle, Check, X, Lock, Unlock } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'

const TOOL_CATEGORIES = [
  { category: 'File Operations', tools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'NotebookEdit'] },
  { category: 'Execution', tools: ['Bash', 'Task'] },
  { category: 'Web', tools: ['WebFetch', 'WebSearch'] },
  { category: 'MCP', tools: ['mcp__*'] },
]

export function PermissionsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [settings, setSettings] = useState<any>({})
  const [dirty, setDirty] = useState(false)
  const [newPattern, setNewPattern] = useState('')
  const [patternType, setPatternType] = useState<'allow' | 'deny'>('allow')

  const loadSettings = useCallback(async () => {
    const api = getApi()
    if (!api) return
    const result = await api.config.getSettings('user', currentProjectDir)
    setSettings(result?.data || {})
  }, [currentProjectDir])

  useEffect(() => { loadSettings() }, [loadSettings])

  const allowed = settings.allowedTools || []
  const denied = settings.deny || []

  const handleSave = async () => {
    const api = getApi()
    if (!api) return
    const result = await api.config.saveSettings('user', settings, currentProjectDir)
    if (result.success) {
      setDirty(false)
      addActivity({ type: 'config', message: 'Saved permissions', status: 'success' })
    }
  }

  const addPattern = () => {
    if (!newPattern.trim()) return
    const key = patternType === 'allow' ? 'allowedTools' : 'deny'
    const arr = [...(settings[key] || []), newPattern.trim()]
    setSettings({ ...settings, [key]: arr })
    setNewPattern('')
    setDirty(true)
  }

  const removePattern = (type: 'allow' | 'deny', index: number) => {
    const key = type === 'allow' ? 'allowedTools' : 'deny'
    const arr = [...(settings[key] || [])]
    arr.splice(index, 1)
    setSettings({ ...settings, [key]: arr })
    setDirty(true)
  }

  const toggleTool = (tool: string) => {
    if (allowed.includes(tool)) {
      removePattern('allow', allowed.indexOf(tool))
    } else {
      setSettings({ ...settings, allowedTools: [...allowed, tool] })
      setDirty(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <Shield size={18} className="text-accent-orange" />
          Permission Rules
        </h2>
        <button onClick={handleSave} disabled={!dirty} className="btn-primary text-sm">
          <Save size={14} /> Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Quick toggle grid */}
        <div>
          <h3 className="section-title">Tool Auto-Approve</h3>
          <p className="text-xs text-text-secondary mb-4">Toggle tools to auto-approve (skip permission prompts)</p>
          {TOOL_CATEGORIES.map((cat) => (
            <div key={cat.category} className="mb-4">
              <div className="text-xs font-medium text-text-muted mb-2">{cat.category}</div>
              <div className="flex flex-wrap gap-2">
                {cat.tools.map((tool) => {
                  const isAllowed = allowed.includes(tool)
                  const isDenied = denied.includes(tool)
                  return (
                    <button
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                        isAllowed && 'bg-accent-green/10 border-accent-green/30 text-accent-green',
                        isDenied && 'bg-accent-red/10 border-accent-red/30 text-accent-red',
                        !isAllowed && !isDenied && 'bg-bg-tertiary border-border text-text-muted hover:border-text-muted'
                      )}
                    >
                      {isAllowed && <Check size={10} className="inline mr-1" />}
                      {isDenied && <X size={10} className="inline mr-1" />}
                      {tool}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Custom patterns */}
        <div>
          <h3 className="section-title">Custom Permission Patterns</h3>
          <div className="flex gap-2 mb-4">
            <select value={patternType} onChange={(e) => setPatternType(e.target.value as any)} className="input w-32">
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </select>
            <input value={newPattern} onChange={(e) => setNewPattern(e.target.value)} placeholder='e.g., Bash(git *), Write(*.py), mcp__github__*' className="input flex-1 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && addPattern()}
            />
            <button onClick={addPattern} disabled={!newPattern.trim()} className="btn-primary text-sm">
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Unlock size={14} className="text-accent-green" />
                <span className="text-sm font-medium text-accent-green">Allowed ({allowed.length})</span>
              </div>
              <div className="space-y-1">
                {allowed.map((p: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-accent-green/5 border border-accent-green/10">
                    <span className="text-xs font-mono">{p}</span>
                    <button onClick={() => removePattern('allow', i)} className="text-text-muted hover:text-accent-red"><X size={12} /></button>
                  </div>
                ))}
                {allowed.length === 0 && <p className="text-xs text-text-muted italic">No allowed patterns</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lock size={14} className="text-accent-red" />
                <span className="text-sm font-medium text-accent-red">Denied ({denied.length})</span>
              </div>
              <div className="space-y-1">
                {denied.map((p: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-accent-red/5 border border-accent-red/10">
                    <span className="text-xs font-mono">{p}</span>
                    <button onClick={() => removePattern('deny', i)} className="text-text-muted hover:text-accent-red"><X size={12} /></button>
                  </div>
                ))}
                {denied.length === 0 && <p className="text-xs text-text-muted italic">No denied patterns</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card border-accent-red/30 bg-accent-red/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-accent-red" />
            <h3 className="text-sm font-heading font-semibold text-accent-red">Danger Zone</h3>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Bypassing all permissions allows Claude to execute any tool without asking. This is dangerous and should only be used in trusted environments.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-accent-red font-medium">Bypass All Permissions</span>
            <button
              onClick={() => { setSettings({ ...settings, bypassPermissions: !settings.bypassPermissions }); setDirty(true) }}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                settings.bypassPermissions ? 'bg-accent-red' : 'bg-bg-tertiary border border-border'
              )}
            >
              <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', settings.bypassPermissions ? 'left-5' : 'left-1')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
