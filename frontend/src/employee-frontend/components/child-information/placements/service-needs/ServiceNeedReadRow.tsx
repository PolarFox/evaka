// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import type { Action } from 'lib-common/generated/action'
import type { ServiceNeed } from 'lib-common/generated/api-types/serviceneed'
import Tooltip from 'lib-components/atoms/Tooltip'
import { Td, Tr } from 'lib-components/layout/Table'

import { useTranslation } from '../../../../state/i18n'
import Toolbar from '../../../common/Toolbar'

interface ServiceNeedReadRowProps {
  serviceNeed: ServiceNeed
  permittedActions: Action.ServiceNeed[]
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}

function ServiceNeedReadRow({
  serviceNeed,
  permittedActions,
  onEdit,
  onDelete,
  disabled
}: ServiceNeedReadRowProps) {
  const { i18n } = useTranslation()
  return (
    <Tr data-qa="service-need-row">
      <Td>
        {serviceNeed.startDate.format()} - {serviceNeed.endDate.format()}
      </Td>
      <Td data-qa="service-need-name">{serviceNeed.option.nameFi}</Td>
      <Td>{serviceNeed.shiftCare ? i18n.common.yes : i18n.common.no}</Td>
      <Td>
        <Tooltip tooltip={<span>{serviceNeed.confirmed?.name}</span>}>
          {serviceNeed.confirmed?.at?.format() ?? ''}
        </Tooltip>
      </Td>
      <Td>
        <Toolbar
          dateRange={serviceNeed}
          onEdit={onEdit}
          editable={permittedActions.includes('UPDATE')}
          onDelete={onDelete}
          deletable={permittedActions.includes('DELETE')}
          disableAll={disabled}
        />
      </Td>
    </Tr>
  )
}

export default ServiceNeedReadRow
