// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo
} from 'react'
import styled from 'styled-components'

import type {
  MessageReceiversResponse,
  PostMessageBody
} from 'lib-common/generated/api-types/messaging'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { UUID } from 'lib-common/types'
import { useApiState } from 'lib-common/utils/useRestApi'
import MessageEditor from 'lib-components/employee/messages/MessageEditor'
import Container from 'lib-components/layout/Container'
import { defaultMargins } from 'lib-components/white-space'

import {
  deleteAttachment,
  getAttachmentUrl,
  saveMessageAttachment
} from '../../api/attachments'
import { getPerson } from '../../api/person'
import { useTranslation } from '../../state/i18n'
import { UIContext } from '../../state/ui'
import { formatPersonName } from '../../utils'
import { footerHeight } from '../Footer'
import { headerHeight } from '../Header'

import { MessageContext } from './MessageContext'
import Sidebar from './Sidebar'
import MessageList from './ThreadListContainer'
import { deleteDraft, initDraft, postMessage, saveDraft } from './api'

const PanelContainer = styled.div`
  height: calc(
    100vh - ${headerHeight} - ${footerHeight} - ${defaultMargins.XL}
  );
  display: flex;
`

export default React.memo(function MessagesPage({
  showEditor: initialShowEditor
}: {
  showEditor?: boolean
}) {
  const {
    accounts,
    selectedDraft,
    setSelectedDraft,
    selectedAccount,
    selectDefaultAccount,
    selectAccount,
    setSelectedThread,
    refreshMessages,
    openMessageUndo,
    prefilledRecipient,
    prefilledTitle,
    relatedApplicationId,
    accountAllowsNewMessage
  } = useContext(MessageContext)

  const { setErrorMessage } = useContext(UIContext)
  const { i18n } = useTranslation()

  const [prefilledRecipientPerson] = useApiState(
    () => getPerson(prefilledRecipient),
    [prefilledRecipient]
  )

  useEffect(() => refreshMessages(), [refreshMessages])
  const [sending, setSending] = useState(false)
  const [showEditor, setShowEditor] = useState<boolean>(
    initialShowEditor ?? false
  )

  // Select first account if no account is selected. This modifies MessageContextProvider state and so has
  // to be in useEffect. Calling setState() directly in the render function is only allowed if the state
  // lives in the same component.
  useEffect(() => {
    if (accounts.isSuccess && selectedAccount === undefined) {
      selectDefaultAccount()
    }
  }, [accounts, selectedAccount, selectDefaultAccount])

  // open editor when draft is selected
  useEffect(() => {
    if (selectedDraft) {
      setShowEditor(true)
    }
  }, [selectedDraft])

  const [receivers, setReceivers] = useState<MessageReceiversResponse[]>()

  const hideEditor = useCallback(() => {
    setShowEditor(false)
    setSelectedDraft(undefined)
  }, [setSelectedDraft])

  const onSend = useCallback(
    (accountId: UUID, messageBody: PostMessageBody) => {
      setSending(true)
      void postMessage(accountId, {
        ...messageBody,
        relatedApplicationId
      }).then((res) => {
        if (res.isSuccess) {
          refreshMessages(accountId)
          const senderAccount = accounts
            .map((accounts) =>
              accounts.find((acc) => acc.account.id === accountId)
            )
            .getOrElse(undefined)
          if (senderAccount) {
            selectAccount({
              account: senderAccount.account,
              view: 'sent',
              unitId: senderAccount.daycareGroup?.unitId ?? null
            })
            if (res.value) {
              setSelectedThread(res.value)
              openMessageUndo({
                accountId: senderAccount.account.id,
                contentId: res.value,
                sentAt: HelsinkiDateTime.now()
              })
            }
          }
          hideEditor()
        } else {
          setErrorMessage({
            type: 'error',
            title: i18n.common.error.unknown,
            resolveLabel: i18n.common.ok
          })
        }
        setSending(false)
      })
    },
    [
      accounts,
      hideEditor,
      i18n.common.error.unknown,
      i18n.common.ok,
      openMessageUndo,
      refreshMessages,
      selectAccount,
      setErrorMessage,
      setSelectedThread,
      relatedApplicationId
    ]
  )

  const onDiscard = (accountId: UUID, draftId: UUID) => {
    hideEditor()
    void deleteDraft(accountId, draftId).then(() => refreshMessages(accountId))
  }

  const onHide = (didChanges: boolean) => {
    hideEditor()
    if (didChanges) {
      refreshMessages()
    }
  }

  const prefilledOrReceivers = useMemo(():
    | MessageReceiversResponse[]
    | undefined => {
    if (selectedAccount === undefined) {
      return undefined
    }
    if (prefilledRecipient) {
      if (!prefilledRecipientPerson.isSuccess) {
        return undefined
      }
      const person = prefilledRecipientPerson.getOrElse(null)
      if (person !== null) {
        return [
          {
            accountId: selectedAccount.account.id,
            receivers: [
              {
                id: prefilledRecipient,
                name: formatPersonName(person, i18n, true),
                type: 'CITIZEN'
              }
            ]
          }
        ]
      }
    }
    return receivers
  }, [
    prefilledRecipient,
    prefilledRecipientPerson,
    receivers,
    selectedAccount,
    i18n
  ])

  return (
    <Container>
      <PanelContainer>
        <Sidebar
          showEditor={() => setShowEditor(true)}
          setReceivers={setReceivers}
          enableNewMessage={accountAllowsNewMessage()}
        />
        {selectedAccount?.view && <MessageList {...selectedAccount} />}
        {showEditor &&
          accounts.isSuccess &&
          prefilledOrReceivers &&
          selectedAccount && (
            <MessageEditor
              availableReceivers={prefilledOrReceivers}
              defaultSender={{
                value: selectedAccount.account.id,
                label: selectedAccount.account.name
              }}
              deleteAttachment={deleteAttachment}
              draftContent={selectedDraft}
              getAttachmentUrl={getAttachmentUrl}
              i18n={{
                ...i18n.messages.messageEditor,
                ...i18n.fileUpload,
                ...i18n.common
              }}
              initDraftRaw={initDraft}
              accounts={accounts.value}
              onClose={onHide}
              onDiscard={onDiscard}
              onSend={onSend}
              saveDraftRaw={saveDraft}
              saveMessageAttachment={saveMessageAttachment}
              sending={sending}
              defaultTitle={prefilledTitle ?? undefined}
            />
          )}
      </PanelContainer>
    </Container>
  )
})
