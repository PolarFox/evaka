// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type { DuplicatePeopleReportRow } from 'lib-common/generated/api-types/reports'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'
import Loader from 'lib-components/atoms/Loader'
import Title from 'lib-components/atoms/Title'
import Button from 'lib-components/atoms/buttons/Button'
import ReturnButton from 'lib-components/atoms/buttons/ReturnButton'
import Checkbox from 'lib-components/atoms/form/Checkbox'
import { Container, ContentArea } from 'lib-components/layout/Container'
import { Th, Tr, Td, Thead, Tbody } from 'lib-components/layout/Table'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { colors } from 'lib-customizations/common'
import { featureFlags } from 'lib-customizations/employee'
import { faQuestion } from 'lib-icons'

import { deletePerson, mergePeople } from '../../api/person'
import type { DuplicatePeopleFilters } from '../../api/reports'
import { getDuplicatePeopleReport } from '../../api/reports'
import { CHILD_AGE } from '../../constants'
import { useTranslation } from '../../state/i18n'
import { UIContext } from '../../state/ui'

import { FilterRow, TableScrollable } from './common'

interface RowProps {
  odd: boolean
}

const StyledRow = styled(Tr)<RowProps>`
  ${(props) => (props.odd ? `background: ${colors.main.m4};` : '')}
`
const NoWrapTd = styled(Td)`
  white-space: nowrap;
`

interface Selection {
  group: number
  row: number
}

const hasReferences = (row: DuplicatePeopleReportRow) =>
  row.referenceCounts.find(({ count }) => count > 0) !== undefined

const isChild = (dateOfBirth: LocalDate) => {
  const age = LocalDate.todayInSystemTz().differenceInYears(dateOfBirth)
  return age < CHILD_AGE
}

export default React.memo(function DuplicatePeople() {
  const { i18n } = useTranslation()
  const [rows, setRows] = useState<Result<DuplicatePeopleReportRow[]>>(
    Loading.of()
  )
  const [duplicate, setDuplicate] = useState<Selection | null>(null)
  const [master, setMaster] = useState<Selection | null>(null)
  const [deleteId, setDeleteId] = useState<UUID | null>(null)
  const { setErrorMessage } = useContext(UIContext)

  const [filters, setFilters] = useState<DuplicatePeopleFilters>({
    showIntentionalDuplicates: !featureFlags.experimental?.personDuplicate
  })

  const loadData = useCallback(() => {
    setRows(Loading.of())
    void getDuplicatePeopleReport(filters).then(setRows)
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <Container>
      <ReturnButton label={i18n.common.goBack} />
      <ContentArea opaque>
        <Title size={1}>{i18n.reports.duplicatePeople.title}</Title>
        {featureFlags.experimental?.personDuplicate && (
          <FilterRow>
            <Checkbox
              onChange={(checkedValue) =>
                setFilters({
                  ...filters,
                  showIntentionalDuplicates: checkedValue
                })
              }
              label={
                i18n.reports.duplicatePeople.filters.showIntentionalDuplicates
              }
              checked={filters.showIntentionalDuplicates}
            />
          </FilterRow>
        )}
        {rows.isLoading && <Loader />}
        {rows.isFailure && <span>{i18n.common.loadingFailed}</span>}
        {rows.isSuccess && (
          <>
            <TableScrollable>
              <Thead>
                <Tr>
                  <Th>Henkilön nimi</Th>
                  <Th>Hetu</Th>
                  <Th>Synt.aika</Th>
                  <Th>Katuosoite</Th>
                  <Th />
                  <Th />

                  {rows.isSuccess && rows.value.length > 0
                    ? rows.value[0].referenceCounts
                        .map(({ table, column }) => `${table}.${column}`)
                        .map((key) => (
                          <Th key={key}>
                            {i18n.reports.duplicatePeople.columns[
                              key as keyof typeof i18n.reports.duplicatePeople.columns
                            ] ?? key}
                          </Th>
                        ))
                    : null}
                </Tr>
              </Thead>
              <Tbody>
                {rows.value.map((row: DuplicatePeopleReportRow) => (
                  <StyledRow key={row.id} odd={row.groupIndex % 2 != 0}>
                    <NoWrapTd>
                      <Link
                        to={
                          isChild(row.dateOfBirth)
                            ? `/child-information/${row.id}`
                            : `/profile/${row.id}`
                        }
                      >
                        {row.lastName} {row.firstName}
                      </Link>
                    </NoWrapTd>
                    <NoWrapTd>{row.socialSecurityNumber}</NoWrapTd>
                    <NoWrapTd>{row.dateOfBirth.format()}</NoWrapTd>
                    <NoWrapTd>{row.streetAddress}</NoWrapTd>
                    <NoWrapTd>
                      {duplicate ? (
                        duplicate.group == row.groupIndex ? (
                          duplicate.row == row.duplicateNumber ? (
                            <Button
                              className="inline"
                              onClick={() => setDuplicate(null)}
                              text={i18n.common.cancel}
                            />
                          ) : (
                            <Button
                              className="inline"
                              onClick={() =>
                                setMaster({
                                  group: row.groupIndex,
                                  row: row.duplicateNumber
                                })
                              }
                              text={i18n.reports.duplicatePeople.moveTo}
                            />
                          )
                        ) : null
                      ) : (
                        <Button
                          className="inline"
                          disabled={!hasReferences(row)}
                          onClick={() =>
                            setDuplicate({
                              group: row.groupIndex,
                              row: row.duplicateNumber
                            })
                          }
                          text={i18n.reports.duplicatePeople.moveFrom}
                        />
                      )}
                    </NoWrapTd>
                    <NoWrapTd>
                      <Button
                        className="inline"
                        disabled={duplicate != null || hasReferences(row)}
                        onClick={() => setDeleteId(row.id)}
                        text={i18n.common.remove}
                      />
                    </NoWrapTd>
                    {row.referenceCounts.map(({ table, column, count }) => (
                      <NoWrapTd key={`${table}.${column}`}>{count}</NoWrapTd>
                    ))}
                  </StyledRow>
                ))}
              </Tbody>
            </TableScrollable>
            {master && duplicate && (
              <InfoModal
                type="warning"
                title={i18n.reports.duplicatePeople.confirmMoveTitle}
                icon={faQuestion}
                reject={{
                  action: () => {
                    setMaster(null)
                    setDuplicate(null)
                  },
                  label: i18n.common.cancel
                }}
                resolve={{
                  action: () => {
                    const masterId = rows.value.find(
                      (row) =>
                        row.groupIndex == master.group &&
                        row.duplicateNumber == master.row
                    )?.id
                    const duplicateId = rows.value.find(
                      (row) =>
                        row.groupIndex == duplicate.group &&
                        row.duplicateNumber == duplicate.row
                    )?.id

                    setMaster(null)
                    setDuplicate(null)

                    if (masterId && duplicateId) {
                      void mergePeople(masterId, duplicateId).then((res) => {
                        if (res.isFailure) {
                          setErrorMessage({
                            type: 'error',
                            title: i18n.reports.duplicatePeople.errorTitle,
                            text: i18n.reports.duplicatePeople.errorText,
                            resolveLabel: i18n.common.ok
                          })
                        }
                        loadData()
                      })
                    }
                  },
                  label: i18n.common.confirm
                }}
              />
            )}
            {!!deleteId && (
              <InfoModal
                type="warning"
                title={i18n.reports.duplicatePeople.confirmDeleteTitle}
                icon={faQuestion}
                reject={{
                  action: () => {
                    setDeleteId(null)
                  },
                  label: i18n.common.cancel
                }}
                resolve={{
                  action: () => {
                    void deletePerson(deleteId).then(loadData)
                    setDeleteId(null)
                  },
                  label: i18n.common.remove
                }}
              />
            )}
          </>
        )}
      </ContentArea>
    </Container>
  )
})
