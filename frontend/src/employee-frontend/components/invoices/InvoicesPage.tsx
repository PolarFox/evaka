// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import React, { useState } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import LocalDate from 'lib-common/local-date'
import { Container, ContentArea } from 'lib-components/layout/Container'
import { DatePickerDeprecated } from 'lib-components/molecules/DatePickerDeprecated'
import { AlertBox } from 'lib-components/molecules/MessageBoxes'
import { AsyncFormModal } from 'lib-components/molecules/modals/FormModal'
import { Label } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'

import { useTranslation } from '../../state/i18n'

import Actions from './Actions'
import InvoiceFilters from './InvoiceFilters'
import Invoices from './Invoices'
import type { InvoicesActions } from './invoices-state'
import { useInvoicesState } from './invoices-state'

export default React.memo(function InvoicesPage() {
  const {
    actions,
    state: {
      page,
      invoices,
      invoiceTotals,
      sortBy,
      sortDirection,
      checkedInvoices,
      allInvoicesToggle,
      showModal
    },
    searchFilters,
    reloadInvoices,
    refreshInvoices,
    sendInvoices,
    onSendSuccess
  } = useInvoicesState()

  return (
    <Container data-qa="invoices-page">
      <ContentArea opaque>
        <InvoiceFilters />
      </ContentArea>
      <Gap size="XL" />
      <ContentArea opaque>
        <Invoices
          actions={actions}
          invoices={invoices[page]}
          refreshInvoices={refreshInvoices}
          total={invoiceTotals?.total}
          pages={invoiceTotals?.pages}
          currentPage={page}
          sortBy={sortBy}
          sortDirection={sortDirection}
          showCheckboxes={
            searchFilters.status === 'DRAFT' ||
            searchFilters.status === 'WAITING_FOR_SENDING'
          }
          checked={checkedInvoices}
          allInvoicesToggle={allInvoicesToggle}
          allInvoicesToggleDisabled={searchFilters.area.length < 1}
        />
      </ContentArea>
      <Actions
        actions={actions}
        reloadInvoices={reloadInvoices}
        status={searchFilters.status}
        checkedInvoices={checkedInvoices}
        checkedAreas={searchFilters.area}
        allInvoicesToggle={allInvoicesToggle}
      />
      {showModal ? (
        <Modal
          actions={actions}
          onSendDone={onSendSuccess}
          sendInvoices={sendInvoices}
          allInvoicesToggle={allInvoicesToggle}
        />
      ) : null}
    </Container>
  )
})

const Modal = React.memo(function Modal({
  actions,
  onSendDone,
  sendInvoices,
  allInvoicesToggle
}: {
  actions: InvoicesActions
  onSendDone: () => void
  sendInvoices: (args: {
    invoiceDate: LocalDate
    dueDate: LocalDate
  }) => Promise<Result<void>>
  allInvoicesToggle: boolean
}) {
  const { i18n } = useTranslation()
  const [invoiceDate, setInvoiceDate] = useState(LocalDate.todayInSystemTz())
  const [dueDate, setDueDate] = useState(
    LocalDate.todayInSystemTz().addBusinessDays(10)
  )

  return (
    <AsyncFormModal
      type="info"
      title={i18n.invoices.sendModal.title}
      icon={faEnvelope}
      resolveAction={() => sendInvoices({ invoiceDate, dueDate })}
      resolveLabel={i18n.common.confirm}
      onSuccess={onSendDone}
      rejectAction={actions.closeModal}
      rejectLabel={i18n.common.cancel}
      data-qa="send-invoices-dialog"
    >
      <ModalContent>
        <Label>{i18n.invoices.sendModal.invoiceDate}</Label>
        <div>
          <DatePickerDeprecated
            date={invoiceDate}
            onChange={setInvoiceDate}
            type="full-width"
            data-qa="invoice-date-input"
          />
        </div>
        <Gap size="s" />
        <Label>{i18n.invoices.sendModal.dueDate}</Label>
        <div>
          <DatePickerDeprecated
            date={dueDate}
            onChange={setDueDate}
            type="full-width"
            data-qa="invoice-due-date-input"
          />
        </div>
        {!allInvoicesToggle && i18n.invoices.buttons.individualSendAlertText ? (
          <>
            <Gap size="s" />
            <AlertBox
              message={i18n.invoices.buttons.individualSendAlertText}
              thin
            />
          </>
        ) : null}
      </ModalContent>
    </AsyncFormModal>
  )
})

const ModalContent = styled.div`
  align-self: flex-start;
  margin-left: 4rem;
  margin-right: 4rem;
`
