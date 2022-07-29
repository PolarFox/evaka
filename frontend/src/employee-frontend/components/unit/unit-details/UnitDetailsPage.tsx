// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect, useState } from 'react'

import type { Result } from 'lib-common/api'
import { combine, Loading } from 'lib-common/api'
import type {
  DaycareCareArea,
  DaycareFields
} from 'lib-common/generated/api-types/daycare'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { Container, ContentArea } from 'lib-components/layout/Container'
import { Gap } from 'lib-components/white-space'

import { getAreas } from '../../../api/daycare'
import { getEmployees } from '../../../api/employees'
import type { UnitResponse } from '../../../api/unit'
import { getDaycare, updateDaycare } from '../../../api/unit'
import UnitEditor from '../../../components/unit/unit-details/UnitEditor'
import type { FinanceDecisionHandlerOption } from '../../../state/invoicing-ui'
import type { TitleState } from '../../../state/title'
import { TitleContext } from '../../../state/title'
import { renderResult } from '../../async-rendering'

export default React.memo(function UnitDetailsPage() {
  const { id } = useNonNullableParams<{ id: string }>()
  const { setTitle } = useContext<TitleState>(TitleContext)
  const [unit, setUnit] = useState<Result<UnitResponse>>(Loading.of())
  const [areas, setAreas] = useState<Result<DaycareCareArea[]>>(Loading.of())
  const [financeDecisionHandlerOptions, setFinanceDecisionHandlerOptions] =
    useState<Result<FinanceDecisionHandlerOption[]>>(Loading.of())
  const [editable, setEditable] = useState(false)
  const [submitState, setSubmitState] = useState<Result<void> | undefined>(
    undefined
  )
  useEffect(() => {
    if (unit.isSuccess) {
      setTitle(unit.value.daycare.name)
    }
  }, [setTitle, unit])

  useEffect(() => {
    void getAreas().then(setAreas)
    void getEmployees().then((employeesResponse) => {
      setFinanceDecisionHandlerOptions(
        employeesResponse.map((employees) =>
          employees.map((employee) => ({
            value: employee.id,
            label: `${employee.firstName ?? ''} ${employee.lastName ?? ''}${
              employee.email ? ` (${employee.email})` : ''
            }`
          }))
        )
      )
    })
    void getDaycare(id).then(setUnit)
  }, [id])

  const onSubmit = (fields: DaycareFields, currentUnit: UnitResponse) => {
    if (!id) return
    setSubmitState(Loading.of())
    void updateDaycare(id, fields).then((result) => {
      if (result.isSuccess) {
        setUnit(result.map((r) => ({ ...currentUnit, daycare: r })))
        setEditable(false)
      }
      setSubmitState(result.map((_r) => undefined))
    })
  }

  return (
    <Container>
      <ContentArea opaque>
        <Gap size="xs" />
        {renderResult(
          combine(areas, unit, financeDecisionHandlerOptions),
          ([areas, unit, financeDecisionHandlerOptions]) => (
            <UnitEditor
              editable={editable}
              areas={areas}
              financeDecisionHandlerOptions={financeDecisionHandlerOptions}
              unit={unit.daycare}
              submit={submitState}
              onSubmit={(fields) => onSubmit(fields, unit)}
              onClickCancel={() => setEditable(false)}
              onClickEdit={() => setEditable(true)}
            />
          )
        )}
      </ContentArea>
    </Container>
  )
})
