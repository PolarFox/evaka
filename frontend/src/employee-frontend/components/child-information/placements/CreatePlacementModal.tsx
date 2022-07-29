// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import DateRange from 'lib-common/date-range'
import type { PlacementType } from 'lib-common/generated/api-types/placement'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'
import { useRestApi } from 'lib-common/utils/useRestApi'
import Combobox from 'lib-components/atoms/dropdowns/Combobox'
import Select from 'lib-components/atoms/dropdowns/Select'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import { DatePickerDeprecated } from 'lib-components/molecules/DatePickerDeprecated'
import { AlertBox } from 'lib-components/molecules/MessageBoxes'
import FormModal from 'lib-components/molecules/modals/FormModal'
import colors from 'lib-customizations/common'
import { placementTypes } from 'lib-customizations/employee'
import { faMapMarkerAlt } from 'lib-icons'

import { createPlacement } from '../../../api/child/placements'
import { getDaycares } from '../../../api/unit'
import { useTranslation } from '../../../state/i18n'
import { UIContext } from '../../../state/ui'
import type { Unit } from '../../../types/unit'

export interface Props {
  childId: UUID
  reload: () => unknown
}

interface Form {
  type: PlacementType
  startDate: LocalDate
  endDate: LocalDate
  unit: { id: string; name: string; ghostUnit: boolean } | null
}

function CreatePlacementModal({ childId, reload }: Props) {
  const { i18n } = useTranslation()
  const { clearUiMode } = useContext(UIContext)
  const [units, setUnits] = useState<Result<Unit[]>>(Loading.of())
  const [form, setForm] = useState<Form>({
    type: 'DAYCARE',
    unit: null,
    startDate: LocalDate.todayInSystemTz(),
    endDate: LocalDate.todayInSystemTz()
  })
  const [submitting, setSubmitting] = useState<boolean>(false)

  const unitOptions = useMemo(() => {
    const activeUnits = form.startDate.isAfter(form.endDate)
      ? units
      : units.map((list) =>
          list.filter((u) =>
            new DateRange(
              u.openingDate ?? LocalDate.of(1900, 1, 1),
              u.closingDate
            ).overlapsWith(new DateRange(form.startDate, form.endDate))
          )
        )
    return activeUnits
      .map((us) =>
        us
          .map(({ id, name, ghostUnit }) => ({ id, name, ghostUnit }))
          .sort((a, b) => (a.name < b.name ? -1 : 1))
      )
      .getOrElse([])
  }, [units, form.startDate, form.endDate])

  const errors = useMemo(() => {
    const errors = []
    if (!form.unit?.id) {
      errors.push(i18n.childInformation.placements.createPlacement.unitMissing)
    }

    if (form.unit?.ghostUnit) {
      errors.push(i18n.childInformation.placements.warning.ghostUnit)
    }

    if (form.startDate.isAfter(form.endDate)) {
      errors.push(i18n.validationError.invertedDateRange)
    }

    return errors
  }, [i18n, form])

  const loadUnits = useRestApi(getDaycares, setUnits)

  useEffect(() => {
    void loadUnits()
  }, [loadUnits])

  const submitForm = () => {
    if (!form.unit?.id) return

    setSubmitting(true)
    createPlacement({
      childId: childId,
      type: form.type,
      unitId: form.unit.id,
      startDate: form.startDate,
      endDate: form.endDate
    })
      .then((res) => {
        setSubmitting(false)
        if (res.isSuccess) {
          reload()
          clearUiMode()
        }
      })
      .catch(() => setSubmitting(false))
  }

  return (
    <FormModal
      data-qa="create-placement-modal"
      title={i18n.childInformation.placements.createPlacement.title}
      text={i18n.childInformation.placements.createPlacement.text}
      icon={faMapMarkerAlt}
      type="info"
      resolveAction={submitForm}
      resolveLabel={i18n.common.confirm}
      resolveDisabled={errors.length > 0 || submitting}
      rejectAction={clearUiMode}
      rejectLabel={i18n.common.cancel}
    >
      <FixedSpaceColumn>
        <section>
          <div className="bold">{i18n.childInformation.placements.type}</div>

          <Select
            items={placementTypes}
            selectedItem={form.type}
            onChange={(type) =>
              type
                ? setForm({
                    ...form,
                    type
                  })
                : undefined
            }
            getItemLabel={(type) => i18n.placement.type[type]}
          />
        </section>

        <section data-qa="unit-select">
          <div className="bold">
            {i18n.childInformation.placements.daycareUnit}
          </div>

          <Combobox
            items={unitOptions}
            selectedItem={form.unit}
            onChange={(unit) => setForm((prev) => ({ ...prev, unit }))}
            placeholder={i18n.common.select}
            getItemLabel={({ name }) => name}
          />
        </section>

        <section>
          <div className="bold">{i18n.common.form.startDate}</div>

          <DatePickerDeprecated
            date={form.startDate}
            onChange={(startDate) => setForm({ ...form, startDate })}
            data-qa="create-placement-start-date"
            type="full-width"
          />
        </section>

        <section>
          <div className="bold">{i18n.common.form.endDate}</div>

          <DatePickerDeprecated
            date={form.endDate}
            onChange={(endDate) => setForm({ ...form, endDate })}
            data-qa="create-placement-end-date"
            type="full-width"
          />
        </section>

        {form.type === 'TEMPORARY_DAYCARE' ||
        form.type === 'TEMPORARY_DAYCARE_PART_DAY' ? (
          <AlertBox
            thin
            message={
              i18n.childInformation.placements.createPlacement
                .temporaryDaycareWarning
            }
          />
        ) : null}

        {errors.map((error) => (
          <ValidationError key={error}>{error}</ValidationError>
        ))}
      </FixedSpaceColumn>
    </FormModal>
  )
}

const ValidationError = styled.div`
  font-size: 0.9em;
  color: ${colors.status.danger};
`

export default CreatePlacementModal
