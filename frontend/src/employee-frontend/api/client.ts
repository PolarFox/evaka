// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { AxiosError } from 'axios'
import axios from 'axios'

import { isAutomatedTest, mockNow } from 'lib-common/utils/helpers'

export const API_URL = '/api/internal'

export const client = axios.create({
  baseURL: API_URL,
  xsrfCookieName: 'evaka.employee.xsrf'
})

if (isAutomatedTest) {
  client.interceptors.request.use((config) => {
    const evakaMockedTime = mockNow()?.toISOString()
    if (evakaMockedTime) {
      config.headers = { ...config.headers, EvakaMockedTime: evakaMockedTime }
    }
    return config
  })
}

client.interceptors.response.use(undefined, async (err: AxiosError) => {
  if (err.response && err.response.status == 401) {
    window.location.replace('/employee/login')
  }

  return Promise.reject(err)
})
