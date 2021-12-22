// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useState } from 'react'
import styled from 'styled-components'
import { Gap } from 'lib-components/white-space'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import { fontWeights } from 'lib-components/typography'
import { useTranslation } from '../../state/i18n'
import StickyActionBar from '../common/StickyActionBar'
import { deleteInvoices } from '../../api/invoicing'
import { InvoiceStatus } from '../../types/invoicing'
import { InvoicesActions } from './invoices-state'
import colors from 'lib-customizations/common'

const ErrorMessage = styled.div`
  color: ${colors.accents.dangerRed};
`

const CheckedRowsInfo = styled.div`
  color: ${colors.greyscale.medium};
  font-style: italic;
  font-weight: ${fontWeights.bold};
`

type Props = {
  actions: InvoicesActions
  reloadInvoices: () => void
  status: InvoiceStatus
  checkedInvoices: Record<string, true>
  checkedAreas: string[]
  allInvoicesToggle: boolean
}

const Actions = React.memo(function Actions({
  actions,
  reloadInvoices,
  status,
  checkedInvoices,
  checkedAreas,
  allInvoicesToggle
}: Props) {
  const { i18n } = useTranslation()
  const [error, setError] = useState<string>()
  const checkedIds = Object.keys(checkedInvoices)

  return status === 'DRAFT' ? (
    <StickyActionBar align={'right'}>
      {error ? (
        <>
          <ErrorMessage>{error}</ErrorMessage>
          <Gap size="s" horizontal />
        </>
      ) : null}
      {checkedIds.length > 0 ? (
        <>
          <CheckedRowsInfo>
            {i18n.invoices.buttons.checked(checkedIds.length)}
          </CheckedRowsInfo>
          <Gap size="s" horizontal />
        </>
      ) : null}
      <AsyncButton
        text={i18n.invoices.buttons.deleteInvoice(checkedIds.length)}
        disabled={checkedIds.length === 0}
        onClick={() =>
          deleteInvoices(checkedIds).then((result) => {
            if (result.isSuccess) {
              setError(undefined)
            }

            if (result.isFailure) {
              setError(i18n.common.error.unknown)
            }

            return result
          })
        }
        onSuccess={() => {
          actions.clearChecked()
          reloadInvoices()
        }}
        data-qa="delete-invoices"
      />
      <Gap size="s" horizontal />
      <Button
        primary
        disabled={
          (!allInvoicesToggle && checkedIds.length === 0) ||
          (allInvoicesToggle && checkedAreas.length === 0)
        }
        text={i18n.invoices.buttons.sendInvoice(checkedIds.length)}
        onClick={actions.openModal}
        data-qa="open-send-invoices-dialog"
      />
    </StickyActionBar>
  ) : null
})

export default Actions
