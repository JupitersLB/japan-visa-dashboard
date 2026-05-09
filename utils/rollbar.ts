import Rollbar from 'rollbar'

const isProduction = process.env.NODE_ENV === 'production'
const clientAccessToken = process.env.NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN
const serverAccessToken = process.env.ROLLBAR_SERVER_TOKEN

const baseConfig = {
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NODE_ENV,
}

export const clientConfig = {
  accessToken: clientAccessToken,
  enabled: isProduction && Boolean(clientAccessToken),
  ...baseConfig,
}

export const serverInstance = new Rollbar({
  accessToken: serverAccessToken,
  enabled: isProduction && Boolean(serverAccessToken),
  ...baseConfig,
})
