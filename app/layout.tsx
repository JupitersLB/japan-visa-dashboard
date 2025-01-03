import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from './ClientLayout'
import Script from 'next/script'
import { GoogleAnalytics } from './_components/analytics'
import { Provider as RollbarProvider } from '@rollbar/react'
import { clientConfig } from '@/utils/rollbar'

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
}

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID
const isProduction = process.env.NODE_ENV === 'production'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        </body>
      </html>
    </RollbarProvider>
  )
}
