// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Translations } from 'citizen-frontend/localization'
import type { Child } from 'lib-common/generated/api-types/children'
import type { ReservationChild } from 'lib-common/generated/api-types/reservations'
import type { UUID } from 'lib-common/types'

const toDuplicatedChildIds = (children: Array<Child | ReservationChild>) =>
  children.flatMap((child) =>
    child.duplicateOf !== null ? [child.id, child.duplicateOf] : []
  )

const formatDuplicatedChildIdentifier = (
  t: Translations,
  child: Child | ReservationChild,
  format: 'short' | 'long' = 'short'
) =>
  child.upcomingPlacementType === 'PRESCHOOL'
    ? t.common.duplicatedChild.identifier.PRESCHOOL[format]
    : t.common.duplicatedChild.identifier.DAYCARE[format]

export function getDuplicateChildInfo(
  children: Array<Child | ReservationChild>,
  i18n: Translations,
  format: 'short' | 'long' = 'short'
): Record<UUID, string> {
  const duplicatedChildIds = toDuplicatedChildIds(children)
  return children.reduce<Record<UUID, string>>((data, child) => {
    if (duplicatedChildIds.includes(child.id)) {
      data[child.id] = formatDuplicatedChildIdentifier(i18n, child, format)
    }
    return data
  }, {})
}
