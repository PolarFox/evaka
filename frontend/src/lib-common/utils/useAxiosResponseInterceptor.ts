// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { AxiosError } from 'axios'
import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { useEffect } from 'react'

export function useAxiosResponseInterceptor(
  client: AxiosInstance,
  onSuccess: (res: AxiosResponse) => void,
  onError?: (res: AxiosError) => void
) {
  useEffect(() => {
    const id = client.interceptors.response.use(
      (res) => {
        onSuccess(res)
        return res
      },
      (err: unknown) => {
        if (onError && axios.isAxiosError(err)) {
          onError(err)
        }
        return Promise.reject(err)
      }
    )
    return () => {
      client.interceptors.response.eject(id)
    }
  }, [client.interceptors.response, onError, onSuccess])
}
