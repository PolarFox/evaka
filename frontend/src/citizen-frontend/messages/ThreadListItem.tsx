// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { SyntheticEvent, useCallback } from 'react'
import { Link } from 'react-router-dom'

import { formatDateOrTime } from 'lib-common/date'
import { MessageThread } from 'lib-common/generated/api-types/messaging'
import { ScreenReaderOnly } from 'lib-components/atoms/ScreenReaderOnly'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import FileDownloadButton from 'lib-components/molecules/FileDownloadButton'
import {
  Container,
  Header,
  TitleAndDate,
  Truncated
} from 'lib-components/molecules/ThreadListItem'
import { faTrash } from 'lib-icons'

import { getAttachmentUrl } from '../attachments'
import { useTranslation } from '../localization'

import { MessageCharacteristics } from './MessageCharacteristics'

interface Props {
  thread: MessageThread
  active: boolean
  hasUnreadMessages: boolean
  onClick: () => void
  onDelete: () => void
}

export default React.memo(function ThreadListItem({
  thread,
  active,
  hasUnreadMessages,
  onClick,
  onDelete
}: Props) {
  const i18n = useTranslation()
  const lastMessage = thread.messages[thread.messages.length - 1]
  const participants = [...new Set(thread.messages.map((t) => t.sender.name))]

  const handleDelete = useCallback(
    (e: SyntheticEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onDelete()
    },
    [onDelete]
  )

  return (
    <Container
      isRead={!hasUnreadMessages}
      active={active}
      onClick={onClick}
      data-qa="thread-list-item"
      tabIndex={0}
    >
      <FixedSpaceColumn>
        <Header isRead={!hasUnreadMessages}>
          <Truncated data-qa="message-participants">
            {participants.join(', ')}
          </Truncated>
          <FixedSpaceRow>
            <IconButton
              icon={faTrash}
              aria-label={i18n.common.delete}
              data-qa="delete-thread-btn"
              className="delete-btn"
              onClick={handleDelete}
            />
            <MessageCharacteristics
              type={thread.type}
              urgent={thread.urgent}
              labels={i18n.messages.types}
            />
          </FixedSpaceRow>
        </Header>
        <ScreenReaderOnly>
          <Link to={`/messages/${thread.id}`} tabIndex={-1}>
            {i18n.messages.openMessage}
          </Link>
        </ScreenReaderOnly>
        <TitleAndDate isRead={!hasUnreadMessages}>
          <Truncated>{thread.title}</Truncated>
          <time dateTime={lastMessage.sentAt.formatIso()}>
            {formatDateOrTime(lastMessage.sentAt)}
          </time>
        </TitleAndDate>
        <Truncated>
          {lastMessage.content
            .substring(0, 200)
            .replace(new RegExp('\\n', 'g'), ' ')}
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
