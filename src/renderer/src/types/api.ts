export interface CliInfo {
  version: string
  claudePath: string
  homeDir: string
  configDir: string
}

export interface CliCheckResult {
  available: boolean
  version: string | null
  path: string | null
}

export interface SessionInfo {
  id: string
  cwd: string
  model: string
  startTime: number
  active: boolean
}

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
}

export interface FileResult {
  exists: boolean
  content: string | null
  error?: string
}

export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  modified: number
  ext: string
}

export interface DirListResult {
  exists: boolean
  entries: DirEntry[]
  error?: string
}

export interface ClaudePaths {
  home: string
  globalConfig: string
  globalClaudeMd: string
  globalSettings: string
  globalSkills: string
  globalAgents: string
  globalCommands: string
  claudeJson: string
}

export interface ProjectScan {
  projectDir: string
  // Project-level
  claudeMd: boolean
  dotClaudeMd: boolean
  claudeLocalMd: boolean
  settings: boolean
  localSettings: boolean
  skills: boolean
  agents: boolean
  commands: boolean
  mcpJson: boolean
  rules: boolean
  autoMemory: boolean
  // Global-level
  globalClaudeMd: boolean
  globalSettings: boolean
  globalSkills: boolean
  globalAgents: boolean
  globalCommands: boolean
  globalMcp: boolean
  globalRules: boolean
  globalAutoMemory: boolean
}
