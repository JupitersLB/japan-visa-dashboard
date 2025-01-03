import Rollbar from 'rollbar'

const isProduction = process.env.NODE_ENV === 'production'

const baseConfig = {
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NODE_ENV,
  enabled: isProduction,
}

export const clientConfig = {
  accessToken: process.env.NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN,
  ...baseConfig,
}

export const serverInstance = new Rollbar({
  accessToken: process.env.ROLLBAR_SERVER_TOKEN,
  ...baseConfig,
})
