'use strict'

exports.config = {
  application_logging: {
    forwarding: {
      enabled: true,
    },
  },

  logging: {
    level: 'info',
  },

  allow_all_headers: false,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },
}
