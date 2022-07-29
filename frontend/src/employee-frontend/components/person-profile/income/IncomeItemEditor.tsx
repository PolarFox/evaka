// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useState } from 'react'
import styled from 'styled-components'

import type { Failure, Result } from 'lib-common/api'
import type { Attachment } from 'lib-common/api-types/attachment'
import type {
  IncomeCoefficient,
  IncomeEffect,
  IncomeValue
} from 'lib-common/api-types/income'
import { incomeEffects } from 'lib-common/api-types/income'
import { formatDate } from 'lib-common/date'
import LocalDate from 'lib-common/local-date'
import { parseCents } from 'lib-common/money'
import type { UUID } from 'lib-common/types'
import Title from 'lib-components/atoms/Title'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import Checkbox from 'lib-components/atoms/form/Checkbox'
import InputField from 'lib-components/atoms/form/InputField'
import Radio from 'lib-components/atoms/form/Radio'
import ListGrid from 'lib-components/layout/ListGrid'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import FileUpload from 'lib-components/molecules/FileUpload'
import { H1, Label, P } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'

import {
  deleteAttachment,
  getAttachmentUrl,
  saveIncomeAttachment
} from '../../../api/attachments'
import type { IncomeTypeOptions } from '../../../api/income'
import { useTranslation } from '../../../state/i18n'
import type { Income, IncomeBody, IncomeFields } from '../../../types/income'
import DateRangeInput from '../../common/DateRangeInput'

import type { IncomeTableData } from './IncomeTable'
import IncomeTable, { tableDataFromIncomeFields } from './IncomeTable'

const ButtonsContainer = styled(FixedSpaceRow)`
  margin: 20px 0;
`

export interface IncomeForm {
  effect: IncomeEffect
  data: IncomeTableData
  isEntrepreneur: boolean
  worksAtECHA: boolean
  validFrom: LocalDate
  validTo?: LocalDate
  notes: string
  attachments: Attachment[]
}

function incomeFormFromIncome(value: IncomeBody): IncomeForm {
  return { ...value, data: tableDataFromIncomeFields(value.data) }
}

const emptyIncome: IncomeForm = {
  effect: 'INCOME',
  data: {} as IncomeTableData,
  isEntrepreneur: false,
  worksAtECHA: false,
  notes: '',
  validFrom: LocalDate.todayInSystemTz(),
  validTo: undefined,
  attachments: []
}

export const coefficientMultipliers: Record<IncomeCoefficient, number> = {
  MONTHLY_WITH_HOLIDAY_BONUS: 1.0417,
  MONTHLY_NO_HOLIDAY_BONUS: 1,
  BI_WEEKLY_WITH_HOLIDAY_BONUS: 2.2323,
  BI_WEEKLY_NO_HOLIDAY_BONUS: 2.1429,
  DAILY_ALLOWANCE_21_5: 21.5,
  DAILY_ALLOWANCE_25: 25,
  YEARLY: 0.0833
}

const calculateAmounts = (
  amount: string,
  coefficient: IncomeCoefficient
): IncomeValue | undefined => {
  const parsed = parseCents(amount)
  if (parsed === undefined) return undefined
  return {
    amount: parsed,
    coefficient,
    monthlyAmount: Math.round(parsed * coefficientMultipliers[coefficient])
  }
}

function updateIncomeData(data: IncomeTableData): [IncomeTableData, boolean] {
  let allValid = true
  const result: IncomeTableData = {}

  for (const [key, value] of Object.entries(data)) {
    if (!value) continue
    const { amount, coefficient } = value

    const item = calculateAmounts(amount, coefficient)
    if (!item && amount !== '') allValid = false

    result[key] = {
      amount,
      coefficient,
      monthlyAmount: item?.monthlyAmount ?? 0
    }
  }

  return [result, allValid]
}

function formToIncomeBody(form: IncomeForm): IncomeBody | undefined {
  const result: IncomeFields = {}

  for (const [key, value] of Object.entries(form.data)) {
    if (!value) continue
    const { amount, coefficient } = value
    if (!amount) {
      // Blank amount => delete the field
      result[key] = undefined
    } else {
      const item = calculateAmounts(amount, coefficient)
      if (!item) {
        // Invalid amount, should not happen because the form has been validated
        return undefined
      }
      result[key] = item
    }
  }

  return { ...form, data: result }
}

interface Props {
  baseIncome?: Income
  incomeTypeOptions: IncomeTypeOptions
  cancel: () => void
  update: (income: Income) => Promise<Result<unknown>> | void
  create: (income: IncomeBody) => Promise<Result<unknown>>
  onSuccess: () => void
  onFailure: (value: Failure<unknown>) => void
}

const IncomeItemEditor = React.memo(function IncomeItemEditor({
  baseIncome,
  incomeTypeOptions,
  cancel,
  update,
  create,
  onSuccess,
  onFailure
}: Props) {
  const { i18n } = useTranslation()

  const [editedIncome, setEditedIncome] = useState<IncomeForm>(() =>
    baseIncome ? incomeFormFromIncome(baseIncome) : emptyIncome
  )
  const [validationErrors, setValidationErrors] = useState<
    Partial<{ [K in keyof Income | 'dates']: boolean }>
  >({})

  const setIncomeData = useCallback((data: IncomeTableData) => {
    const [updatedData, isValid] = updateIncomeData(data)
    setEditedIncome((prev) => ({ ...prev, data: updatedData }))
    setValidationErrors((prev) => ({ ...prev, data: !isValid }))
  }, [])

  return (
    <>
      <div data-qa="income-date-range">
        <Label>{i18n.personProfile.income.details.dateRange}</Label>
        <Gap size="m" />
        <DateRangeInput
          start={editedIncome.validFrom}
          end={editedIncome.validTo}
          onChange={(from: LocalDate, to?: LocalDate) =>
            setEditedIncome((prev) => ({
              ...prev,
              validFrom: from,
              validTo: to
            }))
          }
          onValidationResult={(hasErrors) =>
            setValidationErrors((prev) => ({ ...prev, dates: hasErrors }))
          }
          nullableEndDate
        />
      </div>
      <Gap size="L" />

      <Label>{i18n.personProfile.income.details.effect}</Label>
      <Gap size="m" />
      <FixedSpaceColumn alignItems="flex-start" data-qa="income-effect">
        {incomeEffects.map((effect) => (
          <Radio
            key={effect}
            label={i18n.personProfile.income.details.effectOptions[effect]}
            checked={editedIncome.effect === effect}
            onChange={() => setEditedIncome((prev) => ({ ...prev, effect }))}
            data-qa={`income-effect-${effect}`}
          />
        ))}
      </FixedSpaceColumn>
      <Gap size="L" />

      <Label>{i18n.personProfile.income.details.miscTitle}</Label>
      <Gap size="m" />
      <FixedSpaceColumn>
        <Checkbox
          label={i18n.personProfile.income.details.echa}
          checked={editedIncome.worksAtECHA}
          onChange={() =>
            setEditedIncome((prev) => ({
              ...prev,
              worksAtECHA: !prev.worksAtECHA
            }))
          }
        />
        <Checkbox
          label={i18n.personProfile.income.details.entrepreneur}
          checked={editedIncome.isEntrepreneur}
          onChange={() =>
            setEditedIncome((prev) => ({
              ...prev,
              isEntrepreneur: !prev.isEntrepreneur
            }))
          }
        />
      </FixedSpaceColumn>
      <Gap size="L" />
      <div data-qa="income-notes">
        <Label>{i18n.personProfile.income.details.notes}</Label>
        <Gap size="m" />
        <InputField
          width="L"
          value={editedIncome.notes}
          onChange={(value) =>
            setEditedIncome((prev) => ({ ...prev, notes: value }))
          }
        />
      </div>
      {baseIncome ? (
        <>
          <Gap size="L" />
          <ListGrid labelWidth="fit-content(40%)" rowGap="xs" columnGap="L">
            <Label>{i18n.personProfile.income.details.updated}</Label>
            <span>{formatDate(baseIncome.updatedAt)}</span>

            <Label>{i18n.personProfile.income.details.handler}</Label>
            <span>{baseIncome.updatedBy}</span>
          </ListGrid>
        </>
      ) : null}
      {editedIncome.effect === 'INCOME' ? (
        <>
          <div className="separator" />
          <Title size={4}>
            {i18n.personProfile.income.details.incomeTitle}
          </Title>
          <IncomeTable
            incomeTypeOptions={incomeTypeOptions}
            data={editedIncome.data}
            onChange={setIncomeData}
            type="income"
          />
          <Title size={4}>
            {i18n.personProfile.income.details.expensesTitle}
          </Title>
          <IncomeTable
            incomeTypeOptions={incomeTypeOptions}
            data={editedIncome.data}
            onChange={setIncomeData}
            type="expenses"
          />
        </>
      ) : null}
      <IncomeAttachments
        incomeId={baseIncome?.id ?? null}
        attachments={baseIncome?.attachments ?? []}
        onUploaded={(attachment) => {
          setEditedIncome((prev) => ({
            ...prev,
            attachments: prev.attachments.concat(attachment)
          }))
        }}
        onDeleted={(deletedId) => {
          setEditedIncome((prev) => ({
            ...prev,
            attachments: prev.attachments.filter(({ id }) => id !== deletedId)
          }))
        }}
      />
      <ButtonsContainer>
        <Button
          onClick={cancel}
          text={i18n.common.cancel}
          data-qa="cancel-income-edit"
        />
        <AsyncButton
          primary
          text={i18n.common.save}
          textInProgress={i18n.common.saving}
          textDone={i18n.common.saved}
          disabled={Object.values(validationErrors).some(Boolean)}
          onClick={(): Promise<Result<unknown>> | void => {
            const body = formToIncomeBody(editedIncome)
            if (!body) return
            return !baseIncome
              ? create(body)
              : update({ ...baseIncome, ...body })
          }}
          onSuccess={onSuccess}
          onFailure={onFailure}
          data-qa="save-income"
        />
      </ButtonsContainer>
    </>
  )
})

function IncomeAttachments({
  incomeId,
  attachments,
  onUploaded,
  onDeleted
}: {
  incomeId: UUID | null
  attachments: Attachment[]
  onUploaded: (attachment: Attachment) => void
  onDeleted: (id: UUID) => void
}) {
  const { i18n } = useTranslation()

  const handleUpload = useCallback(
    async (
      file: File,
      onUploadProgress: (progressEvent: ProgressEvent) => void
    ) =>
      (await saveIncomeAttachment(incomeId, file, onUploadProgress)).map(
        (id) => {
          onUploaded({ id, name: file.name, contentType: file.type })
          return id
        }
      ),
    [incomeId, onUploaded]
  )

  const handleDelete = useCallback(
    async (id: UUID) => {
      return (await deleteAttachment(id)).map(() => {
        onDeleted(id)
      })
    },
    [onDeleted]
  )

  return (
    <>
      <H1>{i18n.incomeStatement.employeeAttachments.title}</H1>
      <P>{i18n.incomeStatement.employeeAttachments.description}</P>
      <FileUpload
        data-qa="income-attachment-upload"
        files={attachments}
        onUpload={handleUpload}
        onDelete={handleDelete}
        getDownloadUrl={getAttachmentUrl}
        i18n={i18n.fileUpload}
      />
    </>
  )
}

export default IncomeItemEditor
