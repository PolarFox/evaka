// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useMemo, useRef } from 'react'
import styled from 'styled-components'

import type { ChildState } from 'employee-frontend/state/child'
import { ChildContext } from 'employee-frontend/state/child'
import { combine } from 'lib-common/api'
import type { UUID } from 'lib-common/types'
import { scrollToRef } from 'lib-common/utils/scrolling'
import { useApiState } from 'lib-common/utils/useRestApi'
import Title from 'lib-components/atoms/Title'
import AddButton from 'lib-components/atoms/buttons/AddButton'

import {
  getAssistanceBasisOptions,
  getAssistanceNeeds
} from '../../api/child/assistance-needs'
import AssistanceNeedForm from '../../components/child-information/assistance-need/AssistanceNeedForm'
import { useTranslation } from '../../state/i18n'
import { UIContext } from '../../state/ui'
import { renderResult } from '../async-rendering'

import AssistanceNeedRow from './assistance-need/AssistanceNeedRow'

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30px 0;

  .title {
    margin: 0;
  }
`

export interface Props {
  id: UUID
}

export default React.memo(function AssistanceNeed({ id }: Props) {
  const { i18n } = useTranslation()
  const { permittedActions } = useContext<ChildState>(ChildContext)
  const [assistanceNeeds, loadData] = useApiState(
    () => getAssistanceNeeds(id),
    [id]
  )
  const [assistanceBasisOptions] = useApiState(getAssistanceBasisOptions, [])
  const { uiMode, toggleUiMode } = useContext(UIContext)
  const refSectionTop = useRef(null)

  const duplicate = useMemo(
    () =>
      !!uiMode && uiMode.startsWith('duplicate-assistance-need')
        ? assistanceNeeds
            .map((needs) =>
              needs.find((an) => an.need.id == uiMode.split('_').pop())
            )
            .getOrElse(undefined)
        : undefined,
    [assistanceNeeds, uiMode]
  )

  return renderResult(
    combine(assistanceNeeds, assistanceBasisOptions),
    ([assistanceNeeds, assistanceBasisOptions]) => (
      <div ref={refSectionTop}>
        <TitleRow>
          <Title size={4}>{i18n.childInformation.assistanceNeed.title}</Title>
          {permittedActions.has('CREATE_ASSISTANCE_NEED') && (
            <AddButton
              flipped
              text={i18n.childInformation.assistanceNeed.create}
              onClick={() => {
                toggleUiMode('create-new-assistance-need')
                scrollToRef(refSectionTop)
              }}
              disabled={uiMode === 'create-new-assistance-need'}
              data-qa="assistance-need-create-btn"
            />
          )}
        </TitleRow>
        {uiMode === 'create-new-assistance-need' && (
          <>
            <AssistanceNeedForm
              childId={id}
              onReload={loadData}
              assistanceNeeds={assistanceNeeds}
              assistanceBasisOptions={assistanceBasisOptions}
            />
            <div className="separator" />
          </>
        )}
        {duplicate && (
          <>
            <AssistanceNeedForm
              childId={id}
              assistanceNeed={duplicate.need}
              onReload={loadData}
              assistanceNeeds={assistanceNeeds}
              assistanceBasisOptions={assistanceBasisOptions}
            />
            <div className="separator" />
          </>
        )}
        {assistanceNeeds.map((assistanceNeed) => (
          <AssistanceNeedRow
            key={assistanceNeed.need.id}
            assistanceNeed={assistanceNeed.need}
            permittedActions={assistanceNeed.permittedActions}
            onReload={loadData}
            assistanceNeeds={assistanceNeeds}
            assistanceBasisOptions={assistanceBasisOptions}
            refSectionTop={refSectionTop}
          />
        ))}
      </div>
    )
  )
})
