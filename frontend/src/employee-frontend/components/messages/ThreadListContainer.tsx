// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect, useMemo } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import type {
  MessageAccount,
  MessageThread
} from 'lib-common/generated/api-types/messaging'
import Pagination from 'lib-components/Pagination'
import EmptyMessageFolder from 'lib-components/employee/messages/EmptyMessageFolder'
import { ContentArea } from 'lib-components/layout/Container'
import { H1, H2 } from 'lib-components/typography'
import colors from 'lib-customizations/common'

import { useTranslation } from '../../state/i18n'

import { MessageContext } from './MessageContext'
import { SingleThreadView } from './SingleThreadView'
import type { ThreadListItem } from './ThreadList'
import { ThreadList } from './ThreadList'
import type { View } from './types-view'

const MessagesContainer = styled(ContentArea)`
  overflow-y: auto;
  flex: 1;
`

const getUniqueParticipants: (t: MessageThread) => string[] = (
  t: MessageThread
) =>
  Object.values(
    t.messages.reduce((acc, msg) => {
      acc[msg.sender.id] = msg.sender.name
      msg.recipients.forEach((rec) => (acc[rec.id] = rec.name))
      return acc
    }, {} as Record<string, string>)
  )

export interface Props {
  account: MessageAccount
  view: Exclude<View, 'RECEIVERS'>
}

export default React.memo(function ThreadListContainer({
  account,
  view
}: Props) {
  const { i18n } = useTranslation()
  const {
    receivedMessages,
    sentMessages,
    messageDrafts,
    page,
    setPage,
    pages,
    selectedThread,
    selectThread,
    setSelectedDraft
  } = useContext(MessageContext)

  useEffect(
    function deselectThreadWhenViewChanges() {
      selectThread(undefined)
    },
    [account.id, selectThread, view]
  )

  const hasMessages = useMemo<boolean>(() => {
    if (view === 'RECEIVED' && receivedMessages.isSuccess) {
      return receivedMessages.value.length > 0
    } else if (view === 'SENT' && sentMessages.isSuccess) {
      return sentMessages.value.length > 0
    } else if (view === 'DRAFTS' && messageDrafts.isSuccess) {
      return messageDrafts.value.length > 0
    } else {
      return false
    }
  }, [view, receivedMessages, sentMessages, messageDrafts])

  if (selectedThread) {
    return (
      <SingleThreadView
        goBack={() => selectThread(undefined)}
        thread={selectedThread}
        accountId={account.id}
        view={view}
      />
    )
  }

  const threadToListItem = (
    thread: MessageThread,
    displayMessageCount: boolean,
    dataQa: string
  ): ThreadListItem => ({
    id: thread.id,
    title: thread.title,
    content: thread.messages[thread.messages.length - 1].content,
    urgent: thread.urgent,
    participants:
      view === 'SENT'
        ? thread.messages[0].recipientNames || getUniqueParticipants(thread)
        : getUniqueParticipants(thread),
    unread: thread.messages.some((m) => !m.readAt && m.sender.id != account.id),
    onClick: () => selectThread(thread),
    type: thread.type,
    timestamp: thread.messages[thread.messages.length - 1].sentAt,
    messageCount: displayMessageCount ? thread.messages.length : undefined,
    dataQa: dataQa
  })

  // TODO: Sent messages should probably be threads. Non trivial due to thread-splitting.
  const sentMessagesAsThreads: Result<MessageThread[]> = sentMessages.map(
    (value) =>
      value.map((message) => ({
        id: message.contentId,
        type: message.type,
        title: message.threadTitle,
        urgent: message.urgent,
        participants: message.recipientNames,
        messages: [
          {
            id: message.contentId,
            sender: { ...account },
            sentAt: message.sentAt,
            recipients: message.recipients,
            readAt: new Date(),
            content: message.content,
            attachments: message.attachments,
            recipientNames: message.recipientNames
          }
        ]
      }))
  )

  const receivedMessageItems: Result<ThreadListItem[]> = receivedMessages.map(
    (value) =>
      value.map((t) => threadToListItem(t, true, 'received-message-row'))
  )
  const sentMessageItems: Result<ThreadListItem[]> = sentMessagesAsThreads.map(
    (value) => value.map((t) => threadToListItem(t, false, 'sent-message-row'))
  )
  const draftMessageItems: Result<ThreadListItem[]> = messageDrafts.map(
    (value) =>
      value.map((draft) => ({
        id: draft.id,
        title: draft.title,
        content: draft.content,
        urgent: draft.urgent,
        participants: draft.recipientNames,
        unread: false,
        onClick: () => setSelectedDraft(draft),
        type: draft.type,
        timestamp: draft.created,
        messageCount: undefined,
        dataQa: 'draft-message-row'
      }))
  )

  const threadListItems: Result<ThreadListItem[]> = {
    RECEIVED: receivedMessageItems,
    RECEIVERS: receivedMessageItems,
    SENT: sentMessageItems,
    DRAFTS: draftMessageItems
  }[view]

  return hasMessages ? (
    <MessagesContainer opaque>
      <H1>{i18n.messages.messageList.titles[view]}</H1>
      {account.type !== 'PERSONAL' && <H2>{account.name}</H2>}
      <ThreadList items={threadListItems} />
      <Pagination
        pages={pages}
        currentPage={page}
        setPage={setPage}
        label={i18n.common.page}
      />
    </MessagesContainer>
  ) : (
    <EmptyMessageFolder
      loading={
        (view === 'RECEIVED' && receivedMessages.isLoading) ||
        (view === 'SENT' && sentMessages.isLoading) ||
        (view === 'DRAFTS' && messageDrafts.isLoading)
      }
      iconColor={colors.grayscale.g35}
      text={i18n.messages.emptyInbox}
    />
  )
})
