export interface SkillInfo {
  name: string
  description: string
  scope: 'user' | 'project' | 'plugin' | 'builtin'
  path: string
  content: string
  frontmatter: Record<string, any>
}

export interface AgentInfo {
  name: string
  description: string
  model: string
  scope: 'user' | 'project' | 'plugin'
  path: string
  content: string
  frontmatter: Record<string, any>
}

export interface CommandInfo {
  name: string
  description: string
  scope: 'user' | 'project' | 'plugin' | 'builtin'
  path: string
  content: string
  frontmatter: Record<string, any>
}

export interface HookConfig {
  type: 'command' | 'prompt'
  command?: string
  prompt?: string
  timeout?: number
  env?: Record<string, string>
}

export interface HookMatcher {
  matcher: string
  hooks: HookConfig[]
}

export interface HooksConfig {
  PreToolUse?: HookMatcher[]
  PostToolUse?: HookMatcher[]
  UserPromptSubmit?: HookMatcher[]
  SessionStart?: HookMatcher[]
  SessionEnd?: HookMatcher[]
  Notification?: HookMatcher[]
  Stop?: HookMatcher[]
  SubagentStop?: HookMatcher[]
  PreCompact?: HookMatcher[]
  PermissionRequest?: HookMatcher[]
}

export type HookEventType = keyof HooksConfig

export interface McpServerConfig {
  type?: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  cwd?: string
}

export interface SettingsData {
  model?: string
  maxTokens?: number
  temperature?: number
  extendedThinking?: boolean
  allowedTools?: string[]
  deny?: string[]
  bypassPermissions?: boolean
  theme?: string
  hooks?: HooksConfig
  [key: string]: any
}

export interface WizardStep {
  id: string
  title: string
  description: string
  completed: boolean
}
