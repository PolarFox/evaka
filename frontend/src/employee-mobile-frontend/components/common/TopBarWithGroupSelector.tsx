// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserContext } from 'employee-mobile-frontend/state/user'
import { combine } from 'lib-common/api'
import type { GroupInfo } from 'lib-common/generated/api-types/attendance'
import type { UUID } from 'lib-common/types'
import { Gap } from 'lib-components/white-space'

import { UnitContext } from '../../state/unit'

import type { CountInfo } from './GroupSelector'
import { GroupSelectorBar } from './GroupSelectorBar'
import TopBar from './TopBar'

export type TopBarWithGroupSelectorProps = {
  selectedGroup: GroupInfo | undefined
  onChangeGroup: (group: GroupInfo | undefined) => void
  includeSelectAll?: boolean
  toggleSearch?: () => void
  countInfo?: CountInfo | undefined
  allowedGroupIds?: UUID[] | undefined
}

export default React.memo(function TopBarWithGroupSelector({
  onChangeGroup,
  toggleSearch,
  selectedGroup,
  countInfo,
  includeSelectAll = true,
  allowedGroupIds = undefined
}: TopBarWithGroupSelectorProps) {
  const navigate = useNavigate()
  const { user } = useContext(UserContext)
  const { unitInfoResponse } = useContext(UnitContext)

  const topBarProps = useMemo(() => {
    return combine(user, unitInfoResponse)
      .map(([user, unitInfo]) => {
        const title = unitInfo.name
        const onBack =
          user && user.unitIds.length > 1 ? () => navigate('/units') : undefined
        return { title, onBack }
      })
      .getOrElse({ title: '' })
  }, [navigate, user, unitInfoResponse])

  const groups: GroupInfo[] = useMemo(
    () =>
      unitInfoResponse
        .map(({ groups }) => groups)
        .getOrElse([])
        .filter(
          (g) =>
            allowedGroupIds === undefined ||
            allowedGroupIds.findIndex((gid) => gid === g.id) > -1
        ),
    [unitInfoResponse, allowedGroupIds]
  )

  return (
    <>
      <TopBar {...topBarProps} />
      <Gap size="xxs" />
      <GroupSelectorBar
        selectedGroup={selectedGroup}
        onChangeGroup={onChangeGroup}
        onSearch={toggleSearch}
        countInfo={countInfo}
        groups={groups}
        includeSelectAll={includeSelectAll}
      />
    </>
  )
})
