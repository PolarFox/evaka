// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useNavigate } from 'react-router-dom'
import { animated, useSpring } from 'react-spring'
import styled from 'styled-components'

import type {
  AttendanceResponse,
  Child,
  GroupInfo
} from 'lib-common/generated/api-types/attendance'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { ContentArea } from 'lib-components/layout/Container'
import colors from 'lib-customizations/common'

import { ChildAttendanceContext } from '../../state/child-attendance'
import { useTranslation } from '../../state/i18n'
import { UnitContext } from '../../state/unit'
import type { ChildAttendanceUIState } from '../../types'
import { mapChildAttendanceUIState } from '../../types'
import { renderResult } from '../async-rendering'
import FreeTextSearch from '../common/FreeTextSearch'
import { PageWithNavigation } from '../common/PageWithNavigation'
import { zIndex } from '../constants'

import AttendanceList from './AttendanceList'
import ChildList from './ChildList'

export default React.memo(function AttendancePageWrapper() {
  const { unitId, groupId, attendanceStatus } = useNonNullableParams<{
    unitId: string
    groupId: string
    attendanceStatus: ChildAttendanceUIState
  }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { unitInfoResponse } = useContext(UnitContext)

  const selectedGroup = useMemo(
    () =>
      groupId === 'all'
        ? undefined
        : unitInfoResponse
            .map((res) => res.groups.find((g) => g.id === groupId))
            .getOrElse(undefined),
    [groupId, unitInfoResponse]
  )

  const { attendanceResponse } = useContext(ChildAttendanceContext)

  const [showSearch, setShowSearch] = useState<boolean>(false)

  const changeGroup = useCallback(
    (group: GroupInfo | undefined) => {
      navigate(
        `/units/${unitId}/groups/${
          group?.id ?? 'all'
        }/child-attendance/list/${attendanceStatus}`
      )
    },
    [navigate, unitId, attendanceStatus]
  )

  const toggleSearch = useCallback(() => setShowSearch((show) => !show), [])

  const countInfo = useMemo(
    () => ({
      getTotalCount: (groupId: string | undefined) =>
        attendanceResponse
          .map((res) =>
            groupId === undefined
              ? res.children.length
              : res.children.filter((child) => child.groupId === groupId).length
          )
          .getOrElse(0),
      getPresentCount: (groupId: string | undefined) =>
        attendanceResponse
          .map((res) =>
            res.children.filter((child) => child.status === 'PRESENT')
          )
          .map((children) =>
            groupId === undefined
              ? children.length
              : children.filter((child) => child.groupId === groupId).length
          )
          .getOrElse(0),
      infoText: i18n.attendances.chooseGroupInfo
    }),
    [i18n, attendanceResponse]
  )

  return (
    <>
      {attendanceResponse.isSuccess && (
        <ChildSearch
          unitId={unitId}
          show={showSearch}
          toggleShow={toggleSearch}
          attendanceResponse={attendanceResponse.value}
        />
      )}
      <PageWithNavigation
        selected="child"
        selectedGroup={selectedGroup}
        onChangeGroup={changeGroup}
        toggleSearch={toggleSearch}
        countInfo={countInfo}
      >
        {renderResult(attendanceResponse, (attendance) => (
          <AttendanceList
            unitId={unitId}
            groupId={groupId}
            attendanceStatus={mapChildAttendanceUIState(attendanceStatus)}
            attendanceResponse={attendance}
          />
        ))}
      </PageWithNavigation>
    </>
  )
})

const ChildSearch = React.memo(function Search({
  unitId,
  show,
  toggleShow,
  attendanceResponse
}: {
  unitId: string
  show: boolean
  toggleShow: () => void
  attendanceResponse: AttendanceResponse
}) {
  const { i18n } = useTranslation()
  const containerSpring = useSpring<{ x: number }>({ x: show ? 1 : 0 })
  const [freeText, setFreeText] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Child[]>([])

  useEffect(() => {
    if (freeText === '') {
      setSearchResults([])
    } else {
      const filteredData = attendanceResponse.children.filter(
        (ac) =>
          ac.firstName.toLowerCase().includes(freeText.toLowerCase()) ||
          ac.lastName.toLowerCase().includes(freeText.toLowerCase())
      )
      setSearchResults(filteredData)
    }
  }, [freeText, attendanceResponse])

  return (
    <SearchContainer
      style={{ height: containerSpring.x.to((x) => `${100 * x}%`) }}
    >
      <ContentArea
        opaque={false}
        paddingVertical="zero"
        paddingHorizontal="zero"
      >
        <FreeTextSearch
          value={freeText}
          setValue={setFreeText}
          placeholder={i18n.attendances.searchPlaceholder}
          background={colors.grayscale.g0}
          setShowSearch={toggleShow}
          searchResults={searchResults}
        />
        <ChildList
          unitId={unitId}
          attendanceChildren={searchResults}
          groupsNotes={attendanceResponse.groupNotes}
        />
      </ContentArea>
    </SearchContainer>
  )
})

const SearchContainer = animated(styled.div`
  position: absolute;
  background: ${colors.grayscale.g4};
  width: 100vw;
  overflow: hidden;
  z-index: ${zIndex.searchBar};
`)
