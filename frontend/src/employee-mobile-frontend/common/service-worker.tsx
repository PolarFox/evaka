// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import * as Sentry from '@sentry/browser'
import { differenceInDays } from 'date-fns'
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { UUID } from 'lib-common/types'
import { mockNow } from 'lib-common/utils/helpers'

import { upsertPushSubscription } from '../auth/api'
import { UserContext } from '../auth/state'

interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | undefined
  pushNotifications: PushNotifications | undefined
}

export const ServiceWorkerContext = createContext<ServiceWorkerState>({
  registration: undefined,
  pushNotifications: undefined
})

export const ServiceWorkerContextProvider = React.memo(
  function ServiceWorkerContextProvider({
    children
  }: {
    children: JSX.Element
  }) {
    const user = useContext(UserContext).user.getOrElse(undefined)

    const [registration, setRegistration] =
      useState<ServiceWorkerRegistration>()

    const pushManager = useMemo(
      () =>
        registration && 'pushManager' in registration
          ? registration.pushManager
          : undefined,
      [registration]
    )

    const pushNotifications = useMemo(() => {
      if (!user?.pushApplicationServerKey) return undefined
      if (!pushManager) return undefined
      return new PushNotifications(user.id, pushManager, {
        userVisibleOnly: true,
        applicationServerKey: user.pushApplicationServerKey
      })
    }, [user?.pushApplicationServerKey, user?.id, pushManager])

    useEffect(() => {
      registerServiceWorker()
        .then(setRegistration)
        .catch((err) => {
          Sentry.captureException(err)
        })
    }, [])

    useEffect(() => {
      if (pushNotifications) {
        pushNotifications.enable().catch((err) => Sentry.captureException(err))
      } else if (pushManager) {
        unsubscribe(pushManager).catch((err) => Sentry.captureException(err))
      }
    }, [pushNotifications, pushManager])

    const value = { registration, pushNotifications }

    return (
      <ServiceWorkerContext.Provider value={value}>
        {children}
      </ServiceWorkerContext.Provider>
    )
  }
)

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/employee/mobile/service-worker.js')
    return await navigator.serviceWorker.ready
  } else {
    return undefined
  }
}

export class PushNotifications {
  constructor(
    private device: UUID,
    private pushManager: PushManager,
    private options: PushSubscriptionOptionsInit
  ) {}

  async enable() {
    const sub = await this.refreshSubscription()
    const authSecret = sub?.getKey('auth')
    const ecdhKey = sub?.getKey('p256dh')
    if (sub && authSecret && ecdhKey) {
      await upsertPushSubscription(this.device, {
        endpoint: sub.endpoint,
        expires: sub.expirationTime
          ? HelsinkiDateTime.fromSystemTzDate(new Date(sub.expirationTime))
          : null,
        authSecret: Array.from(new Uint8Array(authSecret)),
        ecdhKey: Array.from(new Uint8Array(ecdhKey))
      })
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }
    switch (Notification.permission) {
      case 'granted':
        return true
      case 'denied':
        return false
      default:
        break
    }
    // support both legacy callback-based API and modern Promise API
    const result = await new Promise<NotificationPermission>(
      (resolve, reject) =>
        Notification.requestPermission(resolve)?.then(resolve, reject)
    )
    return result === 'granted'
  }

  private async refreshSubscription(): Promise<PushSubscription | undefined> {
    if (!(await this.requestPermission())) return undefined
    const state = await this.pushManager.permissionState(this.options)
    if (state !== 'granted' && state !== 'prompt') {
      return undefined
    }
    const sub = await this.pushManager.getSubscription()
    if (sub) {
      const now = mockNow() ?? new Date()
      const expiringSoon = sub.expirationTime
        ? differenceInDays(now, sub.expirationTime) < 7
        : false
      if (!expiringSoon) {
        return sub
      }
      await sub.unsubscribe()
    }
    return await this.pushManager.subscribe(this.options)
  }
}

async function unsubscribe(pushManager: PushManager): Promise<void> {
  const sub = await pushManager.getSubscription()
  await sub?.unsubscribe()
}
