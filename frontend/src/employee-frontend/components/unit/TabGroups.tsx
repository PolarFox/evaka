// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Dispatch, SetStateAction } from 'react'
import React, { useContext, useMemo } from 'react'

import type { Result } from 'lib-common/api'
import { combine } from 'lib-common/api'
import type { Action } from 'lib-common/generated/action'
import { ContentArea } from 'lib-components/layout/Container'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'

import Groups from '../../components/unit/tab-groups/Groups'
import MissingGroupPlacements from '../../components/unit/tab-groups/MissingGroupPlacements'
import { UnitContext } from '../../state/unit'
import { renderResult } from '../async-rendering'

import TerminatedPlacements from './tab-groups/TerminatedPlacements'

interface Props {
  reloadUnitData: () => void
  openGroups: Record<string, boolean>
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>
}

export default React.memo(function TabGroups({
  reloadUnitData,
  openGroups,
  setOpenGroups
}: Props) {
  const { unitInformation, unitData, filters, setFilters } =
    useContext(UnitContext)

  const groupPermittedActions: Result<
    Record<string, Set<Action.Group> | undefined>
  > = useMemo(
    () =>
      unitInformation.map((unitInformation) =>
        Object.fromEntries(
          unitInformation.groups.map(({ id, permittedActions }) => [
            id,
            permittedActions
          ])
        )
      ),
    [unitInformation]
  )

  return renderResult(
    combine(unitInformation, unitData, groupPermittedActions),
    ([unitInformation, unitData, groupPermittedActions], isReloading) => (
      <FixedSpaceColumn data-qa="unit-groups-page" data-loading={isReloading}>
        {unitData.recentlyTerminatedPlacements.length > 0 && (
          <ContentArea opaque data-qa="terminated-placements-section">
            <TerminatedPlacements
              recentlyTerminatedPlacements={
                unitData.recentlyTerminatedPlacements
              }
            />
          </ContentArea>
        )}

        {unitData.missingGroupPlacements.length > 0 && (
          <ContentArea opaque data-qa="missing-placements-section">
            <MissingGroupPlacements
              groups={unitData.groups}
              missingGroupPlacements={unitData.missingGroupPlacements}
              backupCares={unitData.backupCares}
              reloadUnitData={reloadUnitData}
              permittedPlacementActions={unitData.permittedPlacementActions}
              permittedBackupCareActions={unitData.permittedBackupCareActions}
            />
          </ContentArea>
        )}

        <ContentArea opaque>
          <Groups
            unit={unitInformation.daycare}
            permittedActions={unitInformation.permittedActions}
            filters={filters}
            setFilters={setFilters}
            groups={unitData.groups}
            placements={unitData.placements}
            backupCares={unitData.backupCares}
            groupPermittedActions={groupPermittedActions}
            groupCaretakers={unitData.caretakers.groupCaretakers}
            groupConfirmedOccupancies={unitData.groupOccupancies?.confirmed}
            groupRealizedOccupancies={unitData.groupOccupancies?.realized}
            permittedBackupCareActions={unitData.permittedBackupCareActions}
            permittedGroupPlacementActions={
              unitData.permittedGroupPlacementActions
            }
            unitChildrenCapacityFactors={unitData.unitChildrenCapacityFactors}
            reloadUnitData={reloadUnitData}
            openGroups={openGroups}
            setOpenGroups={setOpenGroups}
          />
        </ContentArea>
      </FixedSpaceColumn>
    )
  )
})
