// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useState } from 'react'

import { useTranslation } from 'employee-frontend/state/i18n'
import type { PlacementPlanDetails } from 'lib-common/generated/api-types/placement'
import type { UUID } from 'lib-common/types'
import Title from 'lib-components/atoms/Title'
import { CollapsibleContentArea } from 'lib-components/layout/Container'

import PlacementProposals from '../../components/unit/tab-placement-proposals/PlacementProposals'
import { NotificationCounter } from '../UnitPage'

interface Props {
  unitId: UUID
  placementProposals: PlacementPlanDetails[]
  reloadApplications: () => void
}

export default React.memo(function TabPlacementProposals({
  unitId,
  placementProposals,
  reloadApplications
}: Props) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState<boolean>(true)

  return (
    <CollapsibleContentArea
      opaque
      title={
        <Title size={2}>
          {i18n.unit.placementProposals.title}
          {placementProposals.length > 0 ? (
            <NotificationCounter>
              {placementProposals.length}
            </NotificationCounter>
          ) : null}
        </Title>
      }
      open={open}
      toggleOpen={() => setOpen(!open)}
    >
      <PlacementProposals
        unitId={unitId}
        placementPlans={placementProposals}
        reloadApplications={reloadApplications}
      />
    </CollapsibleContentArea>
  )
})
