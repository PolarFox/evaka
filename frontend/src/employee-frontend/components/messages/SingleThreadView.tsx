// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { faReply } from '@fortawesome/free-solid-svg-icons'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import styled from 'styled-components'

import {
  Message,
  MessageChild,
  MessageThread,
  MessageType
} from 'lib-common/generated/api-types/messaging'
import { formatPreferredName } from 'lib-common/names'
import { UUID } from 'lib-common/types'
import { scrollRefIntoView } from 'lib-common/utils/scrolling'
import HorizontalLine from 'lib-components/atoms/HorizontalLine'
import Linkify from 'lib-components/atoms/Linkify'
import AsyncInlineButton from 'lib-components/atoms/buttons/AsyncInlineButton'
import InlineButton from 'lib-components/atoms/buttons/InlineButton'
import { ContentArea } from 'lib-components/layout/Container'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import FileDownloadButton from 'lib-components/molecules/FileDownloadButton'
import { MessageReplyEditor } from 'lib-components/molecules/MessageReplyEditor'
import { Bold, H2, InformationText } from 'lib-components/typography'
import { useRecipients } from 'lib-components/utils/useReplyRecipients'
import { defaultMargins, Gap } from 'lib-components/white-space'
import colors from 'lib-customizations/common'
import { faAngleLeft } from 'lib-icons'
import { faBoxArchive } from 'lib-icons'

import { getAttachmentUrl } from '../../api/attachments'
import { useTranslation } from '../../state/i18n'

import { MessageCharacteristics } from './MessageCharacteristics'
import { MessageContext } from './MessageContext'
import { archiveBulletin, archiveThread } from './api'
import { View } from './types-view'

const MessageContainer = styled.div`
  background-color: ${colors.grayscale.g0};
  padding: ${defaultMargins.L};
  margin-top: ${defaultMargins.s};

  h2 {
    margin: 0;
  }
`

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${defaultMargins.xxs};

  & + & {
    margin-top: ${defaultMargins.L};
  }
`

const StickyTitleRow = styled(TitleRow)`
  position: sticky;
  top: 0;
  padding: ${defaultMargins.L};
  background: ${colors.grayscale.g0};
  max-height: 100px;
  overflow: auto;

  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${defaultMargins.s};
`

const MessageContent = styled.div`
  padding-top: ${defaultMargins.s};
  white-space: pre-line;
`

function SingleMessage({
  message,
  messageChildren,
  index
}: {
  message: Message
  messageChildren: MessageChild[]
  type?: MessageType
  title?: string
  index: number
}) {
  return (
    <MessageContainer>
      <TitleRow>
        <Bold>
          {message.sender.name}
          {messageChildren.length > 0
            ? ` (${messageChildren
                .map((ch) => `${ch.lastName} ${formatPreferredName(ch)}`)
                .join(', ')})`
            : ''}
        </Bold>
        <InformationText>{message.sentAt.format()}</InformationText>
      </TitleRow>
      <InformationText>
        {(message.recipientNames || message.recipients.map((r) => r.name)).join(
          ', '
        )}
      </InformationText>
      <MessageContent data-qa="message-content" data-index={index}>
        <Linkify>{message.content}</Linkify>
      </MessageContent>
      {message.attachments.length > 0 && (
        <>
          <HorizontalLine slim />
          <FixedSpaceColumn spacing="xs">
            {message.attachments.map((attachment) => (
              <FileDownloadButton
                key={attachment.id}
                file={attachment}
                getFileUrl={getAttachmentUrl}
                icon
                data-qa="attachment"
              />
            ))}
          </FixedSpaceColumn>
        </>
      )}
    </MessageContainer>
  )
}

const ThreadContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`
const ScrollContainer = styled.div`
  overflow-y: auto;
`

const AutoScrollPositionSpan = styled.span<{ top: string }>`
  position: absolute;
  top: ${(p) => p.top};
`

interface Props {
  accountId: UUID
  goBack: () => void
  thread: MessageThread
  view: View
  onArchived?: () => void
}

export function SingleThreadView({
  accountId,
  goBack,
  thread: { id: threadId, messages, title, type, urgent, children },
  view,
  onArchived
}: Props) {
  const { i18n } = useTranslation()
  const { getReplyContent, sendReply, replyState, setReplyContent } =
    useContext(MessageContext)
  const [replyEditorVisible, setReplyEditorVisible] = useState<boolean>(false)
  const [stickyTitleRowHeight, setStickyTitleRowHeight] = useState<number>(0)
  const stickyTitleRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStickyTitleRowHeight(stickyTitleRowRef.current?.clientHeight || 0)
  }, [setStickyTitleRowHeight, stickyTitleRowRef])

  const replyContent = getReplyContent(threadId)
  const onUpdateContent = useCallback(
    (content: string) => setReplyContent(threadId, content),
    [setReplyContent, threadId]
  )
  const { recipients, onToggleRecipient } = useRecipients(messages, accountId)

  const autoScrollRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    scrollRefIntoView(autoScrollRef)
  }, [messages, replyEditorVisible])

  const onSubmitReply = () =>
    sendReply({
      content: replyContent,
      messageId: messages.slice(-1)[0].id,
      recipientAccountIds: recipients
        .filter((r) => r.selected)
        .map((r) => r.id),
      accountId
    })

  const onDiscard = useCallback(() => {
    setReplyContent(threadId, '')
    setReplyEditorVisible(false)
  }, [setReplyContent, setReplyEditorVisible, threadId])

  const canReply = type === 'MESSAGE'
  const editorLabels = useMemo(
    () => ({
      add: i18n.common.add,
      message: i18n.messages.messageEditor.message,
      recipients: i18n.messages.messageEditor.receivers,
      send: i18n.messages.messageEditor.send,
      sending: i18n.messages.messageEditor.sending,
      discard: i18n.messages.messageEditor.discard
    }),
    [i18n]
  )

  return (
    <ThreadContainer>
      <ContentArea opaque>
        <InlineButton
          icon={faAngleLeft}
          text={i18n.common.goBack}
          onClick={goBack}
          color={colors.main.m2}
        />
      </ContentArea>
      <Gap size="xs" />
      <ScrollContainer>
        <StickyTitleRow ref={stickyTitleRowRef}>
          <H2 noMargin>{title}</H2>
          <MessageCharacteristics type={type} urgent={urgent} />
        </StickyTitleRow>
        {messages.map((message, idx) => (
          <React.Fragment key={`${message.id}-fragment`}>
            {!replyEditorVisible && idx === messages.length - 1 && (
              <div style={{ position: 'relative' }}>
                <AutoScrollPositionSpan
                  top={`-${stickyTitleRowHeight}px`}
                  ref={autoScrollRef}
                />
              </div>
            )}
            <SingleMessage
              key={message.id}
              message={message}
              messageChildren={children}
              index={idx}
            />
          </React.Fragment>
        ))}
        {canReply &&
          view == 'received' &&
          (replyEditorVisible ? (
            <MessageContainer>
              <MessageReplyEditor
                replyState={replyState}
                onSubmit={onSubmitReply}
                onDiscard={onDiscard}
                onUpdateContent={onUpdateContent}
                recipients={recipients}
                onToggleRecipient={onToggleRecipient}
                replyContent={replyContent}
                i18n={editorLabels}
              />
            </MessageContainer>
          ) : (
            <>
              <Gap size="s" />
              <ActionRow justifyContent="space-between">
                <InlineButton
                  icon={faReply}
                  onClick={() => setReplyEditorVisible(true)}
                  data-qa="message-reply-editor-btn"
                  text={i18n.messages.replyToThread}
                />
                {onArchived && (
                  <AsyncInlineButton
                    icon={faBoxArchive}
                    aria-label={i18n.common.archive}
                    data-qa="delete-thread-btn"
                    className="delete-btn"
                    onClick={() =>
                      type === 'MESSAGE'
                        ? archiveThread(accountId, threadId)
                        : archiveBulletin(accountId, threadId)
                    }
                    onSuccess={onArchived}
                    text={i18n.messages.archiveThread}
                    stopPropagation
                  />
                )}
              </ActionRow>
              <Gap size="m" />
            </>
          ))}
        {replyEditorVisible && <span ref={autoScrollRef} />}
      </ScrollContainer>
    </ThreadContainer>
  )
}

const ActionRow = styled(FixedSpaceRow)`
  padding: 0 28px 0 28px;
`
