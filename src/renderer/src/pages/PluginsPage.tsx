import React, { useEffect, useState, useCallback } from 'react'
import {
  Plug, Download, Trash2, Search, Star, Package, Plus,
  Server, Globe, Database, MessageSquare, Code, Cloud,
  Zap, Shield, GitBranch, ExternalLink, Check, Terminal
} from 'lucide-react'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { SearchInput } from '../components/shared/SearchInput'
import { Modal } from '../components/shared/Modal'
import type { McpServerConfig } from '../types/config'

type Category = 'all' | 'official' | 'database' | 'search' | 'communication' | 'development' | 'cloud' | 'productivity' | 'ai'

interface MarketplaceServer {
  name: string
  label: string
  desc: string
  category: Category
  type: 'stdio' | 'http' | 'sse'
  command: string
  args: string[]
  envKeys?: string[]
  envHints?: Record<string, string>
}

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Package size={14} /> },
  { id: 'official', label: 'Official', icon: <Star size={14} /> },
  { id: 'search', label: 'Search & Web', icon: <Globe size={14} /> },
  { id: 'database', label: 'Database', icon: <Database size={14} /> },
  { id: 'communication', label: 'Communication', icon: <MessageSquare size={14} /> },
  { id: 'development', label: 'Development', icon: <Code size={14} /> },
  { id: 'cloud', label: 'Cloud & Infra', icon: <Cloud size={14} /> },
  { id: 'productivity', label: 'Productivity', icon: <Zap size={14} /> },
  { id: 'ai', label: 'AI & ML', icon: <Shield size={14} /> },
]

const MARKETPLACE: MarketplaceServer[] = [
  // Official @modelcontextprotocol servers
  { name: 'github', label: 'GitHub', desc: 'Pull requests, issues, repos, and code search', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], envKeys: ['GITHUB_TOKEN'], envHints: { GITHUB_TOKEN: 'ghp_...' } },
  { name: 'filesystem', label: 'Filesystem', desc: 'Read, write, and manage local files and directories', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'] },
  { name: 'brave-search', label: 'Brave Search', desc: 'Web search powered by Brave Search API', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], envKeys: ['BRAVE_API_KEY'], envHints: { BRAVE_API_KEY: 'BSA...' } },
  { name: 'memory', label: 'Memory', desc: 'Persistent knowledge graph for long-term memory', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] },
  { name: 'postgres', label: 'PostgreSQL', desc: 'Query and manage PostgreSQL databases', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'], envKeys: ['POSTGRES_URL'], envHints: { POSTGRES_URL: 'postgresql://user:pass@host:5432/db' } },
  { name: 'slack', label: 'Slack', desc: 'Send messages, read channels, manage Slack workspace', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'], envKeys: ['SLACK_BOT_TOKEN'], envHints: { SLACK_BOT_TOKEN: 'xoxb-...' } },
  { name: 'puppeteer', label: 'Puppeteer', desc: 'Browser automation, screenshots, and web scraping', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] },
  { name: 'sequential-thinking', label: 'Sequential Thinking', desc: 'Step-by-step reasoning and task breakdown', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] },
  { name: 'fetch', label: 'Fetch', desc: 'Make HTTP requests and fetch web content', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] },
  { name: 'sqlite', label: 'SQLite', desc: 'Query and manage SQLite databases', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite'] },
  { name: 'google-maps', label: 'Google Maps', desc: 'Directions, geocoding, and place search', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-google-maps'], envKeys: ['GOOGLE_MAPS_API_KEY'], envHints: { GOOGLE_MAPS_API_KEY: 'AIza...' } },
  { name: 'git', label: 'Git', desc: 'Git operations — clone, diff, log, blame, and more', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-git'] },
  { name: 'google-drive', label: 'Google Drive', desc: 'Search, read, and manage Google Drive files', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-gdrive'] },
  { name: 'sentry', label: 'Sentry', desc: 'Error tracking, issue management, and performance', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sentry'], envKeys: ['SENTRY_AUTH_TOKEN'], envHints: { SENTRY_AUTH_TOKEN: 'sntrys_...' } },
  { name: 'everart', label: 'EverArt', desc: 'AI image generation and art creation', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-everart'], envKeys: ['EVERART_API_KEY'] },
  { name: 'everything', label: 'Everything', desc: 'Fast file and folder search across your system', category: 'official', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] },

  // Search & Web
  { name: 'exa', label: 'Exa Search', desc: 'AI-powered semantic search engine', category: 'search', type: 'stdio', command: 'npx', args: ['-y', '@exa-labs/mcp-server'], envKeys: ['EXA_API_KEY'] },
  { name: 'tavily', label: 'Tavily Search', desc: 'AI-optimized search API for research', category: 'search', type: 'stdio', command: 'npx', args: ['-y', '@tavily/mcp-server'], envKeys: ['TAVILY_API_KEY'] },
  { name: 'firecrawl', label: 'Firecrawl', desc: 'Web scraping, crawling, and content extraction', category: 'search', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/firecrawl-mcp-server'], envKeys: ['FIRECRAWL_API_KEY'] },

  // Database
  { name: 'redis', label: 'Redis / Upstash', desc: 'Redis cache, vector DB, and QStash messaging', category: 'database', type: 'stdio', command: 'npx', args: ['-y', '@upstash/mcp-server'], envKeys: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  { name: 'supabase', label: 'Supabase', desc: 'Postgres, auth, storage, and edge functions', category: 'database', type: 'stdio', command: 'npx', args: ['-y', '@supabase/mcp-server'], envKeys: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  { name: 'mongodb', label: 'MongoDB', desc: 'MongoDB database operations and queries', category: 'database', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/mongodb-mcp-server'], envKeys: ['MONGODB_URI'] },
  { name: 'neon', label: 'Neon', desc: 'Serverless Postgres — branches, queries, and management', category: 'database', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/neon-mcp-server'], envKeys: ['NEON_API_KEY'] },

  // Communication
  { name: 'discord', label: 'Discord', desc: 'Send messages, manage channels and servers', category: 'communication', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/discord-mcp-server'], envKeys: ['DISCORD_BOT_TOKEN'] },
  { name: 'linear', label: 'Linear', desc: 'Issues, projects, and team workflows', category: 'communication', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/linear-mcp-server'], envKeys: ['LINEAR_API_KEY'] },
  { name: 'notion', label: 'Notion', desc: 'Pages, databases, and workspace management', category: 'communication', type: 'stdio', command: 'npx', args: ['-y', '@notionhq/notion-mcp-server'], envKeys: ['NOTION_API_KEY'] },

  // Development
  { name: 'playwright', label: 'Playwright', desc: 'Browser testing and end-to-end automation', category: 'development', type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp'] },
  { name: 'context7', label: 'Context7', desc: 'Up-to-date library documentation and code examples', category: 'development', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/context7-mcp-server'] },
  { name: 'docker', label: 'Docker', desc: 'Container management, images, and compose', category: 'development', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/docker-mcp-server'] },
  { name: 'npm-search', label: 'NPM Search', desc: 'Search npm registry for packages and metadata', category: 'development', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/npm-mcp-server'] },

  // Cloud & Infrastructure
  { name: 'cloudflare', label: 'Cloudflare', desc: 'Workers, KV, R2, and DNS management', category: 'cloud', type: 'stdio', command: 'npx', args: ['-y', '@cloudflare/mcp-server-cloudflare'], envKeys: ['CLOUDFLARE_API_TOKEN'] },
  { name: 'aws', label: 'AWS', desc: 'S3, Lambda, EC2 and other AWS services', category: 'cloud', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/aws-mcp-server'], envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] },
  { name: 'vercel', label: 'Vercel', desc: 'Deployments, domains, and serverless functions', category: 'cloud', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/vercel-mcp-server'], envKeys: ['VERCEL_TOKEN'] },

  // Productivity
  { name: 'obsidian', label: 'Obsidian', desc: 'Read and write notes in Obsidian vaults', category: 'productivity', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/obsidian-mcp-server'] },
  { name: 'todoist', label: 'Todoist', desc: 'Task and project management', category: 'productivity', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/todoist-mcp-server'], envKeys: ['TODOIST_API_TOKEN'] },
  { name: 'google-calendar', label: 'Google Calendar', desc: 'Events, scheduling, and calendar management', category: 'productivity', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/google-calendar-mcp-server'] },

  // AI & ML
  { name: 'stability-ai', label: 'Stability AI', desc: 'Image generation with Stable Diffusion', category: 'ai', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/stability-mcp-server'], envKeys: ['STABILITY_API_KEY'] },
  { name: 'huggingface', label: 'Hugging Face', desc: 'Models, datasets, and inference API', category: 'ai', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/huggingface-mcp-server'], envKeys: ['HF_TOKEN'] },
  { name: 'replicate', label: 'Replicate', desc: 'Run ML models in the cloud', category: 'ai', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/replicate-mcp-server'], envKeys: ['REPLICATE_API_TOKEN'] },
]

export function PluginsPage() {
  const { addActivity, currentProjectDir } = useAppStore()
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('marketplace')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [installedServers, setInstalledServers] = useState<Record<string, McpServerConfig>>({})
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customTab, setCustomTab] = useState<'npx' | 'url'>('npx')
  const [customName, setCustomName] = useState('')
  const [customPackage, setCustomPackage] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customEnv, setCustomEnv] = useState('')
  const [showEnvModal, setShowEnvModal] = useState(false)
  const [envTarget, setEnvTarget] = useState<MarketplaceServer | null>(null)
  const [envValues, setEnvValues] = useState<Record<string, string>>({})

  const loadInstalled = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const servers = await api.config.getMcpServers('user')
      setInstalledServers(servers || {})
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadInstalled() }, [loadInstalled])

  const isInstalled = (name: string) => Object.keys(installedServers).includes(name)

  const handleInstall = async (server: MarketplaceServer) => {
    // If server needs env keys, show env modal first
    if (server.envKeys && server.envKeys.length > 0 && !isInstalled(server.name)) {
      setEnvTarget(server)
      const initial: Record<string, string> = {}
      server.envKeys.forEach(k => { initial[k] = '' })
      setEnvValues(initial)
      setShowEnvModal(true)
      return
    }

    await doInstall(server, {})
  }

  const doInstall = async (server: MarketplaceServer, env: Record<string, string>) => {
    const api = getApi()
    if (!api) return

    setInstalling(server.name)
    const config: McpServerConfig = {
      type: server.type,
      command: server.command,
      args: [...server.args],
    }
    if (Object.keys(env).length > 0) {
      // Only include non-empty env values
      const filtered: Record<string, string> = {}
      Object.entries(env).forEach(([k, v]) => { if (v.trim()) filtered[k] = v.trim() })
      if (Object.keys(filtered).length > 0) config.env = filtered
    }

    const result = await api.config.saveMcpServer({
      name: server.name,
      config,
      scope: 'user',
      projectDir: currentProjectDir,
    })

    if (result.success) {
      addActivity({ type: 'config', message: `Installed MCP server: ${server.label}`, status: 'success' })
      await loadInstalled()
    }
    setInstalling(null)
  }

  const handleUninstall = async (name: string) => {
    const api = getApi()
    if (!api) return
    const result = await api.config.deleteMcpServer(name, 'user', currentProjectDir)
    if (result.success) {
      addActivity({ type: 'config', message: `Removed MCP server: ${name}`, status: 'success' })
      await loadInstalled()
    }
  }

  const handleCustomInstall = async () => {
    const api = getApi()
    if (!api) return

    const name = customName.trim().replace(/[^a-z0-9-]/g, '')
    if (!name) return

    let config: McpServerConfig

    if (customTab === 'npx') {
      const pkg = customPackage.trim()
      if (!pkg) return
      config = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', pkg],
      }
    } else {
      const url = customUrl.trim()
      if (!url) return
      config = {
        type: url.includes('/sse') ? 'sse' : 'http',
        url,
      }
    }

    if (customEnv.trim()) {
      try { config.env = JSON.parse(customEnv) } catch { /* ignore bad JSON */ }
    }

    const result = await api.config.saveMcpServer({
      name,
      config,
      scope: 'user',
      projectDir: currentProjectDir,
    })

    if (result.success) {
      addActivity({ type: 'config', message: `Installed custom MCP server: ${name}`, status: 'success' })
      setShowCustom(false)
      setCustomName('')
      setCustomPackage('')
      setCustomUrl('')
      setCustomEnv('')
      await loadInstalled()
    }
  }

  const filtered = MARKETPLACE.filter(s => {
    const matchesCategory = category === 'all' || s.category === category
    const matchesSearch = !search || s.label.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()) || s.name.includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const installedEntries = Object.entries(installedServers)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('marketplace')} className={cn('px-3 py-1.5 rounded-lg text-xs', activeTab === 'marketplace' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>
              Marketplace
            </button>
            <button onClick={() => setActiveTab('installed')} className={cn('px-3 py-1.5 rounded-lg text-xs', activeTab === 'installed' ? 'bg-accent-orange/10 text-accent-orange' : 'text-text-muted hover:bg-bg-tertiary')}>
              Installed ({installedEntries.length})
            </button>
          </div>
          {activeTab === 'marketplace' && (
            <SearchInput value={search} onChange={setSearch} placeholder="Search servers..." className="w-64" />
          )}
        </div>
        <button onClick={() => { setShowCustom(true); setCustomTab('npx'); setCustomName(''); setCustomPackage(''); setCustomUrl(''); setCustomEnv('') }} className="btn-primary text-sm">
          <Plus size={16} /> Add Custom Source
        </button>
      </div>

      {/* Category filter */}
      {activeTab === 'marketplace' && (
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
        {activeTab === 'marketplace' ? (
          filtered.length === 0 ? (
            <EmptyState
              icon={<Package size={24} />}
              title="No Matching Servers"
              description="Try a different search or category filter."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(server => {
                const installed = isInstalled(server.name)
                const isInstalling = installing === server.name
                return (
                  <div key={server.name} className="card-hover">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                          <Server size={16} className="text-accent-blue" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{server.label}</span>
                          {server.category === 'official' && (
                            <span className="ml-1.5 badge-blue text-[9px]">Official</span>
                          )}
                        </div>
                      </div>
                      {installed && <span className="badge-green text-[10px] flex items-center gap-0.5"><Check size={10} /> Installed</span>}
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{server.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted font-mono truncate max-w-[60%]" title={`${server.command} ${server.args.join(' ')}`}>
                        {server.command} {server.args.slice(-1)[0]}
                      </span>
                      {installed ? (
                        <button onClick={() => handleUninstall(server.name)} className="btn-ghost text-xs text-accent-red py-1">
                          <Trash2 size={12} /> Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstall(server)}
                          disabled={isInstalling}
                          className="btn-primary text-xs py-1"
                        >
                          {isInstalling ? (
                            <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Installing...</>
                          ) : (
                            <><Download size={12} /> Install</>
                          )}
                        </button>
                      )}
                    </div>
                    {server.envKeys && server.envKeys.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <span className="text-[10px] text-text-muted">
                          Requires: {server.envKeys.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* Installed Tab */
          installedEntries.length === 0 ? (
            <EmptyState
              icon={<Server size={24} />}
              title="No Servers Installed"
              description="Browse the marketplace to discover and install MCP servers."
              action={<button onClick={() => setActiveTab('marketplace')} className="btn-primary text-sm"><Package size={16} /> Browse Marketplace</button>}
            />
          ) : (
            <div className="space-y-3">
              {installedEntries.map(([name, config]) => (
                <div key={name} className="card-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center">
                        <Server size={18} className="text-accent-green" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{name}</span>
                          <span className="badge-blue text-[10px]">{config.type || 'stdio'}</span>
                        </div>
                        <p className="text-xs text-text-muted font-mono">
                          {config.command ? `${config.command} ${(config.args || []).join(' ')}` : config.url || 'No URL'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleUninstall(name)} className="btn-ghost text-xs text-accent-red">
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                  {config.env && Object.keys(config.env).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-[10px] text-text-muted">
                        Env: {Object.keys(config.env).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Environment Variables Modal */}
      <Modal
        open={showEnvModal}
        onClose={() => setShowEnvModal(false)}
        title={`Configure ${envTarget?.label || ''}`}
        description="Enter required environment variables (leave empty to skip)"
        size="md"
        footer={
          <>
            <button onClick={() => setShowEnvModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={() => {
                if (envTarget) {
                  doInstall(envTarget, envValues)
                  setShowEnvModal(false)
                }
              }}
              className="btn-primary text-sm"
            >
              <Download size={14} /> Install
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {envTarget?.envKeys?.map(key => (
            <div key={key}>
              <label className="label">{key}</label>
              <input
                value={envValues[key] || ''}
                onChange={e => setEnvValues(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={envTarget.envHints?.[key] || 'Enter value...'}
                className="input font-mono text-sm"
                type={key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret') ? 'password' : 'text'}
              />
            </div>
          ))}
          <p className="text-[11px] text-text-muted">
            Variables are stored in your Claude config. You can leave fields empty and configure them later.
          </p>
        </div>
      </Modal>

      {/* Add Custom Source Modal */}
      <Modal
        open={showCustom}
        onClose={() => setShowCustom(false)}
        title="Add Custom MCP Source"
        description="Add a third-party MCP server via NPX package or remote URL"
        size="md"
        footer={
          <>
            <button onClick={() => setShowCustom(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleCustomInstall}
              disabled={!customName.trim() || (customTab === 'npx' ? !customPackage.trim() : !customUrl.trim())}
              className="btn-primary text-sm"
            >
              <Download size={14} /> Install
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tab selector */}
          <div className="flex gap-1 p-1 bg-bg-tertiary rounded-lg">
            <button
              onClick={() => setCustomTab('npx')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs transition-colors', customTab === 'npx' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted')}
            >
              <Terminal size={14} /> NPX Package
            </button>
            <button
              onClick={() => setCustomTab('url')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs transition-colors', customTab === 'url' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted')}
            >
              <Globe size={14} /> Remote URL
            </button>
          </div>

          <div>
            <label className="label">Server Name</label>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value.replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-custom-server"
              className="input"
            />
          </div>

          {customTab === 'npx' ? (
            <div>
              <label className="label">NPX Package</label>
              <input
                value={customPackage}
                onChange={e => setCustomPackage(e.target.value)}
                placeholder="@scope/mcp-server-name"
                className="input font-mono"
              />
              <p className="text-[11px] text-text-muted mt-1">
                The npm package name. Will be run as: npx -y {customPackage || '<package>'}
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Server URL</label>
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                className="input font-mono"
              />
              <p className="text-[11px] text-text-muted mt-1">
                HTTP or SSE endpoint URL for the remote MCP server.
              </p>
            </div>
          )}

          <div>
            <label className="label">Environment Variables (JSON, optional)</label>
            <textarea
              value={customEnv}
              onChange={e => setCustomEnv(e.target.value)}
              placeholder={'{"API_KEY": "your-key-here"}'}
              className="textarea font-mono"
              rows={2}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
