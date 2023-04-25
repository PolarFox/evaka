// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

export interface CaretakersResponse {
  unitName: string
  groupName: string
  caretakers: CaretakerAmount[]
}

export interface CaretakerAmount {
  id: UUID
  groupId: UUID
  startDate: LocalDate
  endDate: LocalDate | null
  amount: number
}
