// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { Failure, Paged, Result, Success } from 'lib-common/api'
import {
  deserializeMessageCopy,
  deserializeMessageThread,
  deserializeReplyResponse
} from 'lib-common/api-types/messaging'
import {
  AuthorizedMessageAccount,
  DraftContent,
  MessageCopy,
  MessageReceiversResponse,
  MessageThread,
  PostMessageBody,
  ReplyToMessageBody,
  SentMessage,
  ThreadReply,
  UnreadCountByAccount
} from 'lib-common/generated/api-types/messaging'
import { JsonOf } from 'lib-common/json'
import { UUID } from 'lib-common/types'
import { SaveDraftParams } from 'lib-components/employee/messages/types'

import { client } from '../../api/client'

import { deserializeDraftContent, deserializeSentMessage } from './types'

export async function getReceivers(): Promise<
  Result<MessageReceiversResponse[]>
> {
  return client
    .get<JsonOf<MessageReceiversResponse[]>>('/messages/receivers')
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function getMessagingAccounts(): Promise<
  Result<AuthorizedMessageAccount[]>
> {
  return client
    .get<JsonOf<AuthorizedMessageAccount[]>>('/messages/my-accounts')
    .then(({ data }) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export async function getUnreadCounts(): Promise<
  Result<UnreadCountByAccount[]>
> {
  return client
    .get<JsonOf<UnreadCountByAccount[]>>('/messages/unread')
    .then(({ data }) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export async function getReceivedMessages(
  accountId: UUID,
  page: number,
  pageSize: number
): Promise<Result<Paged<MessageThread>>> {
  return client
    .get<JsonOf<Paged<MessageThread>>>(`/messages/${accountId}/received`, {
      params: { page, pageSize }
    })
    .then(({ data }) =>
      Success.of({
        ...data,
        data: data.data.map((d) => deserializeMessageThread(d))
      })
    )
}

export async function getArchivedMessages(
  accountId: UUID,
  page: number,
  pageSize: number
): Promise<Result<Paged<MessageThread>>> {
  return client
    .get<JsonOf<Paged<MessageThread>>>(`/messages/${accountId}/archived`, {
      params: { page, pageSize }
    })
    .then(({ data }) =>
      Success.of({
        ...data,
        data: data.data.map((d) => deserializeMessageThread(d))
      })
    )
    .catch((e) => Failure.fromError(e))
}

export async function getMessageCopies(
  accountId: UUID,
  page: number,
  pageSize: number
): Promise<Result<Paged<MessageCopy>>> {
  return client
    .get<JsonOf<Paged<MessageCopy>>>(`/messages/${accountId}/copies`, {
      params: { page, pageSize }
    })
    .then(({ data }) =>
      Success.of({ ...data, data: data.data.map(deserializeMessageCopy) })
    )
    .catch((e) => Failure.fromError(e))
}

export async function getSentMessages(
  accountId: UUID,
  page: number,
  pageSize: number
): Promise<Result<Paged<SentMessage>>> {
  return client
    .get<JsonOf<Paged<SentMessage>>>(`/messages/${accountId}/sent`, {
      params: { page, pageSize }
    })
    .then(({ data }) =>
      Success.of({
        ...data,
        data: data.data.map(deserializeSentMessage)
      })
    )
    .catch((e) => Failure.fromError(e))
}

export async function getMessageDrafts(
  accountId: UUID
): Promise<Result<DraftContent[]>> {
  return client
    .get<JsonOf<DraftContent[]>>(`/messages/${accountId}/drafts`)
    .then(({ data }) => Success.of(data.map(deserializeDraftContent)))
    .catch((e) => Failure.fromError(e))
}

export async function initDraft(accountId: UUID): Promise<Result<UUID>> {
  return client
    .post<UUID>(`/messages/${accountId}/drafts`)
    .then(({ data }) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export async function saveDraft({
  accountId,
  draftId,
  content
}: SaveDraftParams): Promise<Result<void>> {
  return client
    .put(`/messages/${accountId}/drafts/${draftId}`, content)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export async function deleteDraft(
  accountId: UUID,
  draftId: UUID
): Promise<Result<void>> {
  return client
    .delete(`/messages/${accountId}/drafts/${draftId}`)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export type ReplyToThreadParams = ReplyToMessageBody & {
  messageId: UUID
  accountId: UUID
}
export async function replyToThread({
  messageId,
  content,
  accountId,
  recipientAccountIds
}: ReplyToThreadParams): Promise<Result<ThreadReply>> {
  return client
    .post<JsonOf<ThreadReply>>(`/messages/${accountId}/${messageId}/reply`, {
      content,
      recipientAccountIds
    })
    .then(({ data }) => Success.of(deserializeReplyResponse(data)))
    .catch((e) => Failure.fromError(e))
}

export async function postMessage(
  accountId: UUID,
  body: PostMessageBody
): Promise<Result<UUID | null>> {
  return client
    .post(`/messages/${accountId}/message`, body)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function postBulletin(
  accountId: UUID,
  body: PostMessageBody
): Promise<Result<UUID | null>> {
  return client
    .post(`/messages/${accountId}/bulletin`, body)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function markThreadRead(
  accountId: UUID,
  id: UUID
): Promise<Result<void>> {
  return client
    .put(`/messages/${accountId}/threads/${id}/read`)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export async function markBulletinRead(
  accountId: UUID,
  id: UUID
): Promise<Result<void>> {
  return client
    .put(`/messages/${accountId}/bulletins/${id}/read`)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function archiveThread(
  accountId: UUID,
  id: UUID
): Promise<Result<void>> {
  return client
    .put(`/messages/${accountId}/threads/${id}/archive`)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export async function archiveBulletin(
  accountId: UUID,
  id: UUID
): Promise<Result<void>> {
  return client
    .put(`/messages/${accountId}/bulletins/${id}/archive`)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function undoMessage(
  accountId: UUID,
  contentId: UUID
): Promise<Result<UUID | null>> {
  return client
    .post(`/messages/${accountId}/undo-message`, null, {
      params: { contentId }
    })
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function undoMessageReply(
  accountId: UUID,
  messageId: UUID
): Promise<Result<UUID | null>> {
  return client
    .post(`/messages/${accountId}/undo-reply`, null, {
      params: { messageId }
    })
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function undoBulletin(
  accountId: UUID,
  bulletinId: UUID
): Promise<Result<UUID | null>> {
  return client
    .post(`/messages/${accountId}/undo-bulletin`, null, {
      params: { bulletinId }
    })
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}
