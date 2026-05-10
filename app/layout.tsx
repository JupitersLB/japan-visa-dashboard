import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from './ClientLayout'
import Script from 'next/script'
import { GoogleAnalytics } from './_components/analytics'
import { Provider as RollbarProvider } from '@rollbar/react'
import { clientConfig } from '@/utils/rollbar'
import newrelic from 'newrelic'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

type NewRelicAgent = {
  collector?: {
    isConnected?: () => boolean
  }
  on?: (event: 'connected', callback: () => void) => void
}

type NewRelicRuntime = {
  agent?: NewRelicAgent
}

const siteUrl = (() => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  if (/^https?:\/\//.test(configuredUrl)) return configuredUrl
  return `http://${configuredUrl}`
})()

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Japan Visa Predictions',
  description:
    'A modern platform providing predictive analytics for visa application processing timelines in Japan. Featuring interactive charts and user-friendly input fields for precise and personalized insights.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Japan Visa Predictions',
    description:
      'Predictive analytics for visa application processing timelines in Japan.',
    url: siteUrl,
    siteName: 'Japan Visa Predictions',
    locale: 'en_US',
    type: 'website',
  },
}

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID
const isProduction = process.env.NODE_ENV === 'production'
const isProductionBuild = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
const isNewRelicEnabled =
  isProduction &&
  !isProductionBuild &&
  Boolean(process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_APP_NAME)
const NEW_RELIC_CONNECT_TIMEOUT_MS = 1000

const waitForNewRelicConnection = async (agent: NewRelicAgent) => {
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
      setTimeout(resolve, NEW_RELIC_CONNECT_TIMEOUT_MS)
    }),
  ])
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (isNewRelicEnabled) {
    const newrelicAgent = (newrelic as unknown as NewRelicRuntime).agent
    if (newrelicAgent) {
      await waitForNewRelicConnection(newrelicAgent)
    }
  }

  const browserTimingHeader = isNewRelicEnabled
    ? newrelic.getBrowserTimingHeader({
        hasToRemoveScriptWrapper: true,
        allowTransactionlessInjection: true,
      })
    : ''

  return (
    <RollbarProvider config={clientConfig}>
      <html lang="en">
        <head>
          {isProduction && (
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
              strategy="afterInteractive"
            />
          )}
        </head>

        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <GoogleAnalytics
            measurementId={GA_TRACKING_ID}
            isProduction={isProduction}
          />
          <ClientLayout>{children}</ClientLayout>
          {isNewRelicEnabled && (
            <Script
              id="nr-browser-agent"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{ __html: browserTimingHeader }}
            />
          )}
        </body>
      </html>
    </RollbarProvider>
  )
}
