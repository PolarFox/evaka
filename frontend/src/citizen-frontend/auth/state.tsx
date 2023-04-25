// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { ReactNode } from 'react'
import React, { createContext, useContext, useEffect, useMemo } from 'react'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type {
  CitizenUserDetails,
  UserDetailsResponse
} from 'lib-common/api-types/vtjclient'
import { idleTracker } from 'lib-common/utils/idleTracker'
import { useApiState } from 'lib-common/utils/useRestApi'

import { client } from '../api-client'

import { getAuthStatus } from './api'

export interface User extends CitizenUserDetails {
  authLevel: 'STRONG' | 'WEAK'
}

export interface StrongUser extends User {
  socialSecurityNumber: string
}

type AuthState = {
  apiVersion: string | undefined
  user: Result<User | undefined>
  fullUserResponse: Result<UserDetailsResponse | undefined>
  refreshAuthStatus: () => void
}

const defaultState: AuthState = {
  apiVersion: undefined,
  user: Loading.of(),
  fullUserResponse: Loading.of(),
  refreshAuthStatus: () => undefined
}

export const AuthContext = createContext<AuthState>(defaultState)

export const AuthContextProvider = React.memo(function AuthContextProvider({
  children
}: {
  children: ReactNode
}) {
  const [authStatus, refreshAuthStatus] = useApiState(getAuthStatus, [])

  useEffect(
    () => idleTracker(client, refreshAuthStatus, { thresholdInMinutes: 20 }),
    [refreshAuthStatus]
  )

  const value = useMemo(
    () => ({
      apiVersion: authStatus.map((a) => a.apiVersion).getOrElse(undefined),
      user: authStatus.map((a) =>
        a.loggedIn
          ? { ...a.user.details, authLevel: a.user.authLevel }
          : undefined
      ),
      fullUserResponse: authStatus.map((a) =>
        a.loggedIn ? a.user : undefined
      ),
      refreshAuthStatus
    }),
    [authStatus, refreshAuthStatus]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
})

export const useUser = (): User | undefined => {
  const authContext = useContext(AuthContext)
  const full = authContext.fullUserResponse.getOrElse(undefined)
  return useMemo(
    () => full && { ...full.details, authLevel: full.authLevel },
    [full]
  )
}

export const useStrongUser = (): StrongUser | undefined => {
  const authContext = useContext(AuthContext)
  const user = authContext.fullUserResponse.getOrElse(undefined)

  return useMemo(
    () =>
      user?.authLevel === 'STRONG'
        ? {
            ...user.details,
            socialSecurityNumber: user.socialSecurityNumber,
            authLevel: 'STRONG'
          }
        : undefined,
    [user]
  )
}
