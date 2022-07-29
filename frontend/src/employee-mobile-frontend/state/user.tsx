// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { createContext, useEffect, useMemo } from 'react'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type { MobileUser } from 'lib-common/api-types/employee-auth'
import { idleTracker } from 'lib-common/utils/idleTracker'
import { useApiState } from 'lib-common/utils/useRestApi'

import { getAuthStatus } from '../api/auth'
import { client } from '../api/client'
import { renderResult } from '../components/async-rendering'

export interface UserState {
  apiVersion: string | undefined
  loggedIn: boolean
  user: Result<MobileUser | null>
  refreshAuthStatus: () => void
}

export const UserContext = createContext<UserState>({
  apiVersion: undefined,
  loggedIn: false,
  user: Loading.of(),
  refreshAuthStatus: () => null
})

export const UserContextProvider = React.memo(function UserContextProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [authStatus, refreshAuthStatus] = useApiState(getAuthStatus, [])

  useEffect(
    () => idleTracker(client, refreshAuthStatus, { thresholdInMinutes: 20 }),
    [refreshAuthStatus]
  )

  const value = useMemo(
    () => ({
      apiVersion: authStatus.map((a) => a.apiVersion).getOrElse(undefined),
      loggedIn: authStatus.map((a) => a.loggedIn).getOrElse(false),
      user: authStatus.map((a) => a.user ?? null),
      refreshAuthStatus
    }),
    [authStatus, refreshAuthStatus]
  )
  return (
    <UserContext.Provider value={value}>
      {renderResult(authStatus, () => (
        <>{children}</>
      ))}
    </UserContext.Provider>
  )
})
