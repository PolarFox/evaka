// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { faQuestion } from 'Icons'
import orderBy from 'lodash/orderBy'
import React, { useContext, useRef, useState } from 'react'
import styled from 'styled-components'

import type { ChildState } from 'employee-frontend/state/child'
import { ChildContext } from 'employee-frontend/state/child'
import { UIContext } from 'employee-frontend/state/ui'
import type { AssistanceNeedVoucherCoefficient } from 'lib-common/generated/api-types/assistanceneed'
import type { UUID } from 'lib-common/types'
import { scrollToRef } from 'lib-common/utils/scrolling'
import { useApiState } from 'lib-common/utils/useRestApi'
import HorizontalLine from 'lib-components/atoms/HorizontalLine'
import Title from 'lib-components/atoms/Title'
import AddButton from 'lib-components/atoms/buttons/AddButton'
import { Table, Tbody } from 'lib-components/layout/Table'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { defaultMargins, Gap } from 'lib-components/white-space'

import { useTranslation } from '../../state/i18n'
import { renderResult } from '../async-rendering'

import AssistanceNeedVoucherCoefficientForm from './assistance-need/voucher-coefficient/AssistanceNeedVoucherCoefficientForm'
import AssistanceNeedVoucherCoefficientRow from './assistance-need/voucher-coefficient/AssistanceNeedVoucherCoefficientRow'
import {
  deleteAssistanceNeedVoucherCoefficient,
  getAssistanceNeedVoucherCoefficients
} from './assistance-need/voucher-coefficient/api'

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${defaultMargins.m};
`

export interface Props {
  id: UUID
}

export default React.memo(function AssistanceNeedVoucherCoefficientSection({
  id
}: Props) {
  const { i18n } = useTranslation()
  const { permittedActions } = useContext<ChildState>(ChildContext)

  const refSectionTop = useRef(null)

  const { uiMode, toggleUiMode, clearUiMode } = useContext(UIContext)

  const [coefficients, reloadCoefficients] = useApiState(
    () => getAssistanceNeedVoucherCoefficients(id),
    [id]
  )

  const [activeCoefficient, setActiveCoefficient] =
    useState<AssistanceNeedVoucherCoefficient>()

  return (
    <div ref={refSectionTop}>
      {uiMode === 'delete-assistance-need-voucher-coefficient' &&
        activeCoefficient && (
          <DeleteAssistanceNeedVoucherCoefficientModal
            coefficientId={activeCoefficient.id}
            onClose={(shouldRefresh) => {
              clearUiMode()
              setActiveCoefficient(undefined)
              if (shouldRefresh) {
                void reloadCoefficients()
              }
            }}
          />
        )}

      <TitleRow>
        <Title size={4}>
          {i18n.childInformation.assistanceNeedVoucherCoefficient.sectionTitle}
        </Title>
        {permittedActions.has('CREATE_ASSISTANCE_NEED_VOUCHER_COEFFICIENT') && (
          <AddButton
            flipped
            text={i18n.childInformation.assistanceNeedVoucherCoefficient.create}
            onClick={() => {
              toggleUiMode('create-new-assistance-need-voucher-coefficient')
              scrollToRef(refSectionTop)
            }}
            disabled={
              uiMode === 'create-new-assistance-need-voucher-coefficient'
            }
            data-qa="assistance-need-voucher-coefficient-create-btn"
          />
        )}
      </TitleRow>
      {renderResult(coefficients, (coefficients) => (
        <>
          {uiMode === 'create-new-assistance-need-voucher-coefficient' && (
            <>
              <HorizontalLine slim />
              <Gap size="s" />
              <div data-qa="create-new-assistance-need-voucher-coefficient">
                <AssistanceNeedVoucherCoefficientForm
                  childId={id}
                  onSuccess={reloadCoefficients}
                  coefficients={coefficients.map(
                    ({ voucherCoefficient }) => voucherCoefficient
                  )}
                />
              </div>
              <Gap size="m" />
            </>
          )}
          {coefficients.length === 0 ? null : (
            <Table data-qa="table-of-assistance-need-voucher-coefficients">
              <Tbody>
                {orderBy(
                  coefficients,
                  (c) => c.voucherCoefficient.validityPeriod.start,
                  ['desc']
                ).map(({ voucherCoefficient, permittedActions }) => (
                  <AssistanceNeedVoucherCoefficientRow
                    key={voucherCoefficient.id}
                    coefficients={coefficients.map(
                      ({ voucherCoefficient }) => voucherCoefficient
                    )}
                    voucherCoefficient={voucherCoefficient}
                    activeCoefficient={activeCoefficient}
                    setActiveCoefficient={setActiveCoefficient}
                    permittedActions={permittedActions}
                    reloadCoefficients={reloadCoefficients}
                  />
                ))}
              </Tbody>
            </Table>
          )}
        </>
      ))}
    </div>
  )
})

const DeleteAssistanceNeedVoucherCoefficientModal = React.memo(
  function DeleteAssistanceNeedVoucherCoefficientModal({
    coefficientId,
    onClose
  }: {
    coefficientId: UUID
    onClose: (shouldRefresh: boolean) => void
  }) {
    const { i18n } = useTranslation()
    return (
      <InfoModal
        type="warning"
        title={
          i18n.childInformation.assistanceNeedVoucherCoefficient.deleteModal
            .title
        }
        text={
          i18n.childInformation.assistanceNeedVoucherCoefficient.deleteModal
            .description
        }
        icon={faQuestion}
        reject={{
          action: () => onClose(false),
          label: i18n.common.cancel
        }}
        resolve={{
          async action() {
            await deleteAssistanceNeedVoucherCoefficient(coefficientId)
            onClose(true)
          },
          label:
            i18n.childInformation.assistanceNeedVoucherCoefficient.deleteModal
              .delete
        }}
      />
    )
  }
)
