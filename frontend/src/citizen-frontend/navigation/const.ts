// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { User } from '../auth/state'

export const getWeakLoginUri = (path?: string) =>
  `/api/application/auth/evaka-customer/login?RelayState=${encodeURIComponent(
    path ?? window.location.pathname
  )}`

export const getStrongLoginUri = (path?: string) =>
  getStrongLoginUriWithPath(
    `${path ?? window.location.pathname}${window.location.search}${
      window.location.hash
    }`
  )

export const getStrongLoginUriWithPath = (path: string) =>
  `/api/application/auth/saml/login?RelayState=${encodeURIComponent(path)}`

export const getLogoutUri = (user: User) =>
  `/api/application/auth/${
    user?.authLevel === 'WEAK' ? 'evaka-customer' : 'saml'
  }/logout`

export const headerHeightDesktop = 80
export const headerHeightMobile = 60
export const mobileBottomNavHeight = 60
