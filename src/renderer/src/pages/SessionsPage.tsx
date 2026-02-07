import React, { useEffect, useState, useCallback } from 'react'
import {
  History, Trash2, Clock, FolderOpen, Monitor, Brain,
  Play, ChevronDown, ChevronRight, Eye, RefreshCw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn, formatTimestamp, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import type { SessionInfo } from '../types/api'

interface SessionMemory {
  id: string
  title: string
  summary: string
  sourceSessionId?: string
  model?: string
  cwd?: string
  createdAt: number
}

export function SessionsPage() {
  const { sessions, setSessions, setPendingSessionMemory } = useAppStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState<SessionMemory[]>([])
  const [loadingMemories, setLoadingMemories] = useState(true)
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)
  const [viewMemory, setViewMemory] = useState<SessionMemory | null>(null)

  const loadSessions = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoading(false); return }
    try {
      const ptySessions = await api.pty.listSessions()
      console.log('[Sessions] PTY sessions:', ptySessions)
      setSessions(ptySessions || [])
    } catch (e) {
      console.error('[Sessions] Failed to load PTY sessions:', e)
      try {
        const cliSessions = await api.cli.listSessions()
        setSessions(cliSessions || [])
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [setSessions])

  const loadMemories = useCallback(async () => {
    const api = getApi()
    if (!api) { setLoadingMemories(false); return }
    try {
      const result = await api.memory.list()
      setMemories(result || [])
    } catch (e) {
      console.error('[Sessions] Failed to load memories:', e)
    }
    setLoadingMemories(false)
  }, [])

  useEffect(() => {
    loadSessions()
    loadMemories()
  }, [loadSessions, loadMemories])

  const killSession = async (id: string) => {
    const api = getApi()
    if (!api) return
    api.pty.kill(id)
    setTimeout(() => loadSessions(), 200)
  }

  const deleteMemory = async (id: string) => {
    const api = getApi()
    if (!api) return
    await api.memory.delete(id)
    setMemories(prev => prev.filter(m => m.id !== id))
  }

  const loadMemoryIntoNewSession = (memory: SessionMemory) => {
    setPendingSessionMemory(memory.summary)
    navigate('/terminal')
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <History size={20} className="text-accent-blue" />
          <div>
            <h2 className="text-sm font-heading font-semibold">Sessions & Memories</h2>
            <p className="text-[11px] text-text-muted">
              {sessions.length} active · {memories.length} memories
            </p>
          </div>
        </div>
        <button onClick={() => { loadSessions(); loadMemories() }} className="btn-secondary text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Active Sessions */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Active Sessions
          </h3>
          {loading ? (
            <div className="text-sm text-text-muted py-4">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-text-muted py-4 bg-bg-secondary rounded-lg px-4">
              No active terminal sessions. Start one from the Terminal page.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="card-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        session.active ? 'bg-accent-green animate-pulse' : 'bg-text-muted'
                      )} />
                      <div>
                        <div className="text-sm font-mono font-medium">{session.id}</div>
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                          {session.cwd && (
                            <span className="flex items-center gap-1"><FolderOpen size={10} /> {session.cwd}</span>
                          )}
                          <span className="flex items-center gap-1"><Monitor size={10} /> {session.model}</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {formatTimestamp(session.startTime)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.active && (
                        <button onClick={() => killSession(session.id)} className="btn-ghost text-xs text-accent-red">
                          <Trash2 size={12} /> Kill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Session Memories */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
            <Brain size={14} />
            Session Memories
          </h3>
          {loadingMemories ? (
            <div className="text-sm text-text-muted py-4">Loading...</div>
          ) : memories.length === 0 ? (
            <EmptyState
              icon={<Brain size={24} />}
              title="No Session Memories"
              description='Use the "Save Memory" button in the Terminal toolbar to create a session summary. Then start a new session from that memory to continue where you left off.'
            />
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => {
                const isExpanded = expandedMemory === memory.id
                return (
                  <div key={memory.id} className="card-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedMemory(isExpanded ? null : memory.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} className="text-text-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-text-muted flex-shrink-0" />}
                          <span className="text-sm font-medium truncate">{memory.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-1 ml-6">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {formatDate(memory.createdAt)}
                          </span>
                          {memory.model && (
                            <span className="flex items-center gap-1">
                              <Monitor size={10} /> {memory.model}
                            </span>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-text-secondary mt-1.5 ml-6 line-clamp-2">
                            {memory.summary.slice(0, 200)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setViewMemory(memory)}
                          className="btn-ghost p-1.5"
                          title="View full summary"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => loadMemoryIntoNewSession(memory)}
                          className="btn-secondary text-xs gap-1"
                          title="Start a new terminal session with this context"
                        >
                          <Play size={12} /> Continue
                        </button>
                        <button
                          onClick={() => deleteMemory(memory.id)}
                          className="btn-ghost p-1.5 text-accent-red"
                          title="Delete memory"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 ml-6 p-3 bg-bg-secondary rounded-lg">
                        <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap leading-relaxed">
                          {memory.summary}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* View Memory Modal */}
      <Modal
        open={!!viewMemory}
        onClose={() => setViewMemory(null)}
        title={viewMemory?.title || 'Session Memory'}
        description={viewMemory ? formatDate(viewMemory.createdAt) : ''}
        size="lg"
        footer={
          <>
            <button onClick={() => setViewMemory(null)} className="btn-secondary text-sm">Close</button>
            {viewMemory && (
              <button
                onClick={() => {
                  loadMemoryIntoNewSession(viewMemory)
                  setViewMemory(null)
                }}
                className="btn-primary text-sm"
              >
                <Play size={14} /> Continue in New Session
              </button>
            )}
          </>
        }
      >
        {viewMemory && (
          <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto p-4 bg-bg-secondary rounded-lg">
            {viewMemory.summary}
          </pre>
        )}
      </Modal>
    </div>
  )
}
