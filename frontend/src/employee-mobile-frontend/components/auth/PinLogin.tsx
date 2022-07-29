// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import sortBy from 'lodash/sortBy'
import type { FormEventHandler } from 'react'
import React, { useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import Button from 'lib-components/atoms/buttons/Button'
import Select from 'lib-components/atoms/dropdowns/Select'
import { ContentArea } from 'lib-components/layout/Container'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import { PlainPinInput } from 'lib-components/molecules/PinInput'
import { H1, Label } from 'lib-components/typography'
import { defaultMargins, Gap } from 'lib-components/white-space'

import { pinLogin } from '../../api/auth'
import { ChildAttendanceContext } from '../../state/child-attendance'
import { useTranslation } from '../../state/i18n'
import { UnitContext } from '../../state/unit'
import { UserContext } from '../../state/user'
import TopBar from '../common/TopBar'

interface EmployeeOption {
  name: string
  id: string
}

const PinLoginForm = React.memo(function PinLoginForm() {
  const { i18n } = useTranslation()
  const { user, refreshAuthStatus } = useContext(UserContext)
  const { unitInfoResponse } = useContext(UnitContext)
  const employeeId = user.map((u) => u?.employeeId ?? null).getOrElse(null)
  const showEmployeeSelection = employeeId === null

  const employeeOptions = useMemo<EmployeeOption[]>(
    () =>
      showEmployeeSelection
        ? sortBy(
            unitInfoResponse
              .map(({ staff }) => staff.filter(({ pinSet }) => pinSet))
              .getOrElse([]),
            ({ lastName }) => lastName,
            ({ firstName }) => firstName
          ).map((staff) => ({
            name: `${staff.lastName} ${staff.firstName}`,
            id: staff.id
          }))
        : [],
    [showEmployeeSelection, unitInfoResponse]
  )

  const [employee, setEmployee] = useState<EmployeeOption | null>(null)
  const selectEmployee = useCallback(
    (e: EmployeeOption | null) => setEmployee(e),
    []
  )
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedEmployeeId = showEmployeeSelection ? employee?.id : employeeId
  const valid = pin.length === 4 && selectedEmployeeId

  const submit = useCallback<FormEventHandler>(
    (e) => {
      e.preventDefault()
      if (!valid) {
        return
      }
      setSubmitting(true)
      setError('')
      return pinLogin(selectedEmployeeId, pin).then((res) => {
        setSubmitting(false)
        if (res.isSuccess) {
          if (res.value.status === 'SUCCESS') {
            refreshAuthStatus()
          } else {
            setError(i18n.pin.status[res.value.status])
          }
        } else if (res.isFailure) {
          setError(i18n.pin.unknownError)
        }
      })
    },
    [
      selectedEmployeeId,
      i18n.pin.status,
      i18n.pin.unknownError,
      pin,
      refreshAuthStatus,
      valid
    ]
  )

  return (
    <>
      <H1 centered noMargin>
        {i18n.pin.header}
      </H1>
      <Gap />
      <form onSubmit={submit}>
        <FixedSpaceColumn>
          {showEmployeeSelection && (
            <>
              <Label htmlFor="employee">{i18n.pin.staff}</Label>
              <Select
                id="employee"
                items={employeeOptions}
                selectedItem={employee}
                onChange={selectEmployee}
                placeholder={i18n.pin.selectStaff}
                getItemValue={({ id }) => id}
                getItemLabel={({ name }) => name}
                data-qa="select-staff"
              />
            </>
          )}

          <Label htmlFor="pin">{i18n.pin.pinCode}</Label>
          <PlainPinInput
            id="pin"
            value={pin}
            onChange={setPin}
            info={error ? { text: error, status: 'warning' } : undefined}
          />

          <Gap size="s" />

          <Button
            primary
            disabled={!valid || submitting}
            text={i18n.pin.login}
            onClick={submit}
            data-qa="pin-submit"
          />
        </FixedSpaceColumn>
      </form>
    </>
  )
})

export const PinLogin = React.memo(function PinLogin() {
  const { unitInfoResponse } = useContext(UnitContext)
  const { attendanceResponse } = useContext(ChildAttendanceContext)
  const { childId } = useNonNullableParams<{ childId: UUID }>()

  const navigate = useNavigate()
  const onClose = useCallback(() => navigate(-1), [navigate])

  const title = childId
    ? attendanceResponse
        .map((a) => a.children.find((c) => c.id === childId))
        .map((c) => (c ? `${c.firstName} ${c.lastName}` : ''))
        .getOrElse('')
    : unitInfoResponse.map((u) => u.name).getOrElse('')

  return (
    <>
      <TopBar title={title} onClose={onClose} />
      <ContentArea
        opaque
        paddingHorizontal={defaultMargins.s}
        paddingVertical={defaultMargins.s}
      >
        <PinLoginForm />
      </ContentArea>
    </>
  )
})
