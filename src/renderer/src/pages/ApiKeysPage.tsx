import React, { useEffect, useState, useCallback } from 'react'
import { Key, Plus, Trash2, Eye, EyeOff, Save, RefreshCw, Shield, Copy, Check } from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'

const COMMON_KEYS = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', hint: 'sk-ant-...' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', hint: 'sk-...' },
  { key: 'GITHUB_TOKEN', label: 'GitHub Token', hint: 'ghp_...' },
  { key: 'BRAVE_API_KEY', label: 'Brave Search API Key', hint: 'BSA...' },
  { key: 'GOOGLE_MAPS_API_KEY', label: 'Google Maps API Key', hint: 'AIza...' },
  { key: 'SLACK_BOT_TOKEN', label: 'Slack Bot Token', hint: 'xoxb-...' },
  { key: 'SENTRY_AUTH_TOKEN', label: 'Sentry Auth Token', hint: 'sntrys_...' },
  { key: 'SUPABASE_URL', label: 'Supabase URL', hint: 'https://xxx.supabase.co' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', hint: 'eyJ...' },
  { key: 'NOTION_API_KEY', label: 'Notion API Key', hint: 'ntn_...' },
  { key: 'LINEAR_API_KEY', label: 'Linear API Key', hint: 'lin_api_...' },
  { key: 'CLOUDFLARE_API_TOKEN', label: 'Cloudflare API Token', hint: 'v1.0-...' },
  { key: 'TAVILY_API_KEY', label: 'Tavily API Key', hint: 'tvly-...' },
  { key: 'EXA_API_KEY', label: 'Exa API Key', hint: 'exa-...' },
  { key: 'FIRECRAWL_API_KEY', label: 'Firecrawl API Key', hint: 'fc-...' },
  { key: 'REPLICATE_API_TOKEN', label: 'Replicate API Token', hint: 'r8_...' },
  { key: 'HF_TOKEN', label: 'Hugging Face Token', hint: 'hf_...' },
  { key: 'DISCORD_BOT_TOKEN', label: 'Discord Bot Token', hint: 'MTI...' },
  { key: 'TODOIST_API_TOKEN', label: 'Todoist API Token', hint: '' },
  { key: 'STABILITY_API_KEY', label: 'Stability AI Key', hint: 'sk-...' },
]

export function ApiKeysPage() {
  const { addActivity } = useAppStore()
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [showAddKey, setShowAddKey] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const vars = await api.env.read()
      setKeys(vars || {})
    } catch { /* ignore */ }
    setLoading(false)
    setDirty(false)
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  const handleSave = async () => {
    const api = getApi()
    if (!api) return
    setSaving(true)
    const result = await api.env.write(keys)
    setSaving(false)
    if (result.success) {
      setSaveStatus('saved')
      setDirty(false)
      addActivity({ type: 'config', message: 'Updated API keys (.env)', status: 'success' })
      setTimeout(() => setSaveStatus('idle'), 2000)
    } else {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const updateKey = (key: string, value: string) => {
    setKeys(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const deleteKey = (key: string) => {
    setKeys(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setDirty(true)
  }

  const addKey = () => {
    const name = newKeyName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    if (!name) return
    setKeys(prev => ({ ...prev, [name]: newKeyValue }))
    setDirty(true)
    setNewKeyName('')
    setNewKeyValue('')
    setShowAddKey(false)
  }

  const addPreset = (preset: typeof COMMON_KEYS[0]) => {
    if (!keys[preset.key]) {
      setKeys(prev => ({ ...prev, [preset.key]: '' }))
      setDirty(true)
    }
    setShowPresets(false)
  }

  const toggleReveal = (key: string) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(keys[key] || '')
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const maskValue = (value: string) => {
    if (!value) return ''
    if (value.length <= 8) return '*'.repeat(value.length)
    return value.slice(0, 4) + '*'.repeat(Math.min(value.length - 8, 20)) + value.slice(-4)
  }

  const entries = Object.entries(keys).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Key size={20} className="text-accent-orange" />
          <div>
            <h2 className="text-sm font-heading font-semibold">API Keys</h2>
            <p className="text-[11px] text-text-muted">~/.claude/.env</p>
          </div>
          <span className="text-xs text-text-muted ml-2">{entries.length} keys</span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-accent-orange">Unsaved changes</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-accent-green">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-accent-red">Save failed</span>
          )}
          <button onClick={loadKeys} className="btn-ghost text-xs" title="Reload">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowPresets(true)} className="btn-secondary text-sm">
            <Shield size={14} /> Common Keys
          </button>
          <button onClick={() => { setNewKeyName(''); setNewKeyValue(''); setShowAddKey(true) }} className="btn-secondary text-sm">
            <Plus size={14} /> Add Key
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="btn-primary text-sm"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-text-muted py-12">Loading...</div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Key size={24} />}
            title="No API Keys"
            description="API keys are stored in ~/.claude/.env and used by MCP servers, hooks, and other integrations."
            action={
              <div className="flex gap-2">
                <button onClick={() => setShowPresets(true)} className="btn-secondary text-sm">
                  <Shield size={14} /> Browse Common Keys
                </button>
                <button onClick={() => setShowAddKey(true)} className="btn-primary text-sm">
                  <Plus size={14} /> Add Key
                </button>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {entries.map(([key, value]) => {
              const isRevealed = revealed.has(key)
              const preset = COMMON_KEYS.find(p => p.key === key)
              return (
                <div key={key} className="card-hover">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
                        <Key size={16} className="text-accent-orange" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium">{key}</span>
                          {preset && <span className="text-[10px] text-text-muted">{preset.label}</span>}
                        </div>
                        {!value && <span className="text-[11px] text-accent-yellow">Not set</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={value}
                        onChange={e => updateKey(key, e.target.value)}
                        placeholder={preset?.hint || 'Enter value...'}
                        className="input font-mono text-xs flex-1"
                      />
                      <button onClick={() => toggleReveal(key)} className="btn-ghost p-1.5" title={isRevealed ? 'Hide' : 'Reveal'}>
                        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyKey(key)} className="btn-ghost p-1.5" title="Copy">
                        {copied === key ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                      </button>
                      <button onClick={() => deleteKey(key)} className="btn-ghost p-1.5 text-accent-red" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      <Modal
        open={showAddKey}
        onClose={() => setShowAddKey(false)}
        title="Add API Key"
        description="Add a new environment variable"
        size="md"
        footer={
          <>
            <button onClick={() => setShowAddKey(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={addKey} disabled={!newKeyName.trim()} className="btn-primary text-sm">
              <Plus size={14} /> Add
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Key Name</label>
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="MY_API_KEY"
              className="input font-mono"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Value</label>
            <input
              value={newKeyValue}
              onChange={e => setNewKeyValue(e.target.value)}
              placeholder="Enter value..."
              className="input font-mono"
              type="password"
            />
          </div>
        </div>
      </Modal>

      {/* Common Keys Modal */}
      <Modal
        open={showPresets}
        onClose={() => setShowPresets(false)}
        title="Common API Keys"
        description="Quick-add frequently used API keys"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {COMMON_KEYS.map(preset => {
            const exists = preset.key in keys
            return (
              <button
                key={preset.key}
                onClick={() => !exists && addPreset(preset)}
                disabled={exists}
                className={cn('card-hover text-left', exists && 'opacity-50')}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-medium">{preset.key}</span>
                  {exists && <span className="badge-green text-[10px]">Added</span>}
                </div>
                <p className="text-[11px] text-text-secondary">{preset.label}</p>
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
