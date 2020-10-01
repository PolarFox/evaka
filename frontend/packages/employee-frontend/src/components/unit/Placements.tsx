// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useState } from 'react'
import _ from 'lodash'

import {
  Table,
  Td,
  Th,
  Tr,
  Thead,
  Tbody
} from '~components/shared/layout/Table'
import Title from '~components/shared/atoms/Title'
import InlineButton from '~components/shared/atoms/buttons/InlineButton'
import { faArrowRight } from 'icon-set'
import { useTranslation } from '~state/i18n'
import {
  DaycareGroupPlacementDetailed,
  flatMapGroupPlacements,
  DaycareGroup,
  DaycarePlacement
} from '~types/unit'
import GroupPlacementModal from '~components/unit/placements/GroupPlacementModal'
import { UIContext } from '~state/ui'
import { Translations } from '~assets/i18n'
import { Link } from 'react-router-dom'
import CareTypeLabel, {
  careTypesFromPlacementType
} from '~components/common/CareTypeLabel'
import { UnitBackupCare } from '~types/child'
import BackupCareGroupModal from './placements/BackupCareGroupModal'
import { formatName } from '~utils'
import { UnitFilters } from '~utils/UnitFilters'
import { rangesOverlap } from '~utils/date'

function renderMissingPlacementRow(
  missingPlacement: DaycareGroupPlacementDetailed,
  onAddToGroup: () => void,
  i18n: Translations,
  savePosition: () => void,
  canManageChildren: boolean
) {
  const {
    child,
    daycarePlacementStartDate,
    daycarePlacementEndDate,
    startDate,
    endDate,
    type
  } = missingPlacement

  return (
    <Tr
      key={`${child.id}:${type}:${daycarePlacementStartDate.formatIso()}`}
      data-qa="missing-placement-row"
    >
      <Td data-qa="child-name">
        <Link to={`/child-information/${child.id}`} onClick={savePosition}>
          {formatName(child.firstName, child.lastName, i18n, true)}
        </Link>
      </Td>
      <Td data-qa="child-dob">{child.dateOfBirth.format()}</Td>
      <Td data-qa="placement-duration">
        {`${daycarePlacementStartDate.format()} - ${daycarePlacementEndDate.format()}`}
      </Td>
      {canManageChildren ? (
        <Td data-qa="group-missing-duration">
          {`${startDate.format()} - ${endDate.format()}`}
        </Td>
      ) : null}
      <Td data-qa="placement-type">{careTypesFromPlacementType(type)}</Td>
      {canManageChildren ? (
        <Td>
          <InlineButton
            onClick={() => onAddToGroup()}
            icon={faArrowRight}
            dataQa="add-to-group-btn"
            text={i18n.unit.placements.addToGroup}
          />
        </Td>
      ) : null}
    </Tr>
  )
}

function renderBackupCareRow(
  { id, child, period }: UnitBackupCare,
  onAddToGroup: () => void,
  i18n: Translations,
  savePosition: () => void,
  canManageChildren: boolean
) {
  return (
    <Tr key={id} data-qa="missing-placement-row">
      <Td data-qa="child-name">
        <Link to={`/child-information/${child.id}`} onClick={savePosition}>
          {formatName(child.firstName, child.lastName, i18n, true)}
        </Link>
      </Td>
      <Td data-qa="child-dob">{child.birthDate.format()}</Td>
      <Td data-qa="placement-duration">
        {`${period.start.format()} - ${period.end.format()}`}
      </Td>
      {canManageChildren ? (
        <Td data-qa="group-missing-duration">
          {`${period.start.format()} - ${period.end.format()}`}
        </Td>
      ) : null}
      <Td data-qa="placement-type">
        <CareTypeLabel type="backup-care" />
      </Td>
      {canManageChildren ? (
        <Td>
          <InlineButton
            onClick={() => onAddToGroup()}
            icon={faArrowRight}
            dataQa="add-to-group-btn"
            text={i18n.unit.placements.addToGroup}
          />
        </Td>
      ) : null}
    </Tr>
  )
}

type Props = {
  canManageChildren: boolean
  filters: UnitFilters
  groups: DaycareGroup[]
  placements: DaycarePlacement[]
  backupCares: UnitBackupCare[]
  savePosition: () => void
  loadUnitData: () => void
}

export default React.memo(function Placements({
  canManageChildren,
  filters,
  groups,
  placements,
  backupCares,
  savePosition,
  loadUnitData
}: Props) {
  const { i18n } = useTranslation()
  const { uiMode, toggleUiMode } = useContext(UIContext)
  const [
    activeMissingPlacement,
    setActiveMissingPlacement
  ] = useState<DaycareGroupPlacementDetailed | null>(null)
  const [
    activeBackupCare,
    setActiveBackupCare
  ] = useState<UnitBackupCare | null>(null)

  const addPlacementToGroup = (
    missingPlacement: DaycareGroupPlacementDetailed
  ) => {
    setActiveMissingPlacement(missingPlacement)
    toggleUiMode('group-placement')
  }

  const addBackupCareToGroup = (backupCare: UnitBackupCare) => {
    setActiveBackupCare(backupCare)
    toggleUiMode('backup-care-group')
  }

  const missingPlacements: DaycareGroupPlacementDetailed[] = flatMapGroupPlacements(
    placements
  )
    .filter(({ groupId }) => !groupId)
    .filter((missingPlacement) => {
      if (filters.endDate == null) {
        return !missingPlacement.endDate.isBefore(filters.startDate)
      } else {
        return rangesOverlap(missingPlacement, filters)
      }
    })

  const incompleteBackupCare: Array<
    DaycareGroupPlacementDetailed | UnitBackupCare
  > = backupCares.filter((backupCare) => !backupCare.group)

  const sortedRows = _.sortBy(incompleteBackupCare.concat(missingPlacements), [
    (p: DaycareGroupPlacementDetailed | UnitBackupCare) => p.child.lastName,
    (p: DaycareGroupPlacementDetailed | UnitBackupCare) => p.child.firstName,
    (p: DaycareGroupPlacementDetailed | UnitBackupCare) =>
      'type' in p ? p.daycarePlacementStartDate : p.period.start,
    (p: DaycareGroupPlacementDetailed | UnitBackupCare) =>
      'type' in p ? p.startDate : p.period.start
  ])

  return (
    <>
      <Title size={2}>{i18n.unit.placements.title}</Title>
      <div
        className="table-of-missing-groups"
        data-qa="table-of-missing-groups"
      >
        <Table data-qa="table-of-missing-groups" className="compact">
          <Thead>
            <Tr>
              <Th>{i18n.unit.placements.name}</Th>
              <Th>{i18n.unit.placements.birthday}</Th>
              <Th>{i18n.unit.placements.placementDuration}</Th>
              {canManageChildren ? (
                <Th>{i18n.unit.placements.missingGroup}</Th>
              ) : null}
              <Th>{i18n.unit.placements.type}</Th>
              {canManageChildren ? <Th /> : null}
            </Tr>
          </Thead>
          <Tbody>
            {sortedRows.map((row) =>
              'type' in row
                ? renderMissingPlacementRow(
                    row,
                    () => addPlacementToGroup(row),
                    i18n,
                    savePosition,
                    canManageChildren
                  )
                : renderBackupCareRow(
                    row,
                    () => addBackupCareToGroup(row),
                    i18n,
                    savePosition,
                    canManageChildren
                  )
            )}
          </Tbody>
        </Table>
      </div>
      {uiMode == 'group-placement' && activeMissingPlacement && (
        <GroupPlacementModal
          groups={groups}
          missingPlacement={activeMissingPlacement}
          reload={loadUnitData}
        />
      )}
      {uiMode == 'backup-care-group' && activeBackupCare && (
        <BackupCareGroupModal
          backupCare={activeBackupCare}
          groups={groups}
          reload={loadUnitData}
        />
      )}
    </>
  )
})
