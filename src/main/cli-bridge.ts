import { IpcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { net } from 'electron'

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

// Cached login shell PATH (expensive to compute — do it once)
let _cachedLoginPath: string | null = null

// Get the user's actual login shell PATH by spawning a login shell
function getLoginShellPath(): string {
  if (_cachedLoginPath !== null) return _cachedLoginPath

  try {
    const shell = process.env.SHELL || '/bin/zsh'
    const result = execSync(`${shell} -ilc 'echo $PATH'`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim()
    if (result) {
      _cachedLoginPath = result
      return result
    }
  } catch { /* ignore — fall back to manual construction */ }

  _cachedLoginPath = ''
  return ''
}

// Build a rich PATH that includes common user binary locations
// Electron doesn't inherit the user's login shell PATH
function buildUserPath(): string {
  const home = homedir()
  const extraPaths = [
    join(home, '.npm-global', 'bin'),
    join(home, '.local', 'bin'),
    join(home, '.bun', 'bin'),
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
        const latest = versions.sort().reverse()[0]
        extraPaths.push(join(nvmDir, latest, 'bin'))
      }
    } catch { /* ignore */ }
  }

  // Get the user's actual login shell PATH (most reliable in packaged app)
  const loginPath = getLoginShellPath()

  const systemPath = process.env.PATH || '/usr/bin:/bin'
  return [...extraPaths, loginPath, systemPath].filter(Boolean).join(':')
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

// Read API key from environment or ~/.claude/.env file
function getAnthropicApiKey(): string | null {
  // 1. Check process env (set by shell or system)
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }

  // 2. Read from ~/.claude/.env
  try {
    const envPath = join(homedir(), '.claude', '.env')
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        let value = trimmed.slice(eqIdx + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key === 'ANTHROPIC_API_KEY' && value) return value
      }
    }
  } catch { /* ignore */ }

  return null
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

  // ── Direct Anthropic API call for prompt enhancement ──
  // Much faster than spawning the full CLI (2-3s vs 15-30s)
  ipcMain.handle('cli:enhance-prompt', async (_event, prompt: string) => {
    const apiKey = getAnthropicApiKey()

    if (apiKey) {
      // Direct API call — fast path
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `You are a prompt enhancement expert for Claude Code (an AI coding assistant). A beginner developer has written the following prompt. Rewrite it to be clear, specific, and well-structured so Claude Code can execute it effectively.

Rules:
- Preserve the user's EXACT intent — don't add features they didn't ask for
- Make it specific and actionable
- Add structure (bullet points, clear sections) if the request has multiple parts
- Specify file paths, technologies, or constraints if they can be inferred
- Keep it concise — better prompts are clear, not long
- If the prompt is already good, make minimal improvements
- Output ONLY the enhanced prompt, nothing else — no preamble, no explanation

User's prompt:
---
${prompt}
---`
            }]
          }),
        })

        if (response.ok) {
          const data = await response.json() as any
          const text = data.content?.[0]?.text || ''
          if (text) {
            return { success: true, enhanced: text.trim() }
          }
        }
        // If API call fails, fall through to CLI fallback
        console.log('[enhance-prompt] API returned non-ok:', response.status)
      } catch (e: any) {
        console.log('[enhance-prompt] Direct API failed, falling back to CLI:', e.message)
      }
    }

    // CLI fallback — slower but works with claude login (Max/Pro subscriptions)
    try {
      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const args = ['-p', `Rewrite this prompt to be clearer and more specific for an AI coding assistant. Output ONLY the enhanced prompt, nothing else:\n\n${prompt}`, '--output-format', 'text', '--model', 'haiku']
        const proc = spawn(claudePath, args, {
          cwd: process.cwd(),
          env: getSpawnEnv(),
        })
        proc.stdin?.end()

        let stdout = ''
        let stderr = ''
        const timer = setTimeout(() => { proc.kill('SIGTERM'); resolve({ code: -1, stdout, stderr: 'Timeout' }) }, 30000)

        proc.stdout?.on('data', (d) => { stdout += d.toString() })
        proc.stderr?.on('data', (d) => { stderr += d.toString() })
        proc.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }) })
        proc.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout: '', stderr: e.message }) })
      })

      if (result.stdout.trim()) {
        return { success: true, enhanced: result.stdout.trim() }
      }
      return { success: false, error: result.stderr || 'No output from CLI' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // ── Execute a script file ──
  ipcMain.handle('cli:run-script', async (_event, filePath: string, cwd?: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    let command: string
    let args: string[]

    switch (ext) {
      case 'py':
        command = 'python3'
        args = [filePath]
        break
      case 'js':
        command = 'node'
        args = [filePath]
        break
      case 'ts':
        command = 'npx'
        args = ['tsx', filePath]
        break
      case 'sh':
      case 'bash':
        command = 'bash'
        args = [filePath]
        break
      default:
        return { success: false, output: `Unsupported file type: .${ext}` }
    }

    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: getSpawnEnv(),
      })

      let output = ''
      const timer = setTimeout(() => {
        proc.kill('SIGTERM')
        resolve({ success: false, output: output + '\n[Timeout after 60 seconds]' })
      }, 60000)

      proc.stdout?.on('data', (d) => { output += d.toString() })
      proc.stderr?.on('data', (d) => { output += d.toString() })
      proc.on('close', (code) => {
        clearTimeout(timer)
        resolve({ success: code === 0, output, exitCode: code })
      })
      proc.on('error', (e) => {
        clearTimeout(timer)
        resolve({ success: false, output: `Failed to run: ${e.message}` })
      })
    })
  })

  // ── Direct API call for session summarization ──
  // Same fast-path strategy as enhance-prompt
  ipcMain.handle('cli:summarize-session', async (_event, transcript: string) => {
    const systemPrompt = `You are creating a session handoff summary. A developer is transitioning from one AI coding session to another. Create a concise summary that lets a fresh AI assistant pick up where the previous session left off.

Focus on:
- **Project context**: What project, what stack, what directory
- **What was accomplished**: Key changes made, files modified
- **Current state**: What's working, what's broken, what's in progress
- **Key decisions**: Important architectural or implementation decisions and why
- **Next steps**: What needs to be done next

Be concise (under 400 words). Use markdown bullets.

Terminal transcript:
---
${transcript}
---`

    const apiKey = getAnthropicApiKey()

    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: systemPrompt }]
          }),
        })

        if (response.ok) {
          const data = await response.json() as any
          const text = data.content?.[0]?.text || ''
          if (text) return { success: true, summary: text.trim() }
        }
        console.log('[summarize-session] API returned non-ok:', response.status)
      } catch (e: any) {
        console.log('[summarize-session] Direct API failed, falling back to CLI:', e.message)
      }
    }

    // CLI fallback
    try {
      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const args = ['-p', systemPrompt, '--output-format', 'text', '--model', 'haiku']
        const proc = spawn(claudePath, args, {
          cwd: process.cwd(),
          env: getSpawnEnv(),
        })
        proc.stdin?.end()

        let stdout = ''
        let stderr = ''
        const timer = setTimeout(() => { proc.kill('SIGTERM'); resolve({ code: -1, stdout, stderr: 'Timeout' }) }, 60000)

        proc.stdout?.on('data', (d) => { stdout += d.toString() })
        proc.stderr?.on('data', (d) => { stderr += d.toString() })
        proc.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }) })
        proc.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout: '', stderr: e.message }) })
      })

      if (result.stdout.trim()) {
        return { success: true, summary: result.stdout.trim() }
      }
      return { success: false, error: result.stderr || 'No output' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
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
