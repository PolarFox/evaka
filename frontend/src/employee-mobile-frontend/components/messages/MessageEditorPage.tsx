// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import type {
  MessageReceiversResponse,
  PostMessageBody
} from 'lib-common/generated/api-types/messaging'
import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import MessageEditor from 'lib-components/employee/messages/MessageEditor'
import type { SelectorNode } from 'lib-components/employee/messages/SelectorNode'
import { receiverAsSelectorNode } from 'lib-components/employee/messages/SelectorNode'
import { ContentArea } from 'lib-components/layout/Container'
import { defaultMargins } from 'lib-components/white-space'
import { featureFlags } from 'lib-customizations/employeeMobile'
import { faArrowLeft } from 'lib-icons'

import {
  deleteAttachment,
  getAttachmentUrl,
  saveMessageAttachment
} from '../../api/attachments'
import {
  deleteDraft,
  initDraft,
  postMessage,
  saveDraft,
  getReceivers
} from '../../api/messages'
import { useTranslation } from '../../state/i18n'
import { MessageContext } from '../../state/messages'
import { renderResult } from '../async-rendering'
import { BackButtonInline } from '../attendances/components'
import TopBar from '../common/TopBar'

export default function MessageEditorPage() {
  const { i18n } = useTranslation()
  const { childId, unitId } = useNonNullableParams<{
    unitId: UUID
    groupId: UUID
    childId: UUID
  }>()

  const navigate = useNavigate()

  const { accounts, selectedAccount, selectedUnit } = useContext(MessageContext)

  const [sending, setSending] = useState(false)

  const [selectedReceivers, setSelectedReceivers] = useState<SelectorNode>()

  useEffect(() => {
    if (!unitId) return

    void getReceivers(unitId).then(
      (result: Result<MessageReceiversResponse[]>) => {
        if (result.isSuccess) {
          const child = result.value.flatMap(({ receivers }) =>
            receivers.filter((r) => r.childId === childId)
          )[0]
          if (!child) return
          setSelectedReceivers(receiverAsSelectorNode(child))
        }
      }
    )
  }, [childId, unitId, setSelectedReceivers])

  const onSend = useCallback(
    (accountId: UUID, messageBody: PostMessageBody) => {
      setSending(true)
      void postMessage(accountId, messageBody).then((res) => {
        if (res.isSuccess) {
          navigate(-1)
        } else {
          // TODO handle eg. expired pin session correctly
          console.error('Failed to send message')
        }
        setSending(false)
      })
    },
    [navigate]
  )

  const onDiscard = useCallback(
    (accountId: UUID, draftId: UUID) => {
      void deleteDraft(accountId, draftId).then(() => navigate(-1))
    },
    [navigate]
  )

  const onHide = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return renderResult(accounts, (accounts) =>
    selectedReceivers && selectedAccount && selectedUnit ? (
      <MessageEditor
        availableReceivers={selectedReceivers}
        attachmentsEnabled={
          featureFlags.experimental?.messageAttachments ?? false
        }
        defaultSender={{
          value: selectedAccount.account.id,
          label: selectedAccount.account.name
        }}
        deleteAttachment={deleteAttachment}
        draftContent={undefined}
        getAttachmentUrl={getAttachmentUrl}
        i18n={{
          ...i18n.messages.messageEditor,
          ...i18n.fileUpload,
          ...i18n.common
        }}
        initDraftRaw={initDraft}
        mobileVersion={true}
        accounts={accounts}
        onClose={onHide}
        onDiscard={onDiscard}
        onSend={onSend}
        saveDraftRaw={saveDraft}
        saveMessageAttachment={saveMessageAttachment}
        selectedUnit={selectedUnit}
        sending={sending}
      />
    ) : !selectedReceivers ? (
      <ContentArea
        opaque
        paddingVertical="zero"
        paddingHorizontal="zero"
        fullHeight={true}
        data-qa="messages-editor-content-area"
      >
        <TopBar title={i18n.messages.newMessage} />
        <PaddedContainer>
          <span data-qa="info-no-receivers">{i18n.messages.noReceivers}</span>
        </PaddedContainer>
        <BackButtonInline
          onClick={() => navigate(-1)}
          icon={faArrowLeft}
          text={i18n.common.back}
        />
      </ContentArea>
    ) : null
  )
}

const PaddedContainer = styled.div`
  padding: ${defaultMargins.m} ${defaultMargins.s};
`
