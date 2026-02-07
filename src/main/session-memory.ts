import { IpcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'

const MEMORIES_DIR = join(homedir(), '.claude', 'gui-memories')

function ensureDir(): void {
  if (!existsSync(MEMORIES_DIR)) mkdirSync(MEMORIES_DIR, { recursive: true })
}

export function registerSessionMemoryHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('memory:list', () => {
    ensureDir()
    try {
      const files = readdirSync(MEMORIES_DIR).filter(f => f.endsWith('.json'))
      return files
        .map(f => {
          try {
            return JSON.parse(readFileSync(join(MEMORIES_DIR, f), 'utf-8'))
          } catch { return null }
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.createdAt - a.createdAt)
    } catch {
      return []
    }
  })

  ipcMain.handle('memory:get', (_event, id: string) => {
    const filePath = join(MEMORIES_DIR, `${id}.json`)
    try {
      if (!existsSync(filePath)) return null
      return JSON.parse(readFileSync(filePath, 'utf-8'))
    } catch {
      return null
    }
  })

  ipcMain.handle('memory:save', (_event, memory: {
    title: string
    summary: string
    sourceSessionId?: string
    model?: string
    cwd?: string
  }) => {
    ensureDir()
    const id = `mem-${randomUUID()}`
    const full = { ...memory, id, createdAt: Date.now() }
    try {
      writeFileSync(join(MEMORIES_DIR, `${id}.json`), JSON.stringify(full, null, 2), 'utf-8')
      return { success: true, id }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('memory:update', (_event, id: string, updates: { title?: string; summary?: string }) => {
    const filePath = join(MEMORIES_DIR, `${id}.json`)
    try {
      if (!existsSync(filePath)) return { success: false, error: 'Not found' }
      const existing = JSON.parse(readFileSync(filePath, 'utf-8'))
      const updated = { ...existing, ...updates }
      writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8')
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('memory:delete', (_event, id: string) => {
    const filePath = join(MEMORIES_DIR, `${id}.json`)
    try {
      if (existsSync(filePath)) unlinkSync(filePath)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
