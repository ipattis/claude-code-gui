import React, { useEffect, useState, useCallback } from 'react'
import {
  Plug, Package, Star, Code, Globe, MessageSquare, Zap,
  GitBranch, Check, Copy, Terminal, RefreshCw, Plus,
  Trash2, ExternalLink, ChevronDown, ChevronRight,
  Shield, Search, Eye, EyeOff, Store, BookOpen, AlertTriangle,
  Cpu, Server
} from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { SearchInput } from '../components/shared/SearchInput'
import { Modal } from '../components/shared/Modal'

// ── Plugin Catalog (Official Marketplace) ──────────────────

type PluginCategory = 'all' | 'lsp' | 'integrations' | 'workflows' | 'styles'

interface CatalogPlugin {
  name: string
  marketplace: string
  label: string
  desc: string
  category: PluginCategory
  components: string[]  // What the plugin bundles
  requires?: string     // Binary or service requirement
}

const CATEGORIES: { id: PluginCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Plugins', icon: <Package size={14} /> },
  { id: 'lsp', label: 'Code Intelligence', icon: <Cpu size={14} /> },
  { id: 'integrations', label: 'Integrations', icon: <Globe size={14} /> },
  { id: 'workflows', label: 'Workflows', icon: <Zap size={14} /> },
  { id: 'styles', label: 'Output Styles', icon: <Eye size={14} /> },
]

const PLUGIN_CATALOG: CatalogPlugin[] = [
  // Code Intelligence (LSP)
  { name: 'pyright-lsp', marketplace: 'claude-plugins-official', label: 'Python (Pyright)', desc: 'Real-time Python code analysis, type checking, and navigation', category: 'lsp', components: ['LSP Server'], requires: 'pyright-langserver' },
  { name: 'typescript-lsp', marketplace: 'claude-plugins-official', label: 'TypeScript', desc: 'TypeScript/JavaScript code intelligence and navigation', category: 'lsp', components: ['LSP Server'], requires: 'typescript-language-server' },
  { name: 'rust-analyzer-lsp', marketplace: 'claude-plugins-official', label: 'Rust', desc: 'Rust code analysis, completion, and refactoring', category: 'lsp', components: ['LSP Server'], requires: 'rust-analyzer' },
  { name: 'gopls-lsp', marketplace: 'claude-plugins-official', label: 'Go', desc: 'Go code intelligence powered by gopls', category: 'lsp', components: ['LSP Server'], requires: 'gopls' },
  { name: 'jdtls-lsp', marketplace: 'claude-plugins-official', label: 'Java', desc: 'Java code intelligence via Eclipse JDT Language Server', category: 'lsp', components: ['LSP Server'], requires: 'jdtls' },
  { name: 'clangd-lsp', marketplace: 'claude-plugins-official', label: 'C/C++', desc: 'C and C++ code intelligence via clangd', category: 'lsp', components: ['LSP Server'], requires: 'clangd' },
  { name: 'csharp-lsp', marketplace: 'claude-plugins-official', label: 'C#', desc: 'C# code intelligence and analysis', category: 'lsp', components: ['LSP Server'], requires: 'csharp-ls' },
  { name: 'php-lsp', marketplace: 'claude-plugins-official', label: 'PHP', desc: 'PHP code intelligence via Intelephense', category: 'lsp', components: ['LSP Server'], requires: 'intelephense' },
  { name: 'swift-lsp', marketplace: 'claude-plugins-official', label: 'Swift', desc: 'Swift code intelligence via SourceKit-LSP', category: 'lsp', components: ['LSP Server'], requires: 'sourcekit-lsp' },
  { name: 'kotlin-lsp', marketplace: 'claude-plugins-official', label: 'Kotlin', desc: 'Kotlin code intelligence and navigation', category: 'lsp', components: ['LSP Server'], requires: 'kotlin-language-server' },
  { name: 'lua-lsp', marketplace: 'claude-plugins-official', label: 'Lua', desc: 'Lua code intelligence and analysis', category: 'lsp', components: ['LSP Server'], requires: 'lua-language-server' },

  // External Integrations
  { name: 'github', marketplace: 'claude-plugins-official', label: 'GitHub', desc: 'Pull requests, issues, repos, code search, and CI/CD', category: 'integrations', components: ['MCP Server', 'Commands'] },
  { name: 'gitlab', marketplace: 'claude-plugins-official', label: 'GitLab', desc: 'Merge requests, issues, and CI pipelines', category: 'integrations', components: ['MCP Server'] },
  { name: 'atlassian', marketplace: 'claude-plugins-official', label: 'Atlassian', desc: 'Jira issues, Confluence docs, and project management', category: 'integrations', components: ['MCP Server'] },
  { name: 'asana', marketplace: 'claude-plugins-official', label: 'Asana', desc: 'Task and project management', category: 'integrations', components: ['MCP Server'] },
  { name: 'linear', marketplace: 'claude-plugins-official', label: 'Linear', desc: 'Issues, projects, and team workflows', category: 'integrations', components: ['MCP Server'] },
  { name: 'notion', marketplace: 'claude-plugins-official', label: 'Notion', desc: 'Pages, databases, and workspace management', category: 'integrations', components: ['MCP Server'] },
  { name: 'figma', marketplace: 'claude-plugins-official', label: 'Figma', desc: 'Design files, components, and prototypes', category: 'integrations', components: ['MCP Server'] },
  { name: 'vercel', marketplace: 'claude-plugins-official', label: 'Vercel', desc: 'Deployments, domains, and serverless functions', category: 'integrations', components: ['MCP Server'] },
  { name: 'firebase', marketplace: 'claude-plugins-official', label: 'Firebase', desc: 'Auth, Firestore, hosting, and cloud functions', category: 'integrations', components: ['MCP Server'] },
  { name: 'supabase', marketplace: 'claude-plugins-official', label: 'Supabase', desc: 'Postgres, auth, storage, and edge functions', category: 'integrations', components: ['MCP Server'] },
  { name: 'slack', marketplace: 'claude-plugins-official', label: 'Slack', desc: 'Messages, channels, and workspace management', category: 'integrations', components: ['MCP Server'] },
  { name: 'sentry', marketplace: 'claude-plugins-official', label: 'Sentry', desc: 'Error tracking, issue management, and performance', category: 'integrations', components: ['MCP Server'] },

  // Development Workflows
  { name: 'commit-commands', marketplace: 'claude-plugins-official', label: 'Commit Commands', desc: 'Git commit workflows — commit, push, PR creation', category: 'workflows', components: ['Commands', 'Hooks'] },
  { name: 'pr-review-toolkit', marketplace: 'claude-plugins-official', label: 'PR Review Toolkit', desc: 'Comprehensive PR review with 6 specialized agents', category: 'workflows', components: ['Agents', 'Commands', 'Skills'] },
  { name: 'code-review', marketplace: 'claude-plugins-official', label: 'Code Review', desc: 'Automated PR review with 5 parallel agents', category: 'workflows', components: ['Agents', 'Commands'] },
  { name: 'agent-sdk-dev', marketplace: 'claude-plugins-official', label: 'Agent SDK Dev', desc: 'Agent SDK development toolkit', category: 'workflows', components: ['Skills', 'Commands'] },
  { name: 'plugin-dev', marketplace: 'claude-plugins-official', label: 'Plugin Dev', desc: 'Plugin development toolkit with 8-phase guided workflow', category: 'workflows', components: ['Skills', 'Commands', 'Agents'] },
  { name: 'feature-dev', marketplace: 'claude-plugins-official', label: 'Feature Dev', desc: '7-phase feature development workflow', category: 'workflows', components: ['Skills', 'Commands'] },

  // Output Styles
  { name: 'explanatory-output-style', marketplace: 'claude-plugins-official', label: 'Explanatory Style', desc: 'Responses include educational insights and explanations', category: 'styles', components: ['Skills'] },
  { name: 'learning-output-style', marketplace: 'claude-plugins-official', label: 'Learning Style', desc: 'Interactive learning mode with guided exploration', category: 'styles', components: ['Skills'] },
]

// ── Component badges ──

const COMPONENT_COLORS: Record<string, string> = {
  'Commands': 'bg-accent-blue/10 text-accent-blue',
  'Agents': 'bg-accent-purple/10 text-accent-purple',
  'Skills': 'bg-accent-green/10 text-accent-green',
  'Hooks': 'bg-accent-orange/10 text-accent-orange',
  'MCP Server': 'bg-accent-cyan/10 text-accent-cyan',
  'LSP Server': 'bg-accent-yellow/10 text-accent-yellow',
}

// ── Known Marketplaces ──

interface KnownMarketplace {
  name: string
  label: string
  desc: string
  source: string
  isDefault?: boolean
}

const KNOWN_MARKETPLACES: KnownMarketplace[] = [
  { name: 'claude-plugins-official', label: 'Official (Anthropic)', desc: 'Official plugin registry maintained by Anthropic', source: 'anthropics/claude-plugins-official', isDefault: true },
  { name: 'anthropics-claude-code', label: 'Claude Code Demo', desc: 'Demo plugins and examples from Anthropic', source: 'anthropics/claude-code' },
]

// ── Main Component ──────────────────────────────────────────

export function PluginsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [activeTab, setActiveTab] = useState<'discover' | 'installed' | 'marketplaces' | 'guide'>('discover')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<PluginCategory>('all')
  const [enabledPlugins, setEnabledPlugins] = useState<Record<string, boolean>>({})
  const [marketplaces, setMarketplaces] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [settingsScope, setSettingsScope] = useState<'user' | 'project'>('user')

  // Add marketplace modal
  const [showAddMarketplace, setShowAddMarketplace] = useState(false)
  const [newMpName, setNewMpName] = useState('')
  const [newMpSource, setNewMpSource] = useState('')
  const [newMpType, setNewMpType] = useState<'github' | 'url' | 'local'>('github')

  const loadSettings = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const result = await api.config.getSettings(settingsScope, currentProjectDir)
      const data = result?.data || {}
      setEnabledPlugins(data.enabledPlugins || {})
      setMarketplaces(data.extraKnownMarketplaces || {})
    } catch { /* ignore */ }
    setLoading(false)
  }, [settingsScope, currentProjectDir])

  useEffect(() => { loadSettings() }, [loadSettings])

  // Save enabledPlugins back to settings
  const savePluginState = async (plugins: Record<string, boolean>) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.getSettings(settingsScope, currentProjectDir)
    const data = result?.data || {}
    data.enabledPlugins = plugins
    await api.config.saveSettings(settingsScope, data, currentProjectDir)
    setEnabledPlugins(plugins)
  }

  // Save marketplaces back to settings
  const saveMarketplaces = async (mps: Record<string, any>) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.getSettings(settingsScope, currentProjectDir)
    const data = result?.data || {}
    data.extraKnownMarketplaces = mps
    await api.config.saveSettings(settingsScope, data, currentProjectDir)
    setMarketplaces(mps)
  }

  const togglePlugin = async (key: string) => {
    const updated = { ...enabledPlugins }
    updated[key] = !updated[key]
    await savePluginState(updated)
    addActivity({
      type: 'config',
      message: `${updated[key] ? 'Enabled' : 'Disabled'} plugin: ${key}`,
      status: 'success'
    })
  }

  const removePlugin = async (key: string) => {
    const updated = { ...enabledPlugins }
    delete updated[key]
    await savePluginState(updated)
    addActivity({ type: 'config', message: `Removed plugin: ${key}`, status: 'success' })
  }

  const copyCommand = (cmd: string, label: string) => {
    navigator.clipboard.writeText(cmd)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const installPlugin = async (plugin: CatalogPlugin) => {
    const key = `${plugin.name}@${plugin.marketplace}`
    const updated = { ...enabledPlugins, [key]: true }
    await savePluginState(updated)
    addActivity({ type: 'config', message: `Enabled plugin: ${plugin.label}`, status: 'success' })
  }

  const isPluginEnabled = (plugin: CatalogPlugin) => {
    const key = `${plugin.name}@${plugin.marketplace}`
    return enabledPlugins[key] === true
  }

  const isPluginInstalled = (plugin: CatalogPlugin) => {
    const key = `${plugin.name}@${plugin.marketplace}`
    return key in enabledPlugins
  }

  const handleAddMarketplace = async () => {
    if (!newMpName.trim() || !newMpSource.trim()) return
    const name = newMpName.trim().replace(/[^a-z0-9-]/g, '')
    let source: any
    if (newMpType === 'github') {
      source = { source: 'github', repo: newMpSource.trim() }
    } else if (newMpType === 'url') {
      source = { source: 'url', url: newMpSource.trim() }
    } else {
      source = newMpSource.trim()
    }
    const updated = { ...marketplaces, [name]: { source } }
    await saveMarketplaces(updated)
    addActivity({ type: 'config', message: `Added marketplace: ${name}`, status: 'success' })
    setShowAddMarketplace(false)
    setNewMpName('')
    setNewMpSource('')
  }

  const removeMarketplace = async (name: string) => {
    const updated = { ...marketplaces }
    delete updated[name]
    await saveMarketplaces(updated)
    addActivity({ type: 'config', message: `Removed marketplace: ${name}`, status: 'success' })
  }

  // Filtered catalog
  const filteredCatalog = PLUGIN_CATALOG.filter(p => {
    const matchesCategory = category === 'all' || p.category === category
    const matchesSearch = !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const installedEntries = Object.entries(enabledPlugins)
  const marketplaceEntries = Object.entries(marketplaces)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(['discover', 'installed', 'marketplaces', 'guide'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs capitalize',
                  activeTab === tab ? 'bg-accent-orange/10 text-accent-orange font-medium' : 'text-text-muted hover:bg-bg-tertiary'
                )}
              >
                {tab === 'installed' ? `Installed (${installedEntries.length})` :
                 tab === 'marketplaces' ? `Marketplaces (${marketplaceEntries.length + 1})` :
                 tab}
              </button>
            ))}
          </div>
          {activeTab === 'discover' && (
            <SearchInput value={search} onChange={setSearch} placeholder="Search plugins..." className="w-64" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 bg-bg-tertiary rounded-lg">
            <button onClick={() => setSettingsScope('user')} className={cn('px-2 py-1 rounded text-[10px]', settingsScope === 'user' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted')}>User</button>
            <button onClick={() => setSettingsScope('project')} className={cn('px-2 py-1 rounded text-[10px]', settingsScope === 'project' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted')}>Project</button>
          </div>
          <button onClick={loadSettings} className="btn-ghost text-xs">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Category filter for Discover tab */}
      {activeTab === 'discover' && (
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-border overflow-x-auto">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors',
                category === c.id
                  ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/30'
                  : 'text-text-muted hover:bg-bg-tertiary border border-transparent'
              )}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── DISCOVER TAB ── */}
        {activeTab === 'discover' && (
          filteredCatalog.length === 0 ? (
            <EmptyState
              icon={<Package size={24} />}
              title="No Matching Plugins"
              description="Try a different search or category filter."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map(plugin => {
                const installed = isPluginInstalled(plugin)
                const enabled = isPluginEnabled(plugin)
                const installCmd = `/plugin install ${plugin.name}@${plugin.marketplace}`
                return (
                  <div key={plugin.name} className="card-hover">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          plugin.category === 'lsp' ? 'bg-accent-yellow/10' :
                          plugin.category === 'integrations' ? 'bg-accent-blue/10' :
                          plugin.category === 'workflows' ? 'bg-accent-purple/10' :
                          'bg-accent-green/10'
                        )}>
                          {plugin.category === 'lsp' ? <Cpu size={16} className="text-accent-yellow" /> :
                           plugin.category === 'integrations' ? <Globe size={16} className="text-accent-blue" /> :
                           plugin.category === 'workflows' ? <Zap size={16} className="text-accent-purple" /> :
                           <Eye size={16} className="text-accent-green" />}
                        </div>
                        <div>
                          <span className="text-sm font-medium">{plugin.label}</span>
                        </div>
                      </div>
                      {installed && (
                        <span className={cn('text-[10px] flex items-center gap-0.5', enabled ? 'badge-green' : 'badge text-text-muted')}>
                          {enabled ? <><Check size={10} /> Enabled</> : 'Disabled'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-text-secondary mb-2">{plugin.desc}</p>

                    {/* Component badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {plugin.components.map(comp => (
                        <span key={comp} className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium', COMPONENT_COLORS[comp] || 'bg-bg-tertiary text-text-muted')}>
                          {comp}
                        </span>
                      ))}
                    </div>

                    {plugin.requires && (
                      <div className="text-[10px] text-text-muted mb-2">
                        Requires: <code className="px-1 py-0.5 rounded bg-bg-tertiary font-mono">{plugin.requires}</code>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        onClick={() => copyCommand(installCmd, plugin.name)}
                        className="btn-ghost text-[10px] gap-1"
                        title="Copy install command"
                      >
                        {copied === plugin.name ? <Check size={10} className="text-accent-green" /> : <Copy size={10} />}
                        {copied === plugin.name ? 'Copied!' : 'Copy Command'}
                      </button>

                      {installed ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePlugin(`${plugin.name}@${plugin.marketplace}`)}
                            className={cn('btn-ghost text-xs py-1', enabled ? 'text-accent-orange' : 'text-text-muted')}
                          >
                            {enabled ? <EyeOff size={12} /> : <Eye size={12} />}
                            {enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => removePlugin(`${plugin.name}@${plugin.marketplace}`)}
                            className="btn-ghost text-xs py-1 text-accent-red"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => installPlugin(plugin)} className="btn-primary text-xs py-1">
                          <Plug size={12} /> Enable
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── INSTALLED TAB ── */}
        {activeTab === 'installed' && (
          installedEntries.length === 0 ? (
            <EmptyState
              icon={<Plug size={24} />}
              title="No Plugins Installed"
              description="Browse the Discover tab to find and enable plugins, or install them via the terminal with /plugin install."
              action={<button onClick={() => setActiveTab('discover')} className="btn-primary text-sm"><Package size={16} /> Discover Plugins</button>}
            />
          ) : (
            <div className="space-y-3">
              {installedEntries.map(([key, enabled]) => {
                const [name, marketplace] = key.split('@')
                const catalogEntry = PLUGIN_CATALOG.find(p => p.name === name)
                return (
                  <div key={key} className="card-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center',
                          enabled ? 'bg-accent-green/10' : 'bg-bg-tertiary'
                        )}>
                          <Plug size={18} className={enabled ? 'text-accent-green' : 'text-text-muted'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{catalogEntry?.label || name}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', enabled ? 'bg-accent-green/10 text-accent-green' : 'bg-bg-tertiary text-text-muted')}>
                              {enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted font-mono">{key}</p>
                          {catalogEntry && <p className="text-xs text-text-secondary mt-0.5">{catalogEntry.desc}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePlugin(key)}
                          className={cn('btn-ghost text-xs', enabled ? 'text-accent-orange' : 'text-accent-green')}
                        >
                          {enabled ? <><EyeOff size={14} /> Disable</> : <><Eye size={14} /> Enable</>}
                        </button>
                        <button onClick={() => removePlugin(key)} className="btn-ghost text-xs text-accent-red">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                    {catalogEntry && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                        {catalogEntry.components.map(comp => (
                          <span key={comp} className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium', COMPONENT_COLORS[comp] || 'bg-bg-tertiary text-text-muted')}>
                            {comp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── MARKETPLACES TAB ── */}
        {activeTab === 'marketplaces' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-text-primary">Plugin Marketplaces</h3>
                <p className="text-xs text-text-muted mt-0.5">Marketplaces are sources where plugins are published and discovered.</p>
              </div>
              <button onClick={() => { setShowAddMarketplace(true); setNewMpName(''); setNewMpSource(''); setNewMpType('github') }} className="btn-primary text-sm">
                <Plus size={16} /> Add Marketplace
              </button>
            </div>

            {/* Default marketplace */}
            <div className="card-hover border-accent-orange/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-orange/10 flex items-center justify-center">
                    <Star size={18} className="text-accent-orange" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">claude-plugins-official</span>
                      <span className="badge-orange text-[10px]">Default</span>
                    </div>
                    <p className="text-xs text-text-secondary">Official plugin registry maintained by Anthropic</p>
                    <p className="text-[10px] text-text-muted font-mono mt-0.5">anthropics/claude-plugins-official</p>
                  </div>
                </div>
                <span className="text-[10px] text-text-muted">Auto-included</span>
              </div>
            </div>

            {/* User-added marketplaces */}
            {marketplaceEntries.map(([name, config]) => (
              <div key={name} className="card-hover">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                      <Store size={18} className="text-accent-blue" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{name}</span>
                      <p className="text-[10px] text-text-muted font-mono mt-0.5">
                        {typeof config?.source === 'string' ? config.source :
                         config?.source?.repo || config?.source?.url || JSON.stringify(config?.source)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCommand(`/plugin marketplace update ${name}`, `mp-${name}`)}
                      className="btn-ghost text-xs"
                    >
                      {copied === `mp-${name}` ? <Check size={12} className="text-accent-green" /> : <RefreshCw size={12} />}
                      Update
                    </button>
                    <button onClick={() => removeMarketplace(name)} className="btn-ghost text-xs text-accent-red">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Community marketplaces info */}
            <div className="card bg-bg-secondary/50 border-dashed">
              <h4 className="text-xs font-medium text-text-secondary mb-2">Community Marketplaces</h4>
              <div className="space-y-2 text-xs text-text-muted">
                <div className="flex items-center justify-between">
                  <span>claude-plugins.dev</span>
                  <button onClick={() => copyCommand('/plugin marketplace add https://claude-plugins.dev', 'cpd')} className="btn-ghost text-[10px]">
                    {copied === 'cpd' ? <Check size={10} className="text-accent-green" /> : <Copy size={10} />}
                    Copy Command
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>claudemarketplaces.com</span>
                  <button onClick={() => copyCommand('/plugin marketplace add https://claudemarketplaces.com', 'cmc')} className="btn-ghost text-[10px]">
                    {copied === 'cmc' ? <Check size={10} className="text-accent-green" /> : <Copy size={10} />}
                    Copy Command
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GUIDE TAB ── */}
        {activeTab === 'guide' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-heading font-semibold text-text-primary mb-2">Plugin System Guide</h3>
              <p className="text-sm text-text-secondary">
                Plugins are packages that bundle multiple components — slash commands, agents, skills, hooks, MCP servers, and LSP servers — into a single installable unit.
              </p>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-text-primary mb-2">What Plugins Can Include</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(COMPONENT_COLORS).map(([comp, color]) => (
                  <div key={comp} className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', color)}>{comp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-text-primary mb-3">Terminal Commands</h4>
              <div className="space-y-3">
                {[
                  { label: 'Open Plugin Manager', cmd: '/plugin', desc: 'Interactive browser with Discover, Installed, Marketplaces tabs' },
                  { label: 'Install Plugin', cmd: '/plugin install name@marketplace', desc: 'Install a specific plugin' },
                  { label: 'Uninstall Plugin', cmd: '/plugin uninstall name@marketplace', desc: 'Remove a plugin completely' },
                  { label: 'Disable Plugin', cmd: '/plugin disable name@marketplace', desc: 'Disable without removing' },
                  { label: 'Enable Plugin', cmd: '/plugin enable name@marketplace', desc: 'Re-enable a disabled plugin' },
                  { label: 'Add Marketplace', cmd: '/plugin marketplace add owner/repo', desc: 'Register a GitHub-hosted marketplace' },
                  { label: 'List Marketplaces', cmd: '/plugin marketplace list', desc: 'View all configured marketplaces' },
                  { label: 'Update Marketplace', cmd: '/plugin marketplace update name', desc: 'Refresh plugins from a marketplace' },
                  { label: 'Remove Marketplace', cmd: '/plugin marketplace remove name', desc: 'Remove marketplace and its plugins' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 py-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-text-primary">{item.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => copyCommand(item.cmd, item.label)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-bg-tertiary font-mono text-[11px] text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
                    >
                      {copied === item.label ? <Check size={10} className="text-accent-green" /> : <Copy size={10} />}
                      {item.cmd}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-text-primary mb-2">Install Scopes</h4>
              <div className="space-y-2">
                {[
                  { scope: '--scope user', desc: 'Available across all your projects (default)' },
                  { scope: '--scope project', desc: 'Shared with team via .claude/settings.json' },
                  { scope: '--scope local', desc: 'Only for you in this repo (gitignored)' },
                ].map(item => (
                  <div key={item.scope} className="flex items-center gap-3 py-1.5">
                    <code className="px-2 py-0.5 rounded bg-bg-tertiary text-[11px] font-mono text-accent-cyan">{item.scope}</code>
                    <span className="text-xs text-text-secondary">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card bg-accent-blue/5 border-accent-blue/20">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-accent-blue mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-medium text-accent-blue">Plugins vs MCP Servers</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    MCP servers are a component that plugins can include — not a competing system. Use the <strong>MCP Servers</strong> page for standalone server configuration. Use <strong>Plugins</strong> for bundled packages that may include commands, agents, skills, hooks, and MCP servers together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Marketplace Modal */}
      <Modal
        open={showAddMarketplace}
        onClose={() => setShowAddMarketplace(false)}
        title="Add Plugin Marketplace"
        description="Register a new marketplace to discover and install plugins from"
        size="md"
        footer={
          <>
            <button onClick={() => setShowAddMarketplace(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleAddMarketplace}
              disabled={!newMpName.trim() || !newMpSource.trim()}
              className="btn-primary text-sm"
            >
              <Plus size={14} /> Add Marketplace
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Marketplace Name</label>
            <input
              value={newMpName}
              onChange={e => setNewMpName(e.target.value.replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-marketplace"
              className="input"
            />
          </div>

          <div>
            <label className="label">Source Type</label>
            <div className="flex gap-1 p-1 bg-bg-tertiary rounded-lg">
              {[
                { id: 'github' as const, label: 'GitHub', icon: <GitBranch size={14} /> },
                { id: 'url' as const, label: 'URL', icon: <Globe size={14} /> },
                { id: 'local' as const, label: 'Local Path', icon: <Server size={14} /> },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setNewMpType(t.id)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs transition-colors', newMpType === t.id ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted')}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">
              {newMpType === 'github' ? 'GitHub Repository (owner/repo)' :
               newMpType === 'url' ? 'Marketplace URL' : 'Local Directory Path'}
            </label>
            <input
              value={newMpSource}
              onChange={e => setNewMpSource(e.target.value)}
              placeholder={
                newMpType === 'github' ? 'your-org/claude-plugins' :
                newMpType === 'url' ? 'https://example.com/marketplace.json' :
                './path/to/marketplace'
              }
              className="input font-mono"
            />
          </div>

          <p className="text-[11px] text-text-muted">
            After adding, run <code className="px-1 py-0.5 rounded bg-bg-tertiary font-mono">/plugin marketplace update {newMpName || 'name'}</code> in the terminal to fetch available plugins.
          </p>
        </div>
      </Modal>
    </div>
  )
}
