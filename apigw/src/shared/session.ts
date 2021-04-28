// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import connectRedis from 'connect-redis'
import {
  addMinutes,
  differenceInMinutes,
  differenceInSeconds,
  isDate
} from 'date-fns'
import express, { CookieOptions, Request } from 'express'
import session from 'express-session'
import { Profile, SAML } from 'passport-saml'
import { RedisClient } from 'redis'
import AsyncRedisClient from './async-redis-client'
import { cookieSecret, sessionTimeoutMinutes, useSecureCookies } from './config'
import { toMiddleware } from './express'
import { logDebug } from './logging'
import { fromCallback } from './promise-utils'

export type SessionType = 'enduser' | 'employee'

const RedisStore = connectRedis(session)

let asyncRedisClient: AsyncRedisClient | undefined

const sessionCookieOptions: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: 'lax'
}

function cookiePrefix(sessionType: SessionType) {
  return sessionType === 'enduser' ? 'evaka.eugw' : 'evaka.employee'
}

export function sessionCookie(sessionType: SessionType) {
  return `${cookiePrefix(sessionType)}.session`
}

export function refreshLogoutToken() {
  return toMiddleware(async (req) => {
    if (!req.session) return
    if (!req.session.logoutToken) return
    if (!isDate(req.session.cookie.expires)) return
    const sessionExpires = req.session.cookie.expires as Date
    const logoutExpires = new Date(req.session.logoutToken.expiresAt)
    // Logout token should always expire at least 30 minutes later than the session
    if (differenceInMinutes(logoutExpires, sessionExpires) < 30) {
      await saveLogoutToken(req, req.session.idpProvider)
    }
  })
}

function logoutKey(nameID: string, sessionIndex?: string) {
  return `slo:${nameID}:::${sessionIndex}`
}

async function tryParseProfile(
  req: Request,
  saml?: SAML
): Promise<Profile | null | undefined> {
  if (!saml) {
    logDebug('No SAML parser provided, skipping profile parsing from request')
    return
  }

  // NOTE: This duplicate parsing can be removed if passport-saml ever exposes
  // an alternative for passport.authenticate() that either lets us hook into
  // it before any redirects or separate XML parsing and authentication methods.
  if (req.query?.SAMLRequest) {
    // Redirects have signatures in the original query parameteru
    const dummyOrigin = 'http://evaka'
    const originalQuery = new URL(req.url, dummyOrigin).search.replace(
      /^\?/,
      ''
    )
    return await fromCallback<Profile | null | undefined>((cb) =>
      saml.validateRedirect(req.query, originalQuery, cb)
    )
  } else if (req.body?.SAMLRequest) {
    // POST logout callbacks have the signature in the message body directly
    return await fromCallback<Profile | null | undefined>((cb) =>
      saml.validatePostRequest(req.body, cb)
    )
  }
}

/**
 * Save a logout token for a user session to be consumed during logout.
 *
 * The token is generated by creating an effective secondary
 * index in Redis from SAML session identifiers (nameID and sessionIndex).
 * This token can then be used with LogoutRequests without relying
 * on 3rd party cookies which are starting to be disabled by default on many
 * browsers, enabling Single Logout.
 *
 * This token can be removed if this passport-saml issue is ever fixed:
 * https://github.com/node-saml/passport-saml/issues/419
 */
export async function saveLogoutToken(
  req: express.Request,
  strategyName: string | null | undefined
): Promise<void> {
  if (!req.session || !req.user?.nameID) return

  // Persist in session to allow custom logic per strategy
  req.session.idpProvider = strategyName

  if (!asyncRedisClient) return
  const key = logoutKey(req.user.nameID, req.user.sessionIndex)

  const now = new Date()
  const expires = addMinutes(now, sessionTimeoutMinutes + 60)
  const logoutToken = {
    expiresAt: expires.valueOf(),
    value: req.session.logoutToken?.value || key
  }
  req.session.logoutToken = logoutToken

  const ttlSeconds = differenceInSeconds(expires, now)
  // https://redis.io/commands/expire - Set a timeout on key
  // Return value:
  //   1 if the timeout was set
  //   0 if key does not exist.
  const ret = await asyncRedisClient.expire(key, ttlSeconds)
  if (ret === 1) return
  // https://redis.io/commands/set - Set key to hold the string value.
  // Options:
  //   EX seconds -- Set the specified expire time, in seconds.
  await asyncRedisClient.set(key, req.session.id, 'EX', ttlSeconds)
}

async function consumeLogoutRequest(
  req: express.Request,
  saml?: SAML
): Promise<void> {
  if (!asyncRedisClient) return

  const profile = await tryParseProfile(req, saml)
  // Prefer details from the SAML message (profile) but fall back to details
  // from the session in case a) this wasn't a SAMLRequest b) it's malformed
  // to ensure the logout token is deleted from the store even in non-SLO cases.
  const nameID = profile?.nameID ?? req.user?.nameID
  const sessionIndex = profile?.sessionIndex ?? req.user?.sessionIndex

  if (!nameID) {
    logDebug(
      "Can't consume logout request without a SAMLRequest or session cookie, ignoring"
    )
    return
  }

  const key = logoutKey(nameID, sessionIndex)
  const sid = await asyncRedisClient.get(key)
  if (sid) {
    // Ensure both session and logout keys are cleared in case no cookies were
    // available -> no req.session was available to be deleted.
    await asyncRedisClient.del(`sess:${sid}`, key)
  }
}

export async function logoutExpress(
  req: express.Request,
  res: express.Response,
  sessionType: SessionType,
  saml?: SAML
) {
  req.logout()
  await consumeLogoutRequest(req, saml)
  if (req.session) {
    const session = req.session
    await fromCallback((cb) => session.destroy(cb))
  }
  res.clearCookie(sessionCookie(sessionType))
}

export default (sessionType: SessionType, redisClient?: RedisClient) => {
  asyncRedisClient = redisClient && new AsyncRedisClient(redisClient)
  return session({
    cookie: {
      ...sessionCookieOptions,
      maxAge: sessionTimeoutMinutes * 60000
    },
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: cookieSecret,
    name: sessionCookie(sessionType),
    store: redisClient
      ? new RedisStore({
          client: redisClient
        })
      : new session.MemoryStore()
  })
}
