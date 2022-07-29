// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import { useNavigate } from 'react-router-dom'

import type { UUID } from 'lib-common/types'
import { useApiState } from 'lib-common/utils/useRestApi'
import { AssistanceNeedDecisionStatusChip } from 'lib-components/assistance-need-decision/AssistanceNeedDecisionStatusChip'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import { Table, Tbody, Td, Th, Thead, Tr } from 'lib-components/layout/Table'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import CollapsibleSection from 'lib-components/molecules/CollapsibleSection'
import { H2, H3 } from 'lib-components/typography'
import { faFileAlt } from 'lib-icons'

import { renderResult } from '../async-rendering'
import { useTranslation } from '../localization'

import { getAssistanceNeedDecisions } from './api'

interface AssistanceNeedProps {
  childId: UUID
}

export default React.memo(function AssistanceNeedSection({
  childId
}: AssistanceNeedProps) {
  const t = useTranslation()

  const navigate = useNavigate()

  const [assistanceNeedDecisions] = useApiState(
    () => getAssistanceNeedDecisions(childId),
    [childId]
  )

  return (
    <CollapsibleSection
      title={t.children.assistanceNeed.title}
      startCollapsed
      fitted
      headingComponent={H2}
    >
      <H3>{t.children.assistanceNeed.decisions.title}</H3>
      {renderResult(assistanceNeedDecisions, (decisions) => (
        <Table>
          <Thead>
            <Tr>
              <Th>{t.children.assistanceNeed.decisions.form}</Th>
              <Th>{t.children.assistanceNeed.decisions.assistanceLevel}</Th>
              <Th>{t.children.assistanceNeed.decisions.validityPeriod}</Th>
              <Th>{t.children.assistanceNeed.decisions.unit}</Th>
              <Th>{t.children.assistanceNeed.decisions.decisionMade}</Th>
              <Th>{t.children.assistanceNeed.decisions.status}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {decisions.map((decision) => (
              <Tr
                key={decision.id}
                onClick={() =>
                  navigate(
                    `/children/${childId}/assistance-need-decision/${decision.id}`
                  )
                }
                data-qa="assistance-need-decision-row"
              >
                <Td minimalWidth>
                  <FixedSpaceRow justifyContent="center" alignItems="center">
                    <IconButton
                      icon={faFileAlt}
                      altText={t.children.assistanceNeed.decisions.openDecision}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        navigate(
                          `/children/${childId}/assistance-need-decision/${decision.id}`
                        )
                      }}
                    />
                  </FixedSpaceRow>
                </Td>
                <Td data-qa="assistance-level">
                  {decision.assistanceLevel &&
                    {
                      ASSISTANCE_ENDS:
                        t.children.assistanceNeed.decisions.decision
                          .assistanceLevel.assistanceEnds,
                      ASSISTANCE_SERVICES_FOR_TIME:
                        t.children.assistanceNeed.decisions.decision
                          .assistanceLevel.assistanceServicesForTime,
                      ENHANCED_ASSISTANCE:
                        t.children.assistanceNeed.decisions.decision
                          .assistanceLevel.enhancedAssistance,
                      SPECIAL_ASSISTANCE:
                        t.children.assistanceNeed.decisions.decision
                          .assistanceLevel.specialAssistance
                    }[decision.assistanceLevel]}
                </Td>
                <Td data-qa="validity-period">
                  {decision.startDate?.format() ?? ''} –{' '}
                  {decision.endDate?.format() ?? ''}
                </Td>
                <Td data-qa="selected-unit">{decision.selectedUnit?.name}</Td>
                <Td data-qa="decision-made">
                  {decision.decisionMade?.format()}
                </Td>
                <Td>
                  <AssistanceNeedDecisionStatusChip
                    decisionStatus={decision.status}
                    texts={
                      t.children.assistanceNeed.decisions.decision.statuses
                    }
                    data-qa="status"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ))}
    </CollapsibleSection>
  )
})
