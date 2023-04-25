// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { AxiosError } from 'axios'
import axios from 'axios'

import { isAutomatedTest, mockNow } from 'lib-common/utils/helpers'

export const API_URL = '/api/application'

export const client = axios.create({
  baseURL: API_URL
})

if (isAutomatedTest) {
  client.interceptors.request.use((config) => {
    const mockedTime = mockNow()?.toISOString()
    if (mockedTime) {
      return {
        ...config,
        headers: {
          ...config.headers,
          EvakaMockedTime: mockedTime
        }
      }
    }
    return config
  })
}

client.interceptors.response.use(undefined, async (err: AxiosError) => {
  if (err.response && err.response.status == 401) {
    window.location.replace('/')
  }

  return Promise.reject(err)
})
