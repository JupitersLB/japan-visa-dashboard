import { PHASE_PRODUCTION_BUILD } from 'next/constants'

type NewRelicAgent = {
  collector?: {
    isConnected?: () => boolean
  }
  on?: (event: 'connected', callback: () => void) => void
}

type NewRelicRuntime = {
  agent?: NewRelicAgent
  getBrowserTimingHeader: (options: {
    hasToRemoveScriptWrapper: boolean
    allowTransactionlessInjection: boolean
  }) => string
}

const connectTimeoutMs = 1000

export const isNewRelicBrowserTimingEnabled =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD &&
  Boolean(process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_APP_NAME)

const waitForConnection = async (agent: NewRelicAgent) => {
  if (
    !agent.collector?.isConnected ||
    agent.collector.isConnected() !== false ||
    !agent.on
  ) {
    return
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      agent.on?.('connected', resolve)
    }),
    new Promise<void>((resolve) => {
      setTimeout(resolve, connectTimeoutMs)
    }),
  ])
}

const loadNewRelic = async () => {
  const newrelic = await import('newrelic')
  return newrelic.default as unknown as NewRelicRuntime
}

export const getNewRelicBrowserTimingHeader = async () => {
  if (!isNewRelicBrowserTimingEnabled) return ''

  const newrelic = await loadNewRelic()
  if (newrelic.agent) {
    await waitForConnection(newrelic.agent)
  }

  return newrelic.getBrowserTimingHeader({
    hasToRemoveScriptWrapper: true,
    allowTransactionlessInjection: true,
  })
}
