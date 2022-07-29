// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApplicationDecisions } from 'lib-common/generated/api-types/application'
import type { DecisionType } from 'lib-common/generated/api-types/decision'
import RoundIcon from 'lib-components/atoms/RoundIcon'
import Button from 'lib-components/atoms/buttons/Button'
import ButtonContainer from 'lib-components/layout/ButtonContainer'
import { ContentArea } from 'lib-components/layout/Container'
import ListGrid from 'lib-components/layout/ListGrid'
import { H2, H3, Label, P } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'

import { useTranslation } from '../../localization'
import { PdfLink } from '../PdfLink'
import { Status, decisionStatusIcon, sortDecisions } from '../shared'

const preschoolInfoTypes: DecisionType[] = [
  'PRESCHOOL',
  'PRESCHOOL_DAYCARE',
  'PREPARATORY_EDUCATION'
]

export default React.memo(function ApplicationDecisionsBlock({
  applicationId,
  childName,
  decisions
}: ApplicationDecisions) {
  const t = useTranslation()

  return (
    <ContentArea
      opaque
      paddingVertical="L"
      data-qa={`application-${applicationId}`}
    >
      <H2 noMargin data-qa={`title-decision-child-name-${applicationId}`}>
        {childName}
      </H2>
      {sortDecisions(decisions).map(
        ({ decisionId, type, status, sentDate, resolved }) => (
          <React.Fragment key={decisionId}>
            <Gap size="L" />
            <H3 noMargin data-qa={`title-decision-type-${decisionId}`}>
              {`${t.decisions.applicationDecisions.decision} ${t.decisions.applicationDecisions.type[type]}`}
            </H3>
            <Gap size="m" />
            <ListGrid labelWidth="max-content" rowGap="s" columnGap="L">
              <Label>{t.decisions.applicationDecisions.sentDate}</Label>
              <span data-qa={`decision-sent-date-${decisionId}`}>
                {sentDate.format()}
              </span>
              {resolved && (
                <>
                  <Label>{t.decisions.applicationDecisions.resolved}</Label>
                  <span data-qa={`decision-resolved-date-${decisionId}`}>
                    {resolved.format()}
                  </span>
                </>
              )}
              <Label>{t.decisions.applicationDecisions.statusLabel}</Label>
              <Status data-qa={`decision-status-${decisionId}`}>
                <RoundIcon
                  content={decisionStatusIcon[status].icon}
                  color={decisionStatusIcon[status].color}
                  size="s"
                />
                <Gap size="xs" horizontal />
                {t.decisions.applicationDecisions.status[status]}
              </Status>
            </ListGrid>

            <Gap size="m" sizeOnMobile="zero" />

            {status === 'PENDING' ? (
              <ConfirmationDialog applicationId={applicationId} type={type} />
            ) : (
              <PdfLink decisionId={decisionId} />
            )}
          </React.Fragment>
        )
      )}
    </ContentArea>
  )
})

const ConfirmationDialog = React.memo(function ConfirmationDialog({
  applicationId,
  type
}: {
  applicationId: string
  type: DecisionType
}) {
  const t = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      <P width="800px">
        {
          t.decisions.applicationDecisions.confirmationInfo[
            preschoolInfoTypes.includes(type) ? 'preschool' : 'default'
          ]
        }
      </P>
      <P width="800px">
        <strong>{t.decisions.applicationDecisions.goToConfirmation}</strong>
      </P>
      <Gap size="s" />
      <ButtonContainer>
        <Button
          primary
          text={t.decisions.applicationDecisions.confirmationLink}
          onClick={() => navigate(`/decisions/by-application/${applicationId}`)}
          data-qa={`button-confirm-decisions-${applicationId}`}
        />
      </ButtonContainer>
    </>
  )
})
