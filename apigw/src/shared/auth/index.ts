// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { concat } from 'lodash'
import { NextFunction, Request, Response } from 'express'
import { logAuditEvent } from '../logging'
import { gatewayRole } from '../config'
import { createJwt } from './jwt'
import { SamlUser } from '../routes/auth/saml/types'

const auditEventGatewayId =
  (gatewayRole === 'enduser' && 'eugw') ||
  (gatewayRole === 'internal' && 'ingw') ||
  (gatewayRole === undefined && 'devgw')

export function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.id) {
    logAuditEvent(
      `evaka.${auditEventGatewayId}.auth.not_found`,
      req,
      'Could not find user'
    )
    res.sendStatus(401)
    return
  }
  return next()
}

export function createAuthHeader(user: SamlUser): string {
  const roles =
    user.roles ?? concat(user.globalRoles ?? [], user.allScopedRoles ?? [])
  const token = createJwt({
    kind: gatewayRole === 'enduser' ? 'SuomiFI' : 'AD',
    sub: user.id,
    scope: roles
      .map((role) => (role.startsWith('ROLE_') ? role : `ROLE_${role}`))
      .join(' ')
  })
  return `Bearer ${token}`
}
