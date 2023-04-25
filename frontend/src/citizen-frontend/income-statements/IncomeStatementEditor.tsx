// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Result } from 'lib-common/api'
import { combine, Loading, Success } from 'lib-common/api'
import type LocalDate from 'lib-common/local-date'
import { useMutationResult, useQueryResult } from 'lib-common/query'
import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import Main from 'lib-components/atoms/Main'

import { renderResult } from '../async-rendering'

import type { IncomeStatementFormAPI } from './IncomeStatementComponents'
import IncomeStatementForm from './IncomeStatementForm'
import {
  createIncomeStatementMutation,
  incomeStatementQuery,
  incomeStatementStartDatesQuery,
  updateIncomeStatementMutation
} from './queries'
import { fromBody } from './types/body'
import * as Form from './types/form'
import { initialFormData } from './types/form'

interface EditorState {
  id: string | undefined
  startDates: LocalDate[]
  formData: Form.IncomeStatementForm
}

function useInitialEditorState(id: UUID | undefined): Result<EditorState> {
  const incomeStatement = useQueryResult(incomeStatementQuery(id ?? ''), {
    enabled: !!id
  })
  const startDates = useQueryResult(incomeStatementStartDatesQuery)

  return combine(id ? incomeStatement : Success.of(undefined), startDates).map(
    ([incomeStatement, startDates]) => ({
      id,
      startDates,
      formData:
        incomeStatement === undefined
          ? initialFormData(startDates)
          : Form.fromIncomeStatement(incomeStatement)
    })
  )
}

export default React.memo(function IncomeStatementEditor() {
  const params = useNonNullableParams<{ incomeStatementId: string }>()
  const navigate = useNavigate()
  const incomeStatementId =
    params.incomeStatementId === 'new' ? undefined : params.incomeStatementId

  const [state, setState] = useState<Result<EditorState>>(Loading.of())
  const initialEditorState = useInitialEditorState(incomeStatementId)
  if (state.isLoading && initialEditorState.isSuccess) {
    setState(initialEditorState)
  }

  const [showFormErrors, setShowFormErrors] = useState(false)

  const navigateToList = useCallback(() => {
    navigate('/income')
  }, [navigate])

  const form = useRef<IncomeStatementFormAPI | null>(null)

  const updateFormData = useCallback(
    (fn: (prev: Form.IncomeStatementForm) => Form.IncomeStatementForm): void =>
      setState((prev) =>
        prev.map((state) => ({ ...state, formData: fn(state.formData) }))
      ),
    []
  )

  const { mutateAsync: createIncomeStatement } = useMutationResult(
    createIncomeStatementMutation
  )
  const { mutateAsync: updateIncomeStatement } = useMutationResult(
    updateIncomeStatementMutation
  )

  return renderResult(state, (state) => {
    const { id, formData, startDates } = state

    const save = () => {
      const validatedData = formData ? fromBody('adult', formData) : undefined
      if (validatedData) {
        if (id) {
          return updateIncomeStatement({ id, body: validatedData })
        } else {
          return createIncomeStatement(validatedData)
        }
      } else {
        setShowFormErrors(true)
        if (form.current) form.current.scrollToErrors()
        return
      }
    }

    return (
      <Main>
        <IncomeStatementForm
          incomeStatementId={id}
          formData={formData}
          showFormErrors={showFormErrors}
          otherStartDates={startDates}
          onChange={updateFormData}
          onSave={save}
          onSuccess={navigateToList}
          onCancel={navigateToList}
          ref={form}
        />
      </Main>
    )
  })
})
