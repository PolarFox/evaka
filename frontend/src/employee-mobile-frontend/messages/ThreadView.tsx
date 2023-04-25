// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useCallback, useContext, useEffect, useRef } from 'react'
import styled from 'styled-components'

import { formatDateOrTime } from 'lib-common/date'
import type {
  Message,
  MessageThread,
  AuthorizedMessageAccount
} from 'lib-common/generated/api-types/messaging'
import type { UUID } from 'lib-common/types'
import Linkify from 'lib-components/atoms/Linkify'
import TextArea from 'lib-components/atoms/form/TextArea'
import { ThreadContainer } from 'lib-components/molecules/ThreadListItem'
import { fontWeights } from 'lib-components/typography'
import { useRecipients } from 'lib-components/utils/useReplyRecipients'
import { defaultMargins } from 'lib-components/white-space'
import colors from 'lib-customizations/common'
import { faArrowRight } from 'lib-icons'

import TopBar from '../common/TopBar'
import { useTranslation } from '../common/i18n'

import { MessageContext } from './state'

interface ThreadViewProps {
  thread: MessageThread
  onBack: () => void
  senderAccountId: UUID
}

const getAccountsInThread = (
  messages: Message[],
  accounts: AuthorizedMessageAccount[]
) => {
  const allRecipients = messages.flatMap((m) => m.recipients)

  return accounts.filter(({ account }) =>
    allRecipients.some((r) => r.id === account.id)
  )
}

export const ThreadView = React.memo(function ThreadView({
  thread: { id: threadId, messages, title, isCopy },
  onBack,
  senderAccountId
}: ThreadViewProps) {
  const { i18n } = useTranslation()

  const { getReplyContent, sendReply, setReplyContent, groupAccounts } =
    useContext(MessageContext)

  const onUpdateContent = useCallback(
    (content: string) => setReplyContent(threadId, content),
    [setReplyContent, threadId]
  )

  const replyContent = getReplyContent(threadId)

  const accountsInThread = getAccountsInThread(messages, groupAccounts)

  const { recipients } = useRecipients(messages, senderAccountId)

  const onSubmitReply = useCallback(() => {
    replyContent.length > 0 &&
      sendReply({
        content: replyContent,
        messageId: messages.slice(-1)[0].id,
        recipientAccountIds: recipients.map((r) => r.id),
        accountId: senderAccountId
      })
  }, [replyContent, sendReply, recipients, messages, senderAccountId])

  const endOfMessagesRef = useRef<null | HTMLDivElement>(null)
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView(true)
  }, [messages])

  return (
    <ThreadViewMobile data-qa="thread-view-mobile">
      <TopBar title={title} onBack={onBack} invertedColors />
      {messages.map((message) => (
        <SingleMessage
          key={message.id}
          message={message}
          ours={accountsInThread.some(
            ({ account }) => account.id === message.sender.id
          )}
        />
      ))}
      <div ref={endOfMessagesRef} />
      {!isCopy && (
        <ThreadViewReplyContainer>
          <ThreadViewReply>
            <div className="thread-view-input-wrapper">
              <TextArea
                value={replyContent}
                onChange={onUpdateContent}
                className="thread-view-input"
                placeholder={i18n.messages.inputPlaceholder}
                data-qa="thread-reply-input"
              />
            </div>
            <RoundIconButton
              onClick={onSubmitReply}
              disabled={replyContent.length === 0}
              data-qa="thread-reply-button"
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </RoundIconButton>
          </ThreadViewReply>
        </ThreadViewReplyContainer>
      )}
    </ThreadViewMobile>
  )
})

function SingleMessage({ message, ours }: { message: Message; ours: boolean }) {
  return (
    <MessageContainer ours={ours} data-qa="single-message">
      <TitleRow>
        <SenderName data-qa="single-message-sender-name">
          {message.sender.name}
        </SenderName>
        <SentDate white={ours}>{formatDateOrTime(message.sentAt)}</SentDate>
      </TitleRow>
      <MessageContent data-qa="single-message-content">
        <Linkify>{message.content}</Linkify>
      </MessageContent>
    </MessageContainer>
  )
}

const RoundIconButton = styled.button`
  width: ${defaultMargins.L};
  height: ${defaultMargins.L};
  min-width: ${defaultMargins.L};
  min-height: ${defaultMargins.L};
  max-width: ${defaultMargins.L};
  max-height: ${defaultMargins.L};
  background: ${colors.main.m2};
  border: none;
  border-radius: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${colors.grayscale.g0};
  &:disabled {
    background: ${colors.grayscale.g15};
  }
`

const MessageContainer = styled.div<{ ours: boolean }>`
  border-radius: ${defaultMargins.s};
  max-width: 90%;
  ${(p) =>
    p.ours
      ? `
      border-bottom-right-radius: 2px;
      align-self: flex-end;
      background-color: ${colors.main.m2};
      color: ${colors.grayscale.g0};
    `
      : `
      border-bottom-left-radius: 2px;
      align-self: flex-start;
      background-color: ${colors.main.m4};
    `}
  padding: ${defaultMargins.s};
  margin: ${defaultMargins.xs};
`

const SentDate = styled.div<{ white: boolean }>`
  font-size: 14px;
  font-weight: ${fontWeights.semibold};
  color: ${(p) => (p.white ? colors.grayscale.g0 : colors.grayscale.g70)};
`

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  & + & {
    margin-top: ${defaultMargins.L};
  }
`

const SenderName = styled.div`
  font-weight: ${fontWeights.semibold};
  margin-right: ${defaultMargins.m};
`

const MessageContent = styled.div`
  padding-top: ${defaultMargins.s};
  white-space: pre-line;
  word-break: normal;
  overflow-wrap: anywhere;
`

const ThreadViewMobile = styled(ThreadContainer)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow-y: unset;
  min-height: 100vh;
`

const ThreadViewReplyContainer = styled.div`
  position: sticky;
  bottom: 0;
  width: 100%;
  display: flex;
  align-items: center;
  background: ${colors.grayscale.g0};
  margin-top: auto;
  padding: ${defaultMargins.xxs} ${defaultMargins.xs} ${defaultMargins.xs};
`

const ThreadViewReply = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
  gap: ${defaultMargins.xs};
  .thread-view-input-wrapper {
    display: block;
    width: 100%;
  }
  .thread-view-input {
    background: ${colors.grayscale.g4};
    border-radius: ${defaultMargins.m};
  }
  .thread-view-input:not(:focus) {
    border-bottom-color: transparent;
  }
`
