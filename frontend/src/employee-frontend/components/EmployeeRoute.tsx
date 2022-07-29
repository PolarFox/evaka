// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import type { TitleState } from '../state/title'
import { TitleContext } from '../state/title'
import { UserContext } from '../state/user'

interface Props {
  title?: string
  requireAuth?: boolean
  children?: React.ReactNode
}

export default React.memo(function EmployeeRoute({
  title,
  requireAuth = true,
  children
}: Props) {
  const { setTitle } = useContext<TitleState>(TitleContext)

  useEffect(() => {
    if (title) setTitle(title)
  }, [setTitle, title])

  return requireAuth ? <RequireAuth element={children} /> : <>{children}</>
})

const RequireAuth = React.memo(function EnsureAuthenticated({
  element
}: {
  element: React.ReactNode
}) {
  const { loggedIn } = useContext(UserContext)
  return loggedIn ? <>{element}</> : <Navigate replace to="/" />
})
