// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import { formatDateOrTime } from 'lib-common/date'
import type { MessageThread } from 'lib-common/generated/api-types/messaging'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import FileDownloadButton from 'lib-components/molecules/FileDownloadButton'
import {
  Container,
  Header,
  TitleAndDate,
  Truncated
} from 'lib-components/molecules/ThreadListItem'

import { getAttachmentUrl } from '../attachments'
import { useTranslation } from '../localization'

import { MessageCharacteristics } from './MessageCharacteristics'

interface Props {
  thread: MessageThread
  active: boolean
  hasUnreadMessages: boolean
  onClick: () => void
}

export default React.memo(function ThreadListItem({
  thread,
  active,
  hasUnreadMessages,
  onClick
}: Props) {
  const i18n = useTranslation()
  const lastMessage = thread.messages[thread.messages.length - 1]
  const participants = [...new Set(thread.messages.map((t) => t.sender.name))]
  return (
    <Container
      isRead={!hasUnreadMessages}
      active={active}
      onClick={onClick}
      data-qa="thread-list-item"
    >
      <FixedSpaceColumn>
        <Header isRead={!hasUnreadMessages}>
          <Truncated data-qa="message-participants">
            {participants.join(', ')}
          </Truncated>
          <MessageCharacteristics
            type={thread.type}
            urgent={thread.urgent}
            labels={i18n.messages.types}
          />
        </Header>
        <TitleAndDate isRead={!hasUnreadMessages}>
          <Truncated>{thread.title}</Truncated>
          <span>{formatDateOrTime(lastMessage.sentAt)}</span>
        </TitleAndDate>
        <Truncated>
          {lastMessage.content.substring(0, 200).replace('\n', ' ')}
        </Truncated>
        {lastMessage.attachments.length > 0 && (
          <FixedSpaceColumn spacing="xs">
            {lastMessage.attachments.map((attachment) => (
              <FileDownloadButton
                key={attachment.id}
                file={attachment}
                getFileUrl={getAttachmentUrl}
                icon
                data-qa="thread-list-attachment"
              />
            ))}
          </FixedSpaceColumn>
        )}
      </FixedSpaceColumn>
    </Container>
  )
})
