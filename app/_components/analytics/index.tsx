import Script from 'next/script'
import { FC } from 'react'

export const GoogleAnalytics: FC<{
  measurementId: string | undefined
  isProduction: boolean
}> = ({ measurementId, isProduction }) => {
  if (!isProduction || !measurementId) {
    return null
  }

  return (
    <>
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', ${measurementId});
        `}
      </Script>
    </>
  )
}
