// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import cookieParser from 'cookie-parser'
import express, { Router } from 'express'
import helmet from 'helmet'
import nocache from 'nocache'
import passport from 'passport'
import { requireAuthentication } from '../shared/auth'
import createAdSamlStrategy from '../shared/auth/ad-saml'
import createEvakaSamlStrategy from '../shared/auth/keycloak-saml'
import { cookieSecret, enableDevApi, nodeEnv } from '../shared/config'
import setupLoggingMiddleware from '../shared/logging'
import { csrf, csrfCookie } from '../shared/middleware/csrf'
import { errorHandler } from '../shared/middleware/error-handler'
import tracing from '../shared/middleware/tracing'
import { createProxy } from '../shared/proxy-utils'
import { createRedisClient } from '../shared/redis-client'
import { trustReverseProxy } from '../shared/reverse-proxy'
import createSamlRouter from '../shared/routes/auth/saml'
import csp from '../shared/routes/csp'
import session, { refreshLogoutToken } from '../shared/session'
import mobileDeviceSession, {
  devApiE2ESignup,
  refreshMobileSession
} from './mobile-device-session'
import authStatus from './routes/auth-status'

const app = express()
// TODO: How to make this more easily injectable/overridable in tests?
const redisClient = nodeEnv !== 'test' ? createRedisClient() : undefined
trustReverseProxy(app)
app.set('etag', false)
app.use(nocache())
app.use(
  helmet({
    // Content-Security-Policy is set by the nginx proxy
    contentSecurityPolicy: false
  })
)
app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }))
app.use(tracing)
app.use(express.json({ limit: '8mb' }))
app.use(session('employee', redisClient))
app.use(cookieParser(cookieSecret))
app.use(passport.initialize())
app.use(passport.session())
passport.serializeUser<Express.User>((user, done) => done(null, user))
passport.deserializeUser<Express.User>((user, done) => done(null, user))
app.use(refreshLogoutToken('employee'))
setupLoggingMiddleware(app)

app.use('/api/csp', csp)

function scheduledApiRouter() {
  const router = Router()
  router.all('*', (req, res) => res.sendStatus(404))
  return router
}

function internalApiRouter() {
  const router = Router()
  router.use('/scheduled', scheduledApiRouter())
  router.all('/system/*', (req, res) => res.sendStatus(404))

  router.all('/auth/*', (req: express.Request, res, next) => {
    if (req.session?.logoutToken?.idpProvider === 'evaka') {
      req.url = req.url.replace('saml', 'evaka')
    }
    next()
  })

  router.use(
    createSamlRouter({
      strategyName: 'ead',
      strategy: createAdSamlStrategy(redisClient),
      sessionType: 'employee',
      pathIdentifier: 'saml'
    })
  )

  router.use(
    createSamlRouter({
      strategyName: 'evaka',
      strategy: createEvakaSamlStrategy(redisClient),
      sessionType: 'employee',
      pathIdentifier: 'evaka'
    })
  )

  if (enableDevApi) {
    router.use(
      '/dev-api',
      createProxy({ path: ({ path }) => `/dev-api${path}` })
    )

    router.get('/auth/mobile-e2e-signup', devApiE2ESignup)
  }

  router.post('/auth/mobile', mobileDeviceSession)
  router.get(
    '/auth/status',
    refreshMobileSession,
    csrf,
    csrfCookie('employee'),
    authStatus
  )
  router.all('/public/*', createProxy())
  router.use(requireAuthentication)
  router.use(csrf)
  router.post(
    '/attachments/applications/:applicationId',
    createProxy({ multipart: true })
  )
  router.use(createProxy())
  return router
}

app.use('/api/internal', internalApiRouter())
app.use(errorHandler(true))

export default app
