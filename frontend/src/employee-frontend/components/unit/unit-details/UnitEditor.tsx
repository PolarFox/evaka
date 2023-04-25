// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useMemo, useState } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import type DateRange from 'lib-common/date-range'
import type { UpdateStateFn } from 'lib-common/form-state'
import type {
  CareType,
  DaycareCareArea,
  DaycareFields,
  Language,
  ProviderType
} from 'lib-common/generated/api-types/daycare'
import type { Coordinate } from 'lib-common/generated/api-types/shared'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'
import Button from 'lib-components/atoms/buttons/Button'
import InlineButton from 'lib-components/atoms/buttons/InlineButton'
import Combobox from 'lib-components/atoms/dropdowns/Combobox'
import Checkbox from 'lib-components/atoms/form/Checkbox'
import InputField from 'lib-components/atoms/form/InputField'
import Radio from 'lib-components/atoms/form/Radio'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import {
  DatePickerClearableDeprecated,
  DatePickerDeprecated
} from 'lib-components/molecules/DatePickerDeprecated'
import { AlertBox } from 'lib-components/molecules/MessageBoxes'
import { fontWeights, H1, H3 } from 'lib-components/typography'
import { defaultMargins, Gap } from 'lib-components/white-space'
import colors from 'lib-customizations/common'
import { featureFlags, unitProviderTypes } from 'lib-customizations/employee'
import { faPen } from 'lib-icons'

import type { Translations } from '../../../state/i18n'
import { useTranslation } from '../../../state/i18n'
import type { FinanceDecisionHandlerOption } from '../../../state/invoicing-ui'
import type { DayOfWeek } from '../../../types'
import type { Unit } from '../../../types/unit'

// CareType is a mix of these two enums
type OnlyCareType = 'DAYCARE' | 'PRESCHOOL' | 'PREPARATORY_EDUCATION' | 'CLUB'
type OnlyDaycareType = 'CENTRE' | 'FAMILY' | 'GROUP_FAMILY'

interface FormData {
  name: string
  openingDate: LocalDate | null
  closingDate: LocalDate | null
  areaId: string
  careTypes: Record<OnlyCareType, boolean>
  daycareType: OnlyDaycareType | undefined
  daycareApplyPeriod: DateRange | null
  preschoolApplyPeriod: DateRange | null
  clubApplyPeriod: DateRange | null
  providerType: ProviderType
  roundTheClock: boolean
  capacity: string
  language: Language
  ghostUnit: boolean
  uploadToVarda: boolean
  uploadChildrenToVarda: boolean
  uploadToKoski: boolean
  invoicedByMunicipality: boolean
  costCenter: string
  financeDecisionHandlerId: string
  additionalInfo: string
  phone: string
  email: string
  url: string
  visitingAddress: Address
  location: string
  mailingAddress: Address
  unitManager: UnitManager
  decisionCustomization: UnitDecisionCustomization
  ophUnitOid: string
  ophOrganizerOid: string
  operationDays: DayOfWeek[]
  businessId: string
  iban: string
  providerId: string
}

interface UnitDecisionCustomization {
  daycareName: string
  preschoolName: string
  handler: string
  handlerAddress: string
}

interface UnitManager {
  name: string
  phone: string
  email: string
}

interface Address {
  streetAddress: string
  postalCode: string
  postOffice: string
}

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${defaultMargins.m};
`

const FormPart = styled.div`
  display: flex;
  margin-bottom: 20px;

  & > :first-child {
    font-weight: ${fontWeights.bold};
    width: 250px;
    flex: 0 0 auto;
    margin-right: 20px;
  }

  & .input-group .group-label {
    display: none;
  }

  & > :nth-child(2) {
    margin: 0;
  }
`

const FormError = styled.div`
  color: ${colors.status.danger};
  margin-bottom: 20px;
`

const DaycareTypeSelectContainer = styled.div`
  display: flex;

  & > :first-child {
    margin-right: 20px;
  }

  & > * {
    flex: 0 1 auto;
  }
`

const OperationDaysContainer = styled.div`
  display: flex;
  align-items: center;
`

const CapacityInputContainer = styled.div`
  display: flex;
  align-items: center;

  & input {
    max-width: 200px;
    display: inline-block;
    margin-right: 20px;
  }
`

const AddressSecondRowContainer = styled.div`
  display: flex;
  justify-content: space-between;

  & > :first-child {
    margin-right: 20px;
  }
`

const IndentCheckboxLabel = styled.div`
  margin-left: 46px;
`

const IndentedTable = styled.div`
  margin-left: 46px;
  display: inline-grid;
  align-items: center;
  grid-template-columns: min-content min-content;
  column-gap: 80px;
  row-gap: 3px;
`

const Url = styled.a`
  word-break: break-all;
`

const AlertBoxContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`

function AddressEditor({
  editable,
  address,
  onChange,
  dataQaPrefix
}: {
  editable: boolean
  address: Address
  onChange: (address: Address) => void
  dataQaPrefix: string
}) {
  const { i18n } = useTranslation()
  const update: UpdateStateFn<Address> = (updates) =>
    onChange({ ...address, ...updates })
  if (!editable) {
    return (
      <div>
        <div>{address.streetAddress}</div>
        <div>
          {[address.postalCode, address.postOffice]
            .filter((x) => !!x)
            .join(' ')}
        </div>
      </div>
    )
  }
  return (
    <div>
      <InputField
        value={address.streetAddress}
        placeholder={i18n.unitEditor.placeholder.streetAddress}
        onChange={(value) => update({ streetAddress: value })}
        width="L"
        data-qa={`${dataQaPrefix}-street-input`}
      />
      <AddressSecondRowContainer>
        <InputField
          value={address.postalCode}
          placeholder={i18n.unitEditor.placeholder.postalCode}
          onChange={(value) => update({ postalCode: value })}
          width="s"
          data-qa={`${dataQaPrefix}-postal-code-input`}
        />
        <InputField
          value={address.postOffice}
          placeholder={i18n.unitEditor.placeholder.postOffice}
          onChange={(value) => update({ postOffice: value })}
          data-qa={`${dataQaPrefix}-post-office-input`}
        />
      </AddressSecondRowContainer>
    </div>
  )
}

function formatCoordinate(coordinate: Coordinate | null | undefined): string {
  if (!coordinate) return ''
  return `${coordinate.lat}, ${coordinate.lon}`
}

function parseLocation(value: string): Coordinate | undefined {
  const parts = value.split(',').map((str) => str.trim())
  if (parts.length != 2) return undefined
  const lat = parseFloat(parts[0])
  const lon = parseFloat(parts[1])
  // Rough coordinate limits for Finland
  if (!(lat >= 59.6 && lat < 70.0)) {
    return undefined
  }
  if (!(lon >= 20.5 && lon < 31.7)) {
    return undefined
  }
  return { lat, lon }
}

interface Props {
  areas: DaycareCareArea[]
  financeDecisionHandlerOptions: FinanceDecisionHandlerOption[]
  unit?: Unit
  editable: boolean
  onClickCancel?: () => void
  onClickEdit?: () => void
  onSubmit: (fields: DaycareFields, id: UUID | undefined) => void
  submit: Result<void> | undefined
}

function validateForm(
  i18n: Translations,
  form: FormData
): [DaycareFields | undefined, string[]] {
  const errors: string[] = []
  const typeMap: Record<CareType, boolean> = {
    CLUB: form.careTypes.CLUB,
    CENTRE: form.daycareType === 'CENTRE',
    PRESCHOOL: form.careTypes.PRESCHOOL,
    PREPARATORY_EDUCATION: form.careTypes.PREPARATORY_EDUCATION,
    FAMILY: form.daycareType === 'FAMILY',
    GROUP_FAMILY: form.daycareType === 'GROUP_FAMILY'
  }
  const type = (Object.keys(typeMap) as CareType[]).filter(
    (key) => typeMap[key]
  )
  const name = form.name.trim() || null
  const capacity = parseInt(form.capacity, 10)
  const costCenter = form.costCenter.trim() || null
  const additionalInfo = form.additionalInfo.trim() || null
  const phone = form.phone.trim() || null
  const email = form.email.trim() || null
  const url = form.url.trim() || null
  const visitingAddress = {
    streetAddress: form.visitingAddress.streetAddress.trim() || null,
    postalCode: form.visitingAddress.postalCode.trim() || null,
    postOffice: form.visitingAddress.postOffice.trim() || null
  }
  const location = parseLocation(form.location) ?? null
  const mailingAddress = {
    streetAddress: '',
    poBox: form.mailingAddress.streetAddress.trim() || null,
    postalCode: form.mailingAddress.postalCode.trim() || null,
    postOffice: form.mailingAddress.postOffice.trim() || null
  }
  const unitManager = {
    name: form.unitManager.name.trim() || null,
    email: form.unitManager.email.trim() || null,
    phone: form.unitManager.phone.trim() || null
  }
  const decisionCustomization = {
    daycareName: form.decisionCustomization.daycareName.trim(),
    preschoolName: form.decisionCustomization.preschoolName.trim(),
    handler: form.decisionCustomization.handler.trim(),
    handlerAddress: form.decisionCustomization.handlerAddress.trim()
  }

  if (!name) {
    errors.push(i18n.unitEditor.error.name)
  }
  if (!form.areaId) {
    errors.push(i18n.unitEditor.error.area)
  }
  if (Object.values(form.careTypes).every((v) => !v)) {
    errors.push(i18n.unitEditor.error.careType)
  }
  if (form.careTypes.DAYCARE && !form.daycareType) {
    errors.push(i18n.unitEditor.error.daycareType)
  }
  if (!Number.isSafeInteger(capacity)) {
    errors.push(i18n.unitEditor.error.capacity)
  }
  if (form.invoicedByMunicipality && !costCenter) {
    errors.push(i18n.unitEditor.error.costCenter)
  }
  if (url && !(url.startsWith('https://') || url.startsWith('http://'))) {
    errors.push(i18n.unitEditor.error.url)
  }
  if (!visitingAddress.streetAddress) {
    errors.push(i18n.unitEditor.error.visitingAddress.streetAddress)
  }
  if (!visitingAddress.postalCode) {
    errors.push(i18n.unitEditor.error.visitingAddress.postalCode)
  }
  if (!visitingAddress.postOffice) {
    errors.push(i18n.unitEditor.error.visitingAddress.postOffice)
  }
  if (form.location && !location) {
    errors.push(i18n.unitEditor.error.location)
  }
  if (!unitManager.name) {
    errors.push(i18n.unitEditor.error.unitManager.name)
  }
  if (!unitManager.phone) {
    errors.push(i18n.unitEditor.error.unitManager.phone)
  }
  if (!unitManager.email) {
    errors.push(i18n.unitEditor.error.unitManager.email)
  }
  if (
    (!form.careTypes.DAYCARE && form.daycareApplyPeriod != null) ||
    (!form.careTypes.PRESCHOOL && form.preschoolApplyPeriod != null) ||
    (!form.careTypes.CLUB && form.clubApplyPeriod != null)
  ) {
    errors.push(i18n.unitEditor.error.cannotApplyToDifferentType)
  }
  if (
    form.openingDate != null &&
    form.closingDate != null &&
    form.openingDate.isAfter(form.closingDate)
  ) {
    errors.push(i18n.unitEditor.error.openingDateIsAfterClosingDate)
  }
  if (
    featureFlags.experimental?.voucherUnitPayments &&
    form.providerType === 'PRIVATE_SERVICE_VOUCHER'
  ) {
    if (!form.businessId) errors.push(i18n.unitEditor.error.businessId)
    if (!form.iban) errors.push(i18n.unitEditor.error.iban)
    if (!form.providerId) errors.push(i18n.unitEditor.error.providerId)
  }

  const {
    openingDate,
    closingDate,
    areaId,
    daycareApplyPeriod,
    preschoolApplyPeriod,
    clubApplyPeriod,
    providerType,
    roundTheClock,
    language,
    ghostUnit,
    financeDecisionHandlerId,
    uploadToVarda,
    uploadChildrenToVarda,
    uploadToKoski,
    invoicedByMunicipality,
    ophUnitOid,
    ophOrganizerOid,
    operationDays,
    businessId,
    iban,
    providerId
  } = form

  if (
    name &&
    visitingAddress.streetAddress &&
    visitingAddress.postalCode &&
    visitingAddress.postOffice
  ) {
    return [
      {
        name,
        openingDate,
        closingDate,
        areaId,
        type,
        daycareApplyPeriod,
        preschoolApplyPeriod,
        clubApplyPeriod,
        providerType,
        roundTheClock,
        capacity,
        language,
        ghostUnit,
        uploadToVarda,
        uploadChildrenToVarda,
        uploadToKoski,
        invoicedByMunicipality,
        costCenter,
        financeDecisionHandlerId,
        additionalInfo,
        phone,
        email,
        url,
        visitingAddress: {
          streetAddress: visitingAddress.streetAddress,
          postalCode: visitingAddress.postalCode,
          postOffice: visitingAddress.postOffice
        },
        location,
        mailingAddress,
        unitManager,
        decisionCustomization: {
          daycareName: decisionCustomization.daycareName,
          preschoolName: decisionCustomization.preschoolName,
          handler: decisionCustomization.handler,
          handlerAddress: decisionCustomization.handlerAddress
        },
        ophUnitOid,
        ophOrganizerOid,
        operationDays,
        businessId,
        iban,
        providerId
      },
      errors
    ]
  } else {
    return [undefined, errors]
  }
}

function toFormData(unit: Unit | undefined): FormData {
  const type = unit?.type
  return {
    name: unit?.name ?? '',
    openingDate: unit?.openingDate ?? null,
    closingDate: unit?.closingDate ?? null,
    areaId: unit?.area?.id ?? '',
    careTypes: {
      DAYCARE:
        type?.some(
          (x) => x === 'CENTRE' || x === 'FAMILY' || x === 'GROUP_FAMILY'
        ) ?? false,
      PREPARATORY_EDUCATION: type?.includes('PREPARATORY_EDUCATION') ?? false,
      PRESCHOOL: type?.includes('PRESCHOOL') ?? false,
      CLUB: type?.includes('CLUB') ?? false
    },
    daycareType: type?.includes('FAMILY')
      ? 'FAMILY'
      : type?.includes('GROUP_FAMILY')
      ? 'GROUP_FAMILY'
      : type?.includes('CENTRE')
      ? 'CENTRE'
      : undefined,
    daycareApplyPeriod: unit?.daycareApplyPeriod ?? null,
    preschoolApplyPeriod: unit?.preschoolApplyPeriod ?? null,
    clubApplyPeriod: unit?.clubApplyPeriod ?? null,
    providerType: unit?.providerType ?? 'MUNICIPAL',
    roundTheClock: unit?.roundTheClock ?? false,
    capacity: (unit?.capacity ?? 0).toString(),
    language: unit?.language ?? 'fi',
    ghostUnit: unit?.ghostUnit ?? false,
    uploadToVarda: unit?.uploadToVarda ?? false,
    uploadChildrenToVarda: unit?.uploadChildrenToVarda ?? false,
    uploadToKoski: unit?.uploadToKoski ?? false,
    invoicedByMunicipality: unit?.invoicedByMunicipality ?? false,
    costCenter: unit?.costCenter ?? '',
    financeDecisionHandlerId: unit?.financeDecisionHandler?.id ?? '',
    additionalInfo: unit?.additionalInfo ?? '',
    phone: unit?.phone ?? '',
    email: unit?.email ?? '',
    url: unit?.url ?? '',
    ophUnitOid: unit?.ophUnitOid ?? '',
    ophOrganizerOid: unit?.ophOrganizerOid ?? '',
    visitingAddress: {
      streetAddress: unit?.visitingAddress?.streetAddress ?? '',
      postalCode: unit?.visitingAddress?.postalCode ?? '',
      postOffice: unit?.visitingAddress?.postOffice ?? ''
    },
    location: formatCoordinate(unit?.location),
    mailingAddress: {
      streetAddress: unit?.mailingAddress.poBox ?? '',
      postalCode: unit?.mailingAddress.postalCode ?? '',
      postOffice: unit?.mailingAddress.postOffice ?? ''
    },
    decisionCustomization: {
      daycareName: unit?.decisionCustomization.daycareName ?? '',
      handler: unit?.decisionCustomization.handler ?? '',
      handlerAddress: unit?.decisionCustomization.handlerAddress ?? '',
      preschoolName: unit?.decisionCustomization.preschoolName ?? ''
    },
    unitManager: {
      name: unit?.unitManager?.name ?? '',
      phone: unit?.unitManager?.phone ?? '',
      email: unit?.unitManager?.email ?? ''
    },
    operationDays: unit?.operationDays ?? [],
    businessId: unit?.businessId ?? '',
    iban: unit?.iban ?? '',
    providerId: unit?.providerId ?? ''
  }
}

export default function UnitEditor(props: Props): JSX.Element {
  const { i18n } = useTranslation()
  const initialData = useMemo<FormData>(
    () => toFormData(props.unit),
    [props.unit]
  )
  const [form, setForm] = useState<FormData>(initialData)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const { careTypes, decisionCustomization, unitManager } = form

  const canApplyTypes = [
    {
      type: 'daycare',
      checkboxI18n: 'canApplyDaycare' as const,
      field: 'daycareApplyPeriod',
      period: form.daycareApplyPeriod
    },
    ...(featureFlags.preschool
      ? [
          {
            type: 'preschool',
            checkboxI18n: 'canApplyPreschool' as const,
            field: 'preschoolApplyPeriod',
            period: form.preschoolApplyPeriod
          }
        ]
      : []),
    {
      type: 'club',
      checkboxI18n: 'canApplyClub' as const,
      field: 'clubApplyPeriod',
      period: form.clubApplyPeriod
    }
  ]

  const updateForm = (updates: Partial<FormData>) => {
    const newForm = { ...form, ...updates }
    setForm(newForm)
    const [, errors] = validateForm(i18n, newForm)
    setFormErrors(errors)
  }
  const updateCareTypes = (updates: Partial<Record<CareType, boolean>>) =>
    updateForm({ careTypes: { ...form.careTypes, ...updates } })
  const updateDecisionCustomization: UpdateStateFn<
    UnitDecisionCustomization
  > = (updates) =>
    updateForm({
      decisionCustomization: { ...form.decisionCustomization, ...updates }
    })
  const updateUnitManager: UpdateStateFn<UnitManager> = (updates) =>
    updateForm({ unitManager: { ...form.unitManager, ...updates } })

  const selectedFinanceDecisionManager = useMemo(
    () =>
      props.financeDecisionHandlerOptions.find(
        (e) => e.value === form.financeDecisionHandlerId
      ),
    [form.financeDecisionHandlerId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const onClickSubmit = (e: React.MouseEvent) => {
    e.preventDefault()
    const [fields, errors] = validateForm(i18n, form)
    setFormErrors(errors)
    if (fields && errors.length === 0) {
      props.onSubmit(fields, props.unit?.id)
    }
  }

  const onClickEditHandler = () => {
    const [, errors] = validateForm(i18n, form)
    setFormErrors(errors)
    if (props.onClickEdit) props.onClickEdit()
  }

  const isNewUnit = !props.unit
  const showRequired = props.editable
    ? (label: string) => `${label}*`
    : (label: string) => label

  const isMunicipalOrPurchasedOrServiceVoucherUnit = () => {
    return (
      form.providerType === 'MUNICIPAL' ||
      form.providerType === 'PURCHASED' ||
      form.providerType === 'PRIVATE_SERVICE_VOUCHER' ||
      form.providerType === 'MUNICIPAL_SCHOOL'
    )
  }

  return (
    <form action="#" data-qa="unit-editor-container">
      {props.unit && (
        <TopBar>
          <H1 fitted>{props.unit.name}</H1>
          {!props.editable && (
            <InlineButton
              icon={faPen}
              onClick={onClickEditHandler}
              text={i18n.common.edit}
              data-qa="enable-edit-button"
            />
          )}
        </TopBar>
      )}
      {isNewUnit && <H1>{i18n.titles.createUnit}</H1>}
      <H3>{i18n.unit.info.title}</H3>
      <FormPart>
        <label htmlFor="unit-name">
          {showRequired(i18n.unitEditor.label.name)}
        </label>
        {props.editable ? (
          <InputField
            id="unit-name"
            placeholder={i18n.unitEditor.placeholder.name}
            value={form.name}
            onChange={(value) => updateForm({ name: value })}
            width="L"
            data-qa="unit-name-input"
          />
        ) : (
          <div>{form.name}</div>
        )}
      </FormPart>
      <FormPart>
        <div>{`${i18n.unitEditor.label.openingDate} / ${i18n.unitEditor.label.closingDate}`}</div>
        <AlertBoxContainer>
          <div>
            {props.editable ? (
              <DatePickerDeprecated
                date={form.openingDate ?? undefined}
                options={{
                  placeholderText: i18n.unitEditor.placeholder.openingDate
                }}
                onChange={(openingDate) => updateForm({ openingDate })}
                className="inline-block"
                maxDate={form.closingDate ?? LocalDate.of(2100, 1, 1)}
              />
            ) : (
              form.openingDate?.format()
            )}
            {' - '}
            {props.editable ? (
              <DatePickerClearableDeprecated
                date={form.closingDate}
                options={{
                  placeholderText: i18n.unitEditor.placeholder.closingDate
                }}
                onCleared={() => updateForm({ closingDate: null })}
                onChange={(closingDate) => updateForm({ closingDate })}
                className="inline-block"
                minDate={form.openingDate ?? LocalDate.of(1960, 1, 1)}
                data-qa="closing-date-input"
              />
            ) : (
              form.closingDate?.format()
            )}
          </div>
          {props.editable && !props.unit?.closingDate && form.closingDate && (
            <AlertBox
              message={
                i18n.unitEditor.warning.placementsShouldBeEndedIfUnitIsClosed
              }
              data-qa="closing-date-warning"
            />
          )}
        </AlertBoxContainer>
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.area)}</div>
        {props.editable ? (
          <Combobox
            items={props.areas}
            selectedItem={
              props.areas.find(({ id }) => id === form.areaId) ?? null
            }
            placeholder={i18n.unitEditor.placeholder.area}
            onChange={(area) =>
              area ? updateForm({ areaId: area.id }) : undefined
            }
            fullWidth
            data-qa="area-select"
            getItemLabel={(area) => area.name}
          />
        ) : (
          props.areas.find((area) => area.id === form.areaId)?.name
        )}
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.careTypes)}</div>
        <FixedSpaceColumn fullWidth={true}>
          <DaycareTypeSelectContainer>
            <Checkbox
              disabled={!props.editable}
              checked={careTypes.DAYCARE}
              label={i18n.common.types.DAYCARE}
              onChange={(checked) =>
                updateForm({
                  careTypes: { ...form.careTypes, DAYCARE: checked },
                  daycareType: checked ? form.daycareType : undefined
                })
              }
              data-qa="care-type-checkbox-DAYCARE"
            />
            {form.careTypes.DAYCARE && (
              <Combobox<OnlyDaycareType>
                disabled={!props.editable}
                fullWidth
                items={['CENTRE', 'FAMILY', 'GROUP_FAMILY']}
                selectedItem={form.daycareType ?? null}
                placeholder={showRequired(
                  i18n.unitEditor.placeholder.daycareType
                )}
                onChange={(value) =>
                  value
                    ? updateForm({
                        daycareType: value
                      })
                    : undefined
                }
                getItemLabel={(item) => i18n.common.types[item]}
              />
            )}
          </DaycareTypeSelectContainer>
          {featureFlags.preschool && (
            <>
              <Checkbox
                disabled={!props.editable}
                checked={form.careTypes.PRESCHOOL}
                label={i18n.common.types.PRESCHOOL}
                onChange={(checked) => updateCareTypes({ PRESCHOOL: checked })}
                data-qa="care-type-checkbox-PRESCHOOL"
              />
              <Checkbox
                disabled={!props.editable}
                checked={form.careTypes.PREPARATORY_EDUCATION}
                label={i18n.common.types.PREPARATORY_EDUCATION}
                onChange={(checked) =>
                  updateCareTypes({ PREPARATORY_EDUCATION: checked })
                }
                data-qa="care-type-checkbox-PREPARATORY"
              />
            </>
          )}
          <Checkbox
            disabled={!props.editable}
            checked={form.careTypes.CLUB}
            label={i18n.common.types.CLUB}
            onChange={(checked) => updateCareTypes({ CLUB: checked })}
            data-qa="care-type-checkbox-CLUB"
          />
        </FixedSpaceColumn>
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.canApply)}</div>
        <FixedSpaceColumn>
          {canApplyTypes.map(({ type, checkboxI18n, field, period }) => {
            return (
              <div key={type}>
                <Checkbox
                  disabled={!props.editable}
                  label={i18n.unitEditor.field[checkboxI18n]}
                  checked={period !== null}
                  onChange={(canApply) => {
                    updateForm({
                      [field]: canApply
                        ? { start: LocalDate.todayInSystemTz(), end: null }
                        : null
                    })
                  }}
                  data-qa={`application-type-checkbox-${type.toUpperCase()}`}
                />
                {period != null && (
                  <>
                    <Gap size="xs" />
                    <IndentCheckboxLabel>
                      <FixedSpaceRow alignItems="center">
                        <div>{i18n.unitEditor.field.applyPeriod}</div>
                        <div>
                          {props.editable ? (
                            <DatePickerDeprecated
                              date={
                                period?.start ?? LocalDate.todayInSystemTz()
                              }
                              onChange={(startDate) => {
                                if (
                                  !period ||
                                  (period.end !== null &&
                                    period.end.isBefore(startDate))
                                ) {
                                  return
                                }

                                updateForm({
                                  [field]: {
                                    start: startDate,
                                    end: period?.end
                                  }
                                })
                              }}
                            />
                          ) : (
                            period.start.format()
                          )}
                          {' - '}
                          {props.editable ? (
                            <DatePickerClearableDeprecated
                              date={period?.end}
                              onChange={(endDate) => {
                                if (!period || endDate.isBefore(period.start)) {
                                  return
                                }

                                updateForm({
                                  [field]: {
                                    start:
                                      period?.start ??
                                      LocalDate.todayInSystemTz(),
                                    end: endDate
                                  }
                                })
                              }}
                              onCleared={() => {
                                updateForm({
                                  [field]: {
                                    start:
                                      period?.start ??
                                      LocalDate.todayInSystemTz(),
                                    end: null
                                  }
                                })
                              }}
                            />
                          ) : (
                            period.end?.format()
                          )}
                        </div>
                      </FixedSpaceRow>
                    </IndentCheckboxLabel>
                  </>
                )}
              </div>
            )
          })}
        </FixedSpaceColumn>
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.providerType)}</div>
        {props.editable ? (
          <FixedSpaceColumn>
            {unitProviderTypes.map((value) => (
              <div key={value}>
                <Radio
                  label={i18n.common.providerType[value]}
                  checked={form.providerType === value}
                  onChange={() => updateForm({ providerType: value })}
                  data-qa={`provider-type-${value}`}
                />
                {featureFlags.experimental?.voucherUnitPayments &&
                  value === 'PRIVATE_SERVICE_VOUCHER' &&
                  form.providerType === value && (
                    <IndentedTable>
                      <label htmlFor="private-service-voucher-business-id">
                        {i18n.unitEditor.label.businessId}
                      </label>
                      <div>
                        <InputField
                          id="private-service-voucher-business-id"
                          value={form.businessId}
                          width="m"
                          onChange={(value) =>
                            updateForm({ businessId: value })
                          }
                        />
                      </div>
                      <label htmlFor="private-service-voucher-iban">
                        {i18n.unitEditor.label.iban}
                      </label>
                      <div>
                        <InputField
                          id="private-service-voucher-iban"
                          value={form.iban}
                          width="m"
                          onChange={(value) => updateForm({ iban: value })}
                        />
                      </div>
                      <label htmlFor="private-service-voucher-provider-id">
                        {i18n.unitEditor.label.providerId}
                      </label>
                      <div>
                        <InputField
                          id="private-service-voucher-provider-id"
                          value={form.providerId}
                          width="m"
                          onChange={(value) =>
                            updateForm({ providerId: value })
                          }
                        />
                      </div>
                    </IndentedTable>
                  )}
              </div>
            ))}
          </FixedSpaceColumn>
        ) : (
          <div>{i18n.common.providerType[form.providerType]}</div>
        )}
      </FormPart>
      {featureFlags.experimental?.voucherUnitPayments &&
        !props.editable &&
        form.providerType === 'PRIVATE_SERVICE_VOUCHER' && (
          <>
            <FormPart>
              <div>{i18n.unitEditor.label.businessId}</div>
              <div>{form.businessId}</div>
            </FormPart>
            <FormPart>
              <div>{i18n.unitEditor.label.iban}</div>
              <div>{form.iban}</div>
            </FormPart>
            <FormPart>
              <div>{i18n.unitEditor.label.providerId}</div>
              <div>{form.providerId}</div>
            </FormPart>
          </>
        )}
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.operationDays)}</div>
        <OperationDaysContainer>
          {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
            <FixedSpaceColumn
              key={`"weekday-${day}"`}
              spacing="xs"
              marginRight="m"
              alignItems="center"
            >
              <div>{i18n.unitEditor.label.operationDay[day]}</div>
              <Checkbox
                disabled={!props.editable}
                checked={form.operationDays.some(
                  (selectedDay) => selectedDay == day
                )}
                hiddenLabel={true}
                label=""
                onChange={(checked) => {
                  updateForm({
                    operationDays: checked
                      ? [...form.operationDays, day as DayOfWeek]
                      : form.operationDays.filter((d) => d != day)
                  })
                }}
              />
            </FixedSpaceColumn>
          ))}
        </OperationDaysContainer>
      </FormPart>
      <FormPart>
        <div>{i18n.unitEditor.label.roundTheClock}</div>
        <Checkbox
          disabled={!props.editable}
          label={i18n.unitEditor.field.roundTheClock}
          checked={form.roundTheClock}
          onChange={(roundTheClock) => updateForm({ roundTheClock })}
        />
      </FormPart>
      <FormPart>
        <label htmlFor="unit-capacity">{i18n.unitEditor.label.capacity}</label>
        <CapacityInputContainer>
          {props.editable ? (
            <InputField
              id="unit-capacity"
              value={form.capacity}
              width="xs"
              onChange={(value) =>
                updateForm({
                  capacity: value
                })
              }
            />
          ) : (
            form.capacity
          )}
          {` ${i18n.unitEditor.field.capacity}`}
        </CapacityInputContainer>
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.language)}</div>
        {props.editable ? (
          <FixedSpaceColumn>
            {(['fi', 'sv'] as const).map((value) => (
              <Radio
                key={value}
                label={i18n.language[value]}
                checked={form.language === value}
                onChange={() => updateForm({ language: value })}
              />
            ))}
          </FixedSpaceColumn>
        ) : (
          i18n.language[form.language]
        )}
      </FormPart>
      <FormPart>
        <div>{i18n.unitEditor.label.ghostUnit}</div>
        <Checkbox
          disabled={!props.editable}
          label={i18n.unitEditor.field.ghostUnit}
          checked={form.ghostUnit}
          onChange={(ghostUnit) => updateForm({ ghostUnit })}
        />
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.integrations)}</div>
        <FixedSpaceColumn>
          <AlertBoxContainer>
            <Checkbox
              disabled={!props.editable}
              label={i18n.unitEditor.field.uploadToVarda}
              checked={form.uploadToVarda}
              onChange={(uploadToVarda) => updateForm({ uploadToVarda })}
            />
            {props.editable &&
              form.uploadToVarda &&
              !isMunicipalOrPurchasedOrServiceVoucherUnit() && (
                <AlertBox
                  message={
                    i18n.unitEditor.warning
                      .onlyMunicipalUnitsShouldBeSentToVarda
                  }
                  data-qa="send-to-varda-warning"
                />
              )}
          </AlertBoxContainer>
          <Checkbox
            disabled={!props.editable}
            label={i18n.unitEditor.field.uploadChildrenToVarda}
            checked={form.uploadChildrenToVarda}
            onChange={(uploadChildrenToVarda) =>
              updateForm({ uploadChildrenToVarda })
            }
          />
          {featureFlags.preschool && (
            <Checkbox
              disabled={!props.editable}
              label={i18n.unitEditor.field.uploadToKoski}
              checked={form.uploadToKoski}
              onChange={(uploadToKoski) => updateForm({ uploadToKoski })}
            />
          )}
        </FixedSpaceColumn>
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.invoicedByMunicipality)}</div>
        <div>
          <Checkbox
            disabled={!props.editable}
            label={i18n.unitEditor.field.invoicingByEvaka}
            checked={form.invoicedByMunicipality}
            onChange={(invoicedByMunicipality) =>
              updateForm({ invoicedByMunicipality })
            }
            data-qa="check-invoice-by-municipality"
          />
          {form.invoicedByMunicipality && (
            <>
              <Gap size="m" />
              <FormPart>
                <label htmlFor="unit-cost-center">
                  {i18n.unitEditor.label.costCenter}
                </label>
                {props.editable ? (
                  <InputField
                    id="unit-cost-center"
                    placeholder={showRequired(
                      i18n.unitEditor.placeholder.costCenter
                    )}
                    value={form.costCenter}
                    onChange={(value) => updateForm({ costCenter: value })}
                  />
                ) : (
                  form.costCenter
                )}
              </FormPart>
            </>
          )}
        </div>
      </FormPart>
      <FormPart>
        <div>{i18n.unitEditor.label.financeDecisionHandler}</div>
        {props.editable ? (
          <Combobox
            items={props.financeDecisionHandlerOptions}
            placeholder={i18n.unitEditor.placeholder.financeDecisionHandler}
            selectedItem={selectedFinanceDecisionManager ?? null}
            onChange={(value) =>
              value
                ? updateForm({ financeDecisionHandlerId: value.value })
                : updateForm({ financeDecisionHandlerId: undefined })
            }
            clearable
            fullWidth
            getItemLabel={(item) => item.label}
          />
        ) : (
          selectedFinanceDecisionManager?.label
        )}
      </FormPart>

      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.ophUnitOid)}</div>
        {props.editable ? (
          <InputField
            id="oph-unit-oid"
            placeholder={showRequired(i18n.unitEditor.label.ophUnitOid)}
            value={form.ophUnitOid}
            onChange={(value) => updateForm({ ophUnitOid: value.trim() })}
            width="L"
          />
        ) : (
          form.ophUnitOid
        )}
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.ophOrganizerOid)}</div>
        {props.editable ? (
          <InputField
            id="oph-organizer-oid"
            placeholder={showRequired(i18n.unitEditor.label.ophOrganizerOid)}
            value={form.ophOrganizerOid}
            onChange={(value) => updateForm({ ophOrganizerOid: value.trim() })}
            width="L"
          />
        ) : (
          form.ophOrganizerOid
        )}
      </FormPart>
      <FormPart>
        <label htmlFor="unit-additional-info">
          {i18n.unitEditor.label.additionalInfo}
        </label>
        {props.editable ? (
          <InputField
            id="unit-additional-info"
            placeholder={i18n.unitEditor.placeholder.additionalInfo}
            value={form.additionalInfo}
            onChange={(value) => updateForm({ additionalInfo: value })}
            width="L"
          />
        ) : (
          form.additionalInfo
        )}
      </FormPart>
      <H3>{i18n.unitEditor.title.contact}</H3>
      <FormPart>
        <label htmlFor="unit-phone">{i18n.unitEditor.label.phone}</label>
        {props.editable ? (
          <InputField
            id="unit-phone"
            placeholder={i18n.unitEditor.placeholder.phone}
            value={form.phone}
            onChange={(value) => updateForm({ phone: value })}
          />
        ) : (
          form.phone
        )}
      </FormPart>
      <FormPart>
        <label htmlFor="unit-email">{i18n.unitEditor.label.email}</label>
        {props.editable ? (
          <InputField
            id="unit-email"
            placeholder={i18n.unitEditor.placeholder.email}
            value={form.email}
            onChange={(value) => updateForm({ email: value })}
            width="L"
          />
        ) : (
          form.email
        )}
      </FormPart>
      <FormPart>
        <label htmlFor="unit-url">{i18n.unitEditor.label.url}</label>
        {props.editable ? (
          <InputField
            id="unit-url"
            placeholder={i18n.unitEditor.placeholder.url}
            value={form.url}
            width="L"
            onChange={(value) => updateForm({ url: value })}
          />
        ) : (
          form.url && <Url href={form.url}>{form.url}</Url>
        )}
      </FormPart>
      <FormPart>
        <div>{showRequired(i18n.unitEditor.label.visitingAddress)}</div>
        <AddressEditor
          editable={props.editable}
          address={form.visitingAddress}
          onChange={(visitingAddress) => updateForm({ visitingAddress })}
          dataQaPrefix="visiting-address"
        />
      </FormPart>
      <FormPart>
        <label htmlFor="unit-location">{i18n.unitEditor.label.location}</label>
        {props.editable ? (
          <InputField
            id="unit-location"
            placeholder={i18n.unitEditor.placeholder.location}
            value={form.location}
            onChange={(value) => updateForm({ location: value })}
          />
        ) : (
          form.location && (
            <a href={`https://www.google.com/maps/place/${form.location}`}>
              {form.location}
            </a>
          )
        )}
      </FormPart>
      <FormPart>
        <div>{i18n.unitEditor.label.mailingAddress}</div>
        <AddressEditor
          editable={props.editable}
          address={form.mailingAddress}
          onChange={(mailingAddress) => updateForm({ mailingAddress })}
          dataQaPrefix="mailing-address"
        />
      </FormPart>
      <H3>{i18n.unitEditor.title.unitManager}</H3>
      <FormPart>
        <label htmlFor="unit-manager-name">
          {showRequired(i18n.unitEditor.label.unitManager.name)}
        </label>
        {props.editable ? (
          <InputField
            id="unit-manager-name"
            placeholder={i18n.unitEditor.placeholder.unitManager.name}
            value={unitManager.name}
            onChange={(value) => updateUnitManager({ name: value })}
            width="L"
            data-qa="manager-name-input"
          />
        ) : (
          <div data-qa="unit-manager-name">{unitManager.name}</div>
        )}
      </FormPart>
      <FormPart>
        <label htmlFor="unit-manager-phone">
          {showRequired(i18n.unitEditor.label.unitManager.phone)}
        </label>
        {props.editable ? (
          <InputField
            id="unit-manager-phone"
            placeholder={i18n.unitEditor.placeholder.phone}
            value={unitManager.phone}
            onChange={(value) => updateUnitManager({ phone: value })}
            data-qa="qa-unit-manager-phone-input-field"
          />
        ) : (
          <div data-qa="unit-manager-phone">{unitManager.phone}</div>
        )}
      </FormPart>
      <FormPart>
        <label htmlFor="unit-manager-email">
          {showRequired(i18n.unitEditor.label.unitManager.email)}
        </label>
        {props.editable ? (
          <InputField
            id="unit-manager-email"
            placeholder={i18n.unitEditor.placeholder.email}
            value={unitManager.email}
            onChange={(value) => updateUnitManager({ email: value })}
            width="L"
            data-qa="qa-unit-manager-email-input-field"
          />
        ) : (
          <div data-qa="unit-manager-email">{unitManager.email}</div>
        )}
      </FormPart>
      <H3>{i18n.unitEditor.title.decisionCustomization}</H3>
      <FormPart>
        <label htmlFor="unit-daycare-name">
          {i18n.unitEditor.label.decisionCustomization.daycareName}
        </label>
        {props.editable ? (
          <InputField
            id="unit-daycare-name"
            placeholder={i18n.unitEditor.placeholder.decisionCustomization.name}
            value={decisionCustomization.daycareName}
            width="L"
            onChange={(value) =>
              updateDecisionCustomization({
                daycareName: value
              })
            }
          />
        ) : (
          decisionCustomization.daycareName
        )}
      </FormPart>
      {featureFlags.preschool && (
        <>
          <FormPart>
            <label htmlFor="unit-preschool-name">
              {i18n.unitEditor.label.decisionCustomization.preschoolName}
            </label>
            {props.editable ? (
              <InputField
                id="unit-preschool-name"
                placeholder={
                  i18n.unitEditor.placeholder.decisionCustomization.name
                }
                value={decisionCustomization.preschoolName}
                width="L"
                onChange={(value) =>
                  updateDecisionCustomization({
                    preschoolName: value
                  })
                }
              />
            ) : (
              decisionCustomization.preschoolName
            )}
          </FormPart>
        </>
      )}
      <FormPart>
        <div>{i18n.unitEditor.label.decisionCustomization.handler}</div>
        {props.editable ? (
          <FixedSpaceColumn>
            {i18n.unitEditor.field.decisionCustomization.handler.map(
              (handler, index) => (
                <Radio
                  key={index}
                  label={handler}
                  checked={form.decisionCustomization.handler === handler}
                  onChange={() => updateDecisionCustomization({ handler })}
                />
              )
            )}
          </FixedSpaceColumn>
        ) : (
          form.decisionCustomization.handler
        )}
      </FormPart>
      <FormPart>
        <label htmlFor="unit-handler-address">
          {i18n.unitEditor.label.decisionCustomization.handlerAddress}
        </label>
        {props.editable ? (
          <AlertBoxContainer>
            <InputField
              id="unit-handler-address"
              placeholder={i18n.unitEditor.placeholder.streetAddress}
              value={decisionCustomization.handlerAddress}
              width="L"
              onChange={(value) =>
                updateDecisionCustomization({
                  handlerAddress: value
                })
              }
            />
            {props.editable &&
              !form.decisionCustomization.handlerAddress &&
              isMunicipalOrPurchasedOrServiceVoucherUnit() && (
                <AlertBox
                  message={i18n.unitEditor.warning.handlerAddressIsMandatory}
                  data-qa="handler-address-mandatory-warning"
                />
              )}
          </AlertBoxContainer>
        ) : (
          decisionCustomization.handlerAddress
        )}
      </FormPart>
      {props.editable && (
        <>
          <>
            {formErrors.map((error, key) => (
              <FormError key={key}>{error}</FormError>
            ))}
          </>
          <FixedSpaceRow>
            <Button
              onClick={() =>
                props.onClickCancel ? props.onClickCancel() : undefined
              }
              disabled={props.submit?.isLoading}
              text={i18n.common.cancel}
            />
            <Button
              primary
              type="submit"
              onClick={(e) => onClickSubmit(e)}
              disabled={props.submit?.isLoading}
              text={isNewUnit ? i18n.unitEditor.submitNew : i18n.common.save}
            />
          </FixedSpaceRow>
          {props.submit?.isFailure && <div>{i18n.common.error.unknown}</div>}
        </>
      )}
    </form>
  )
}
