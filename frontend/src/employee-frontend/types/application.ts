// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type {
  ApplicationAttachment,
  ApplicationDetails
} from 'lib-common/api-types/application/ApplicationDetails'
import type { Action } from 'lib-common/generated/action'
import type { Decision } from 'lib-common/generated/api-types/decision'
import type { PersonJSON } from 'lib-common/generated/api-types/pis'

import type { VoucherApplicationFilter } from '../state/application-ui'

export interface ApplicationResponse {
  application: ApplicationDetails
  decisions: Decision[]
  guardians: PersonJSON[]
  attachments: ApplicationAttachment[]
  permittedActions: Set<Action.Application>
}

export interface ApplicationSearchParams {
  area?: string
  units?: string
  basis?: string
  type: string
  preschoolType?: string
  status?: string
  dateType?: string
  distinctions?: string
  periodStart?: string
  periodEnd?: string
  searchTerms?: string
  transferApplications?: string
  voucherApplications: VoucherApplicationFilter
}

export type ApplicationSummaryStatus =
  | 'SENT'
  | 'WAITING_PLACEMENT'
  | 'WAITING_DECISION'
  | 'WAITING_UNIT_CONFIRMATION'
  | 'WAITING_MAILING'
  | 'WAITING_CONFIRMATION'
  | 'REJECTED'
  | 'ACTIVE'
  | 'CANCELLED'
