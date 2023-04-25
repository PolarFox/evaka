// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useEffect, useMemo, useState } from 'react'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type { ServiceNeedReportRow } from 'lib-common/generated/api-types/reports'
import LocalDate from 'lib-common/local-date'
import Loader from 'lib-components/atoms/Loader'
import Title from 'lib-components/atoms/Title'
import ReturnButton from 'lib-components/atoms/buttons/ReturnButton'
import { Container, ContentArea } from 'lib-components/layout/Container'
import { Th, Tr, Td, Thead, Tbody } from 'lib-components/layout/Table'
import { DatePickerDeprecated } from 'lib-components/molecules/DatePickerDeprecated'

import type { DateFilters } from '../../api/reports'
import { getServiceNeedReport } from '../../api/reports'
import ReportDownload from '../../components/reports/ReportDownload'
import { useTranslation } from '../../state/i18n'

import { FilterLabel, FilterRow, TableScrollable } from './common'

interface DisplayFilters {
  careArea: string
}

const emptyDisplayFilters: DisplayFilters = {
  careArea: ''
}

export default React.memo(function ServiceNeeds() {
  const { i18n } = useTranslation()
  const [rows, setRows] = useState<Result<ServiceNeedReportRow[]>>(Loading.of())
  const [filters, setFilters] = useState<DateFilters>({
    date: LocalDate.todayInSystemTz()
  })

  const [displayFilters, setDisplayFilters] =
    useState<DisplayFilters>(emptyDisplayFilters)
  const displayFilter = (row: ServiceNeedReportRow): boolean => {
    return !(
      displayFilters.careArea && row.careAreaName !== displayFilters.careArea
    )
  }

  useEffect(() => {
    setRows(Loading.of())
    setDisplayFilters(emptyDisplayFilters)
    void getServiceNeedReport(filters).then(setRows)
  }, [filters])

  const filteredRows: ServiceNeedReportRow[] = useMemo(
    () => rows.map((rs) => rs.filter(displayFilter)).getOrElse([]),
    [rows, displayFilters] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <Container>
      <ReturnButton label={i18n.common.goBack} />
      <ContentArea opaque>
        <Title size={1}>{i18n.reports.serviceNeeds.title}</Title>
        <FilterRow>
          <FilterLabel>{i18n.reports.common.date}</FilterLabel>
          <DatePickerDeprecated
            date={filters.date}
            onChange={(date) => setFilters({ date })}
          />
        </FilterRow>

        {rows.isLoading && <Loader />}
        {rows.isFailure && <span>{i18n.common.loadingFailed}</span>}
        {rows.isSuccess && (
          <>
            <ReportDownload
              data={rows.value.map((row) => ({
                ...row
              }))}
              headers={[
                { label: 'Palvelualue', key: 'careAreaName' },
                { label: 'Yksikkö', key: 'unitName' },
                { label: 'Ikä', key: 'age' },
                { label: 'Kokopäiväinen', key: 'fullDay' },
                { label: 'Osapäiväinen', key: 'partDay' },
                { label: 'Kokoviikkoinen', key: 'fullWeek' },
                { label: 'Osaviikkoinne', key: 'partWeek' },
                { label: 'Vuorohoito', key: 'shiftCare' },
                { label: 'Palveluntarve puuttuu', key: 'missingServiceNeed' },
                { label: 'Lapsia yhteensä', key: 'total' }
              ]}
              filename={`Lapsien palvelutarpeet ja iät yksiköissä ${filters.date.formatIso()}.csv`}
            />
            <TableScrollable>
              <Thead>
                <Tr>
                  <Th>{i18n.reports.common.careAreaName}</Th>
                  <Th>{i18n.reports.common.unitName}</Th>
                  <Th>{i18n.reports.common.unitType}</Th>
                  <Th>{i18n.reports.common.unitProviderType}</Th>
                  <Th>{i18n.reports.serviceNeeds.age}</Th>
                  <Th>{i18n.reports.serviceNeeds.fullDay}</Th>
                  <Th>{i18n.reports.serviceNeeds.partDay}</Th>
                  <Th>{i18n.reports.serviceNeeds.fullWeek}</Th>
                  <Th>{i18n.reports.serviceNeeds.partWeek}</Th>
                  <Th>{i18n.reports.serviceNeeds.shiftCare}</Th>
                  <Th>{i18n.reports.serviceNeeds.missingServiceNeed}</Th>
                  <Th>{i18n.reports.serviceNeeds.total}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredRows.map((row: ServiceNeedReportRow) => (
                  <Tr key={`${row.unitName}:${row.age}`}>
                    <Td>{row.careAreaName}</Td>
                    <Td>{row.unitName}</Td>
                    <Td>
                      {row.unitType
                        ? i18n.reports.common.unitTypes[row.unitType]
                        : ''}
                    </Td>
                    <Td>
                      {
                        i18n.reports.common.unitProviderTypes[
                          row.unitProviderType
                        ]
                      }
                    </Td>
                    <Td>{row.age}</Td>
                    <Td>{row.fullDay}</Td>
                    <Td>{row.partDay}</Td>
                    <Td>{row.fullWeek}</Td>
                    <Td>{row.partWeek}</Td>
                    <Td>{row.shiftCare}</Td>
                    <Td>{row.missingServiceNeed}</Td>
                    <Td>{row.total}</Td>
                  </Tr>
                ))}
              </Tbody>
            </TableScrollable>
          </>
        )}
      </ContentArea>
    </Container>
  )
})
