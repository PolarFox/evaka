// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useMemo, createContext } from 'react'

import type { AdRole, User } from 'lib-common/api-types/employee-auth'

export interface UserState {
  loggedIn: boolean
  user: User | undefined
  roles: AdRole[]
}

export const UserContext = createContext<UserState>({
  loggedIn: false,
  user: undefined,
  roles: []
})

export const UserContextProvider = React.memo(function UserContextProvider({
  children,
  user,
  roles
}: {
  children: JSX.Element
  user: User | undefined
  roles: AdRole[] | undefined
}) {
  const value = useMemo(
    () => ({
      loggedIn: !!user,
      user,
      roles: (user && roles) ?? []
    }),
    [user, roles]
  )
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
})
