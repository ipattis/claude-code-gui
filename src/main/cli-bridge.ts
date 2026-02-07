import { IpcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

interface ClaudeSession {
  id: string
  process: ChildProcess | null
  cwd: string
  model: string
  startTime: number
  active: boolean
}

const sessions = new Map<string, ClaudeSession>()
let sessionCounter = 0

// Build a rich PATH that includes common user binary locations
// Electron doesn't inherit the user's login shell PATH
function buildUserPath(): string {
  const home = homedir()
  const extraPaths = [
    join(home, '.npm-global', 'bin'),
    join(home, '.local', 'bin'),
    join(home, '.bun', 'bin'),
    join(home, '.nvm', 'versions', 'node'),  // will be expanded below
    '/usr/local/bin',
    '/opt/homebrew/bin',
    join(home, '.cargo', 'bin'),
  ]

  // Try to find active nvm node version
  const nvmDir = join(home, '.nvm', 'versions', 'node')
  if (existsSync(nvmDir)) {
    try {
      const versions = require('fs').readdirSync(nvmDir)
      if (versions.length > 0) {
        // Use the latest version
        const latest = versions.sort().reverse()[0]
        extraPaths.push(join(nvmDir, latest, 'bin'))
      }
    } catch { /* ignore */ }
  }

  const systemPath = process.env.PATH || '/usr/bin:/bin'
  return [...extraPaths, systemPath].join(':')
}

function getClaudePath(): string {
  const home = homedir()
  // Check known locations directly (no shell needed)
  const candidates = [
    join(home, '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    join(home, '.local', 'bin', 'claude'),
    join(home, '.bun', 'bin', 'claude'),
    '/opt/homebrew/bin/claude',
  ]

  for (const c of candidates) {
    if (existsSync(c)) {
      return c
    }
  }

  // Try which with enriched PATH
  try {
    const richPath = buildUserPath()
    const path = execSync('which claude', {
      encoding: 'utf-8',
      env: { ...process.env, PATH: richPath }
    }).trim()
    return path
  } catch { /* ignore */ }

  return 'claude' // fallback
}

// Shared env with enriched PATH for all spawned processes
function getSpawnEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: buildUserPath(),
  }
}

function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now()}`
}

export function registerCliBridgeHandlers(ipcMain: IpcMain): void {
  const claudePath = getClaudePath()

  // Check if Claude CLI is available
  ipcMain.handle('cli:check', async () => {
    try {
      const version = execSync(`"${claudePath}" --version 2>&1`, {
        encoding: 'utf-8',
        env: getSpawnEnv()
      }).trim()
      return { available: true, version, path: claudePath }
    } catch {
      return { available: false, version: null, path: null }
    }
  })

  // Start a new Claude session
  ipcMain.handle('cli:start-session', async (_event, options: {
    cwd?: string
    model?: string
    resume?: boolean
    args?: string[]
  }) => {
    const sessionId = generateSessionId()
    const args: string[] = []

    if (options.model) {
      args.push('--model', options.model)
    }
    if (options.resume) {
      args.push('-c')
    }
    if (options.args) {
      args.push(...options.args)
    }

    const cwd = options.cwd || process.cwd()

    const session: ClaudeSession = {
      id: sessionId,
      process: null,
      cwd,
      model: options.model || 'default',
      startTime: Date.now(),
      active: true
    }

    sessions.set(sessionId, session)

    return { sessionId, cwd }
  })

  // Spawn a PTY process for terminal integration
  ipcMain.handle('cli:spawn-pty', async (_event, options: {
    sessionId: string
    cols: number
    rows: number
  }) => {
    const session = sessions.get(options.sessionId)
    if (!session) {
      return { error: 'Session not found' }
    }

    // We return the command info for the renderer to use with xterm
    return {
      command: claudePath,
      cwd: session.cwd,
      env: getSpawnEnv()
    }
  })

  // Execute a single Claude command (non-interactive)
  ipcMain.handle('cli:exec', async (_event, options: {
    command: string
    cwd?: string
    timeout?: number
    model?: string
  }) => {
    const args = ['-p', options.command, '--output-format', 'text']
    if (options.model) {
      args.push('--model', options.model)
    }

    console.log('[cli:exec] Running:', claudePath, args.join(' '))
    return new Promise((resolve) => {
      const spawnEnv = getSpawnEnv()
      let proc: ReturnType<typeof spawn>
      try {
        proc = spawn(claudePath, args, {
          cwd: options.cwd || process.cwd(),
          env: spawnEnv,
        })
      } catch (e: any) {
        console.error('[cli:exec] Spawn failed:', e.message)
        resolve({ code: -1, stdout: '', stderr: `Spawn failed: ${e.message}` })
        return
      }

      // Close stdin immediately — prompt is passed via -p flag argument.
      // Without this, Claude CLI may hang waiting for interactive input
      // (e.g., tool permission prompts) since stdin pipe stays open.
      proc.stdin?.end()

      let stdout = ''
      let stderr = ''

      // Set a manual timeout since spawn timeout option is unreliable
      const timer = setTimeout(() => {
        console.log('[cli:exec] Timeout reached, killing process')
        proc.kill('SIGTERM')
        resolve({ code: -1, stdout, stderr: stderr || 'Command timed out after 2 minutes' })
      }, options.timeout || 120000)

      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        clearTimeout(timer)
        console.log('[cli:exec] Done. code:', code, 'stdout length:', stdout.length, 'stderr length:', stderr.length)
        resolve({ code, stdout, stderr })
      })

      proc.on('error', (error) => {
        clearTimeout(timer)
        console.error('[cli:exec] Process error:', error.message)
        resolve({ code: -1, stdout: '', stderr: `Process error: ${error.message}` })
      })
    })
  })

  // Run a slash command
  ipcMain.handle('cli:slash-command', async (_event, options: {
    command: string
    args?: string
    cwd?: string
  }) => {
    const fullCommand = options.args
      ? `/${options.command} ${options.args}`
      : `/${options.command}`

    return new Promise((resolve) => {
      const proc = spawn(claudePath, ['-p', fullCommand], {
        cwd: options.cwd || process.cwd(),
        env: getSpawnEnv()
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => { stdout += data.toString() })
      proc.stderr.on('data', (data) => { stderr += data.toString() })

      proc.on('close', (code) => {
        resolve({ code, stdout, stderr })
      })
    })
  })

  // List active sessions
  ipcMain.handle('cli:list-sessions', async () => {
    return Array.from(sessions.entries()).map(([id, s]) => ({
      id,
      cwd: s.cwd,
      model: s.model,
      startTime: s.startTime,
      active: s.active
    }))
  })

  // Kill a session
  ipcMain.handle('cli:kill-session', async (_event, sessionId: string) => {
    const session = sessions.get(sessionId)
    if (session?.process) {
      session.process.kill('SIGTERM')
      session.active = false
    }
    sessions.delete(sessionId)
    return { success: true }
  })

  // Get Claude config info
  ipcMain.handle('cli:get-info', async () => {
    try {
      const result = execSync(`"${claudePath}" --version 2>&1`, {
        encoding: 'utf-8',
        env: getSpawnEnv()
      }).trim()
      return {
        version: result,
        claudePath,
        homeDir: homedir(),
        configDir: join(homedir(), '.claude'),
        cwd: process.cwd(),
      }
    } catch (e) {
      return {
        version: 'unknown',
        claudePath,
        homeDir: homedir(),
        configDir: join(homedir(), '.claude'),
        cwd: process.cwd(),
      }
    }
  })
}
