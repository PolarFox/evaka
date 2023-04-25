// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import type { Failure, Result } from 'lib-common/api'
import DateRange from 'lib-common/date-range'
import type { IncomeNotification } from 'lib-common/generated/api-types/invoicing'
import type { UUID } from 'lib-common/types'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { Gap } from 'lib-components/white-space'
import { faQuestion } from 'lib-icons'

import type { IncomeTypeOptions } from '../../../api/income'
import { useTranslation } from '../../../state/i18n'
import type {
  Income,
  IncomeBody,
  IncomeId,
  IncomeWithPermittedActions
} from '../../../types/income'

import IncomeItemBody from './IncomeItemBody'
import IncomeItemEditor from './IncomeItemEditor'
import IncomeItemHeader from './IncomeItemHeader'
import { IncomeNotifications } from './IncomeNotifications'

interface Props {
  incomes: IncomeWithPermittedActions[]
  incomeTypeOptions: IncomeTypeOptions
  incomeNotifications: IncomeNotification[]
  isRowOpen: (id: IncomeId) => boolean
  toggleRow: (id: IncomeId) => void
  editing: string | undefined
  setEditing: React.Dispatch<React.SetStateAction<string | undefined>>
  deleting: string | undefined
  setDeleting: React.Dispatch<React.SetStateAction<string | undefined>>
  createIncome: (income: IncomeBody) => Promise<Result<unknown>>
  updateIncome: (incomeId: UUID, income: Income) => Promise<Result<unknown>>
  deleteIncome: (incomeId: UUID) => Promise<Result<unknown>>
  onSuccessfulUpdate: () => void
  onFailedUpdate: (value: Failure<unknown>) => void
}

const IncomeList = React.memo(function IncomeList({
  incomes,
  incomeTypeOptions,
  incomeNotifications,
  isRowOpen,
  toggleRow,
  editing,
  setEditing,
  deleting,
  setDeleting,
  createIncome,
  updateIncome,
  deleteIncome,
  onSuccessfulUpdate,
  onFailedUpdate
}: Props) {
  const { i18n } = useTranslation()

  const renderDeleteModal = (income: Income) => {
    const confirmText = `${
      i18n.personProfile.income.deleteModal.confirmText
    } ${income.validFrom.format()} - ${income.validTo?.format() ?? ''}?`
    return (
      <InfoModal
        type="warning"
        title={i18n.personProfile.income.deleteModal.title}
        text={confirmText}
        icon={faQuestion}
        reject={{
          action: () => setDeleting(undefined),
          label: i18n.common.cancel
        }}
        resolve={{
          action: () =>
            deleteIncome(income.id).then((value) => {
              setDeleting(undefined)
              value.mapAll({
                loading: () => undefined,
                success: onSuccessfulUpdate,
                failure: onFailedUpdate
              })
            }),
          label: i18n.common.remove
        }}
      />
    )
  }

  const incomeNotificationsForIncome = React.useCallback(
    (income: Income) => {
      return income
        ? incomeNotifications.filter((incomeNotification) =>
            new DateRange(income.validFrom, income.validTo || null).includes(
              incomeNotification.created.toLocalDate()
            )
          )
        : []
    },
    [incomeNotifications]
  )

  return (
    <>
      {editing === 'new' && (
        <div key="new">
          <IncomeItemHeader
            title={i18n.personProfile.income.itemHeaderNew}
            isOpen={isRowOpen('new')}
            toggle={() => toggleRow('new')}
            editable={!editing}
            startEditing={() => undefined}
            startDeleting={() => undefined}
            permittedActions={['UPDATE', 'DELETE']}
          />
          <Gap size="m" />
          <IncomeItemEditor
            incomeTypeOptions={incomeTypeOptions}
            cancel={() => setEditing(undefined)}
            create={createIncome}
            update={() => undefined}
            onSuccess={onSuccessfulUpdate}
            onFailure={onFailedUpdate}
          />
          <Gap size="m" />
        </div>
      )}
      {incomes.map(({ data: item, permittedActions }) => (
        <div key={item.id} data-qa="income-list-item">
          {deleting === item.id ? renderDeleteModal(item) : null}
          <IncomeItemHeader
            title={`${
              i18n.personProfile.income.itemHeader
            } ${item.validFrom.format()} - ${item.validTo?.format() ?? ''}`}
            isOpen={isRowOpen(item.id)}
            toggle={() => toggleRow(item.id)}
            editable={!editing}
            toggleable
            startEditing={() => setEditing(item.id)}
            startDeleting={() => setDeleting(item.id)}
            permittedActions={permittedActions}
          />
          {incomeNotificationsForIncome(item).length > 0 && (
            <IncomeNotifications
              incomeNotifications={incomeNotificationsForIncome(item)}
            />
          )}
          {isRowOpen(item.id) ? (
            <>
              <Gap size="m" />
              {editing === item.id ? (
                <IncomeItemEditor
                  baseIncome={item}
                  incomeTypeOptions={incomeTypeOptions}
                  cancel={onSuccessfulUpdate}
                  create={createIncome}
                  update={(income) => updateIncome(item.id, income)}
                  onSuccess={onSuccessfulUpdate}
                  onFailure={onFailedUpdate}
                />
              ) : (
                <IncomeItemBody
                  income={item}
                  incomeTypeOptions={incomeTypeOptions}
                />
              )}
            </>
          ) : null}
          <Gap size="m" />
        </div>
      ))}
    </>
  )
})

export default IncomeList
