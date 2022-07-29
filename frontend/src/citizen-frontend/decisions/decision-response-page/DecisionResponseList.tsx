// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { useApiState } from 'lib-common/utils/useRestApi'
import HorizontalLine from 'lib-components/atoms/HorizontalLine'
import Main from 'lib-components/atoms/Main'
import InlineButton from 'lib-components/atoms/buttons/InlineButton'
import { Container, ContentArea } from 'lib-components/layout/Container'
import { AlertBox } from 'lib-components/molecules/MessageBoxes'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { H1, P } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'
import { faChevronLeft, faExclamation } from 'lib-icons'

import Footer from '../../Footer'
import { renderResult } from '../../async-rendering'
import { useTranslation } from '../../localization'
import useTitle from '../../useTitle'
import { getApplicationDecisions } from '../api'
import { sortDecisions } from '../shared'
import type { Decision } from '../types'

import DecisionResponse from './DecisionResponse'

export default React.memo(function DecisionResponseList() {
  const { applicationId } = useNonNullableParams<{ applicationId: UUID }>()
  const t = useTranslation()
  const navigate = useNavigate()

  const [decisionsRequest, loadDecisions] = useApiState(
    () => getApplicationDecisions(applicationId),
    [applicationId]
  )
  const [
    displayDecisionWithNoResponseWarning,
    setDisplayDecisionWithNoResponseWarning
  ] = useState<boolean>(false)

  useTitle(t, t.decisions.title)

  const unconfirmedDecisionsCount = decisionsRequest.isSuccess
    ? decisionsRequest.value.filter(({ status }) => status === 'PENDING').length
    : 0

  const handleReturnToPreviousPage = () => {
    const warnAboutMissingResponse =
      decisionsRequest.isSuccess &&
      decisionsRequest.value.length > 1 &&
      !!decisionsRequest.value.find((d) => d.status === 'PENDING')

    if (warnAboutMissingResponse) {
      setDisplayDecisionWithNoResponseWarning(true)
    } else {
      navigate('/applying/decisions')
    }
  }

  return (
    <>
      <Container>
        <Gap size="s" />
        <InlineButton
          text={t.decisions.applicationDecisions.returnToPreviousPage}
          onClick={handleReturnToPreviousPage}
          icon={faChevronLeft}
        />
        <Gap size="s" />
        <Main>
          <ContentArea opaque>
            <H1>{t.decisions.title}</H1>
            {renderResult(decisionsRequest, (decisions) => (
              <div>
                <P width="800px">{t.decisions.applicationDecisions.summary}</P>
                {unconfirmedDecisionsCount > 0 ? (
                  <AlertBox
                    message={t.decisions.unconfirmedDecisions(
                      unconfirmedDecisionsCount
                    )}
                    data-qa="alert-box-unconfirmed-decisions-count"
                  />
                ) : null}
                <Gap size="L" />
                {sortDecisions(decisions).map((decision, i) => (
                  <React.Fragment key={decision.id}>
                    <DecisionResponse
                      decision={decision}
                      blocked={isDecisionBlocked(decision, decisions)}
                      rejectCascade={isRejectCascaded(decision, decisions)}
                      refreshDecisionList={loadDecisions}
                      handleReturnToPreviousPage={handleReturnToPreviousPage}
                    />
                    {i < decisions.length - 1 ? <HorizontalLine /> : null}
                  </React.Fragment>
                ))}
              </div>
            ))}
            <Gap size="m" />
          </ContentArea>
          {displayDecisionWithNoResponseWarning && (
            <InfoModal
              title={
                t.decisions.applicationDecisions.warnings
                  .decisionWithNoResponseWarning.title
              }
              icon={faExclamation}
              type="warning"
              text={
                t.decisions.applicationDecisions.warnings
                  .decisionWithNoResponseWarning.text
              }
              resolve={{
                label:
                  t.decisions.applicationDecisions.warnings
                    .decisionWithNoResponseWarning.resolveLabel,
                action: () => {
                  navigate('/applying/decisions')
                }
              }}
              reject={{
                label:
                  t.decisions.applicationDecisions.warnings
                    .decisionWithNoResponseWarning.rejectLabel,
                action: () => {
                  setDisplayDecisionWithNoResponseWarning(false)
                }
              }}
            />
          )}
        </Main>
      </Container>
      <Footer />
    </>
  )
})

const isDecisionBlocked = (decision: Decision, allDecisions: Decision[]) =>
  decision.type === 'PRESCHOOL_DAYCARE' &&
  allDecisions.find(
    (decision) =>
      ['PRESCHOOL', 'PREPARATORY_EDUCATION'].includes(decision.type) &&
      decision.status !== 'ACCEPTED'
  ) !== undefined

const isRejectCascaded = (decision: Decision, allDecisions: Decision[]) =>
  ['PRESCHOOL', 'PREPARATORY_EDUCATION'].includes(decision.type) &&
  allDecisions.find(
    (d) => d.type === 'PRESCHOOL_DAYCARE' && d.status === 'PENDING'
  ) !== undefined
