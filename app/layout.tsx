import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from './ClientLayout'
import Script from 'next/script'
import { GoogleAnalytics } from './_components/analytics'
import { Provider as RollbarProvider } from '@rollbar/react'
import { clientConfig } from '@/utils/rollbar'
import newrelic from 'newrelic'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Japan Visa Predictions',
  description:
    'A modern platform providing predictive analytics for visa application processing timelines in Japan. Featuring interactive charts and user-friendly input fields for precise and personalized insights.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/metadata/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Japan Visa Predictions',
    description:
      'Predictive analytics for visa application processing timelines in Japan.',
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    siteName: 'Japan Visa Predictions',
    images: [
      {
        url: '/metadata/og-image.png',
        width: 1200,
        height: 630,
        alt: 'A predictive analytics chart showing visa timelines',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID
const isProduction = process.env.NODE_ENV === 'production'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if ((newrelic as any).agent.collector.isConnected() === false) {
    await new Promise((resolve) => {
      ;(newrelic as any).agent.on('connected', resolve)
    })
  }

  const browserTimingHeader = newrelic.getBrowserTimingHeader({
    hasToRemoveScriptWrapper: true,
    allowTransactionlessInjection: true,
  })

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
          {isProduction && (
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
