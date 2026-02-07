import { useCallback } from 'react'
import { getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'

export function useClaudeApi() {
  const { setCliAvailable, setCliInfo, setClaudePaths, setCurrentProjectDir, currentProjectDir, addActivity } = useAppStore()

  const initialize = useCallback(async () => {
    const api = getApi()
    if (!api) return

    try {
      const check = await api.cli.check()
      setCliAvailable(check.available)

      if (check.available) {
        const info = await api.cli.getInfo()
        setCliInfo(info)

        // Auto-set project directory from CWD if not already set
        if (!currentProjectDir && info.cwd && info.cwd !== '/') {
          setCurrentProjectDir(info.cwd)
        }
      }

      const paths = await api.fs.getClaudePaths()
      setClaudePaths(paths)

      addActivity({
        type: 'session',
        message: check.available
          ? `Claude Code connected (${check.version})`
          : 'Claude Code CLI not found',
        status: check.available ? 'success' : 'error'
      })
    } catch (error) {
      setCliAvailable(false)
      addActivity({
        type: 'session',
        message: 'Failed to connect to Claude Code CLI',
        status: 'error'
      })
    }
  }, [setCliAvailable, setCliInfo, setClaudePaths, setCurrentProjectDir, currentProjectDir, addActivity])

  const readFile = useCallback(async (path: string) => {
    const api = getApi()
    return api?.fs.read(path)
  }, [])

  const writeFile = useCallback(async (path: string, content: string) => {
    const api = getApi()
    return api?.fs.write(path, content)
  }, [])

  const listSkills = useCallback(async (projectDir?: string) => {
    const api = getApi()
    return api?.config.listSkills(projectDir)
  }, [])

  const listAgents = useCallback(async (projectDir?: string) => {
    const api = getApi()
    return api?.config.listAgents(projectDir)
  }, [])

  const listCommands = useCallback(async (projectDir?: string) => {
    const api = getApi()
    return api?.config.listCommands(projectDir)
  }, [])

  const getSettings = useCallback(async (scope: string, projectDir?: string) => {
    const api = getApi()
    return api?.config.getSettings(scope, projectDir)
  }, [])

  const saveSettings = useCallback(async (scope: string, data: any, projectDir?: string) => {
    const api = getApi()
    return api?.config.saveSettings(scope, data, projectDir)
  }, [])

  const getHooks = useCallback(async (scope: string, projectDir?: string) => {
    const api = getApi()
    return api?.config.getHooks(scope, projectDir)
  }, [])

  const saveHooks = useCallback(async (hooks: any, scope: string, projectDir?: string) => {
    const api = getApi()
    return api?.config.saveHooks(hooks, scope, projectDir)
  }, [])

  const getMcpServers = useCallback(async (scope: string, projectDir?: string) => {
    const api = getApi()
    return api?.config.getMcpServers(scope, projectDir)
  }, [])

  return {
    initialize,
    readFile,
    writeFile,
    listSkills,
    listAgents,
    listCommands,
    getSettings,
    saveSettings,
    getHooks,
    saveHooks,
    getMcpServers,
  }
}
