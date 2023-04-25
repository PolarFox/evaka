// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { ChildContext } from 'employee-frontend/state'
import type { Failure } from 'lib-common/api'
import FiniteDateRange from 'lib-common/finite-date-range'
import type { Action } from 'lib-common/generated/action'
import type { DaycarePlacementWithDetails } from 'lib-common/generated/api-types/placement'
import type { ServiceNeedOption } from 'lib-common/generated/api-types/serviceneed'
import LocalDate from 'lib-common/local-date'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { DatePickerDeprecated } from 'lib-components/molecules/DatePickerDeprecated'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { fontWeights } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'
import { faQuestion } from 'lib-icons'

import type { PlacementUpdate } from '../../../api/child/placements'
import { deletePlacement, updatePlacement } from '../../../api/child/placements'
import Toolbar from '../../../components/common/Toolbar'
import ToolbarAccordion, {
  RestrictedToolbar
} from '../../../components/common/ToolbarAccordion'
import { useTranslation } from '../../../state/i18n'
import type { UiState } from '../../../state/ui'
import { UIContext } from '../../../state/ui'
import type { DateRange } from '../../../utils/date'
import {
  getStatusLabelByDateRange,
  isActiveDateRange
} from '../../../utils/date'
import { InputWarning } from '../../common/InputWarning'

import ServiceNeeds from './ServiceNeeds'

interface Props {
  placement: DaycarePlacementWithDetails
  permittedActions: Action.Placement[]
  permittedServiceNeedActions: Record<string, Action.ServiceNeed[]>
  onRefreshNeeded: () => void
  checkOverlaps: (
    range: DateRange,
    placement: DaycarePlacementWithDetails
  ) => boolean | undefined
  serviceNeedOptions: ServiceNeedOption[]
}

const DataRow = styled.div`
  display: flex;
  min-height: 2rem;
`

const DataLabel = styled.div`
  width: 240px;
  padding: 0 40px 0 0;
  margin: 0;
  font-weight: ${fontWeights.semibold};
`

const DataValue = styled.div`
  display: flex;
`

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-right: 20px;
  flex-grow: 1;

  > * {
    margin-left: 10px;
  }
`

const CompactDatePicker = styled(DatePickerDeprecated)`
  .input {
    font-size: 1rem;
    padding: 0;
    height: unset;
    min-height: unset;
  }
`

export default React.memo(function PlacementRow({
  placement,
  permittedActions,
  permittedServiceNeedActions,
  onRefreshNeeded,
  checkOverlaps,
  serviceNeedOptions
}: Props) {
  const { i18n } = useTranslation()
  const { setErrorMessage } = useContext<UiState>(UIContext)
  const { backupCares, loadBackupCares } = useContext(ChildContext)

  const expandedAtStart = isActiveDateRange(
    placement.startDate,
    placement.endDate
  )
  const [toggled, setToggled] = useState(expandedAtStart)

  const initFormData = () => ({
    startDate: placement.startDate,
    endDate: placement.endDate
  })
  const [form, setForm] = useState<PlacementUpdate>(initFormData())
  const [editing, setEditing] = useState<boolean>(false)
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false)
  const [startDateWarning, setStartDateWarning] = useState(false)
  const [endDateWarning, setEndDateWarning] = useState(false)

  function startEdit() {
    setToggled(true)
    setForm(initFormData())
    setEditing(true)
    setStartDateWarning(false)
    setEndDateWarning(false)
  }

  const onSuccess = useCallback(() => {
    setEditing(false)
    onRefreshNeeded()
  }, [onRefreshNeeded])

  const onFailure = useCallback(
    (res: Failure<unknown>) => {
      const message =
        res.statusCode === 403
          ? i18n.common.error.forbidden
          : res?.statusCode === 409
          ? i18n.childInformation.placements.error.conflict.title
          : i18n.common.error.unknown
      const text =
        res?.statusCode === 409
          ? i18n.childInformation.placements.error.conflict.text
          : ''
      setErrorMessage({
        type: 'error',
        title: message,
        text: text,
        resolveLabel: i18n.common.ok
      })
    },
    [i18n, setErrorMessage]
  )

  const submitUpdate = useCallback(
    () =>
      updatePlacement(placement.id, form).then((res) => {
        if (res.isSuccess) {
          return loadBackupCares()
        }
        return res
      }),
    [placement.id, form, loadBackupCares]
  )

  function submitDelete() {
    void deletePlacement(placement.id).then((res) => {
      if (res.isSuccess) {
        setConfirmingDelete(false)
        onRefreshNeeded()
      }
    })
  }

  const [conflictBackupCare, setConflictBackupCare] = useState(false)

  const dependingBackupCares = useMemo(
    () =>
      backupCares
        .map((backups) =>
          backups.filter(({ backupCare }) =>
            new FiniteDateRange(
              placement.startDate,
              placement.endDate
            ).overlaps(backupCare.period)
          )
        )
        .getOrElse([]),
    [backupCares, placement]
  )

  function calculateOverlapWarnings(startDate: LocalDate, endDate: LocalDate) {
    if (checkOverlaps({ startDate, endDate }, placement)) {
      if (startDate === placement.startDate) {
        setEndDateWarning(true)
      } else {
        setStartDateWarning(true)
      }
    } else {
      if (startDate === placement.startDate) {
        setEndDateWarning(false)
      } else {
        setStartDateWarning(false)
      }
    }

    const range = new FiniteDateRange(startDate, endDate)

    if (
      dependingBackupCares.some(({ backupCare }) =>
        backupCare.period.contains(range)
      )
    ) {
      // a depending backup care has this placement in the middle, so it cannot be modified
      setConflictBackupCare(true)
    } else if (
      dependingBackupCares.some(
        ({ backupCare }) =>
          placement.startDate <= backupCare.period.start &&
          startDate > backupCare.period.start
      )
    ) {
      // the start date was moved from before a backup care to after its start
      setConflictBackupCare(true)
    } else if (
      dependingBackupCares.some(
        ({ backupCare }) =>
          placement.endDate >= backupCare.period.end &&
          endDate < backupCare.period.end
      )
    ) {
      // the end date was moved from after a backup care to before its end
      setConflictBackupCare(true)
    } else {
      setConflictBackupCare(false)
    }
  }

  const currentGroupPlacement = placement.groupPlacements.find((gp) =>
    FiniteDateRange.from(gp).includes(LocalDate.todayInSystemTz())
  )

  return placement.isRestrictedFromUser ? (
    <RestrictedToolbar
      title={i18n.childInformation.placements.restrictedName}
      subtitle={`${placement.startDate.format()} - ${placement.endDate.format()}`}
      statusLabel={getStatusLabelByDateRange(placement)}
    />
  ) : (
    <div>
      <ToolbarAccordion
        title={placement.daycare.name}
        subtitle={`${placement.startDate.format()} - ${placement.endDate.format()}`}
        onToggle={() => setToggled((prev) => !prev)}
        open={toggled}
        toolbar={
          <Toolbar
            dateRange={placement}
            onEdit={() => startEdit()}
            dataQaEdit="btn-edit-placement"
            editable={permittedActions.includes('UPDATE')}
            onDelete={() => setConfirmingDelete(true)}
            deletable={permittedActions.includes('DELETE')}
            dataQaDelete="btn-remove-placement"
            warning={
              placement.missingServiceNeedDays > 0
                ? `${i18n.childInformation.placements.serviceNeedMissingTooltip1} ${placement.missingServiceNeedDays} ${i18n.childInformation.placements.serviceNeedMissingTooltip2}`
                : undefined
            }
          />
        }
        data-qa={`placement-${placement.id}`}
      >
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.startDate}</DataLabel>
          <DataValue data-qa="placement-details-start-date">
            {editing ? (
              <DatepickerContainer>
                <CompactDatePicker
                  date={form.startDate}
                  maxDate={form.endDate}
                  onChange={(startDate) => {
                    setForm({ ...form, startDate })
                    calculateOverlapWarnings(startDate, placement.endDate)
                  }}
                  type="full-width"
                  data-qa="placement-start-date-input"
                />
                {startDateWarning ? (
                  <WarningContainer>
                    <InputWarning
                      text={i18n.childInformation.placements.warning.overlap}
                      iconPosition="after"
                    />
                  </WarningContainer>
                ) : null}
              </DatepickerContainer>
            ) : (
              placement.startDate.format()
            )}
          </DataValue>
        </DataRow>
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.endDate}</DataLabel>
          <DataValue data-qa="placement-details-end-date">
            {editing ? (
              <div>
                <div>
                  <DatepickerContainer>
                    <CompactDatePicker
                      date={form.endDate}
                      minDate={form.startDate}
                      onChange={(endDate) => {
                        setForm({ ...form, endDate })
                        calculateOverlapWarnings(placement.startDate, endDate)
                      }}
                      type="full-width"
                      data-qa="placement-end-date-input"
                      aria-labelledby="placement-details-end-date"
                    />
                    {endDateWarning ? (
                      <WarningContainer>
                        <InputWarning
                          text={
                            i18n.childInformation.placements.warning.overlap
                          }
                          iconPosition="after"
                        />
                      </WarningContainer>
                    ) : null}
                  </DatepickerContainer>
                </div>
                <div>
                  {conflictBackupCare && (
                    <WarningContainer>
                      <InputWarning
                        text={
                          i18n.childInformation.placements.warning
                            .backupCareDepends
                        }
                        iconPosition="after"
                      />
                    </WarningContainer>
                  )}
                </div>
              </div>
            ) : (
              placement.endDate.format()
            )}
          </DataValue>
        </DataRow>
        {placement.terminationRequestedDate && (
          <DataRow>
            <DataLabel>
              {i18n.childInformation.placements.terminatedByGuardian}
            </DataLabel>
            <DataValue data-qa="placement-terminated">
              {`${
                i18n.childInformation.placements.terminated
              } ${placement.terminationRequestedDate.format()}`}
            </DataValue>
          </DataRow>
        )}
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.area}</DataLabel>
          <DataValue data-qa="placement-details-area">
            {placement.daycare.area}
          </DataValue>
        </DataRow>
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.daycareUnit}</DataLabel>
          <DataValue data-qa="placement-details-unit">
            <Link to={`/units/${placement.daycare.id}`}>
              {placement.daycare.name}
            </Link>
          </DataValue>
        </DataRow>
        {FiniteDateRange.from(placement).includes(
          LocalDate.todayInSystemTz()
        ) && (
          <DataRow>
            <DataLabel>
              {i18n.childInformation.placements.daycareGroup}
            </DataLabel>
            <DataValue data-qa="placement-details-unit">
              {currentGroupPlacement?.groupId &&
              currentGroupPlacement?.groupName ? (
                <Link
                  to={`/units/${placement.daycare.id}/groups?open_groups=${currentGroupPlacement.groupId}`}
                >
                  {currentGroupPlacement.groupName}
                </Link>
              ) : (
                i18n.childInformation.placements.daycareGroupMissing
              )}
            </DataValue>
          </DataRow>
        )}
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.type}</DataLabel>
          <DataValue data-qa="placement-details-type">
            {i18n.placement.type[placement.type]}
          </DataValue>
        </DataRow>
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.providerType}</DataLabel>
          <DataValue data-qa="placement-details-provider-type">
            {i18n.common.providerType[placement.daycare.providerType]}
          </DataValue>
        </DataRow>
        <DataRow>
          <DataLabel>{i18n.childInformation.placements.updatedAt}</DataLabel>
          <DataValue data-qa="placement-details-updated-at">
            {placement.updated?.format() ?? ''}
          </DataValue>
        </DataRow>
        <Gap size="s" />
        {editing && (
          <ActionRow>
            <FixedSpaceRow>
              <Button
                onClick={() => setEditing(false)}
                text={i18n.common.cancel}
              />
              <AsyncButton
                primary
                onClick={submitUpdate}
                onSuccess={onSuccess}
                onFailure={onFailure}
                text={i18n.common.save}
              />
            </FixedSpaceRow>
          </ActionRow>
        )}

        <Gap size="s" />

        <ServiceNeeds
          placement={placement}
          permittedPlacementActions={permittedActions}
          permittedServiceNeedActions={permittedServiceNeedActions}
          reload={onRefreshNeeded}
          serviceNeedOptions={serviceNeedOptions}
        />
      </ToolbarAccordion>
      {confirmingDelete && (
        <InfoModal
          title={i18n.childInformation.placements.deletePlacement.confirmTitle}
          text={
            dependingBackupCares.length > 0
              ? i18n.childInformation.placements.deletePlacement
                  .hasDependingBackupCares
              : undefined
          }
          type="warning"
          icon={faQuestion}
          resolve={{
            action: submitDelete,
            label: i18n.childInformation.placements.deletePlacement.btn
          }}
          reject={{
            action: () => setConfirmingDelete(false),
            label: i18n.common.cancel
          }}
        />
      )}
    </div>
  )
})

const DatepickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: fit-content;
`

const WarningContainer = styled.div`
  margin: 5px 0;
`
