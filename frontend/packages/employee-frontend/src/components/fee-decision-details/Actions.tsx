// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useState } from 'react'

import Button from '~components/shared/atoms/buttons/Button'
import { useTranslation } from '../../state/i18n'
import { FeeDecisionDetailed } from '../../types/invoicing'
import {
  confirmDecisions,
  getDecision,
  markDecisionSent,
  setDecisionType
} from '../../api/invoicing'
import { ErrorMessage } from '~components/fee-decision-details/FeeDecisionDetailsPage'
import { Result } from '~api'
import { FixedSpaceRow } from '~components/shared/layout/flex-helpers'

interface Props {
  decision: FeeDecisionDetailed
  goToDecisions(): void
  modified: boolean
  setModified(value: boolean): void
  setDecision(value: Result<FeeDecisionDetailed>): void
  newDecisionType: string
}

const Actions = React.memo(function Actions({
  decision,
  goToDecisions,
  modified,
  setModified,
  setDecision,
  newDecisionType
}: Props) {
  const { i18n } = useTranslation()
  const [actionInFlight, setActionInFlight] = useState(false)
  const [error, setError] = useState(false)

  const updateType = () => {
    if (decision.id != null) {
      setDecisionType(decision.id, newDecisionType)
        .then(() => {
          void getDecision(decision.id)
            .then(setDecision)
            .then(() => setModified(false))
        })
        .catch(() => setError(true))
    }
  }

  const confirmDecision = () => {
    setActionInFlight(true)
    confirmDecisions([decision.id])
      .then(() => void setError(false))
      .then(goToDecisions)
      .catch(() => void setError(true))
      .finally(() => void setActionInFlight(false))
  }

  const markSent = () => {
    setActionInFlight(true)
    markDecisionSent([decision.id])
      .then(() => void setError(false))
      .then(goToDecisions)
      .catch(() => void setError(true))
      .finally(() => void setActionInFlight(false))
  }

  const isDraft = decision.status === 'DRAFT'
  const isWaiting = decision.status === 'WAITING_FOR_MANUAL_SENDING'

  return (
    <FixedSpaceRow>
      {error ? <ErrorMessage>{i18n.common.error.unknown}</ErrorMessage> : null}
      {isDraft ? (
        <>
          <Button
            onClick={goToDecisions}
            disabled={!modified}
            dataQa="decision-actions-close"
            text={i18n.feeDecisions.buttons.close}
          />
          <Button
            onClick={updateType}
            disabled={!modified}
            dataQa="decision-actions-save"
            text={i18n.feeDecisions.buttons.save}
          />
          <Button
            primary
            onClick={confirmDecision}
            disabled={actionInFlight || modified}
            dataQa="decision-actions-confirm-decision"
            text={i18n.feeDecisions.buttons.createDecision(1)}
          />
        </>
      ) : null}
      {isWaiting ? (
        <Button
          primary
          onClick={markSent}
          disabled={actionInFlight}
          dataQa="decision-actions-mark-sent"
          text={i18n.feeDecisions.buttons.markSent}
        />
      ) : null}
    </FixedSpaceRow>
  )
})

export default Actions
