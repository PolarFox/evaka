// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { Failure, Paged, Result, Success } from 'lib-common/api'
import {
  CitizenThread,
  deserializeCitizenThread,
  deserializeMessageAccount,
  deserializeReplyResponse
} from 'lib-common/api-types/messaging'
import {
  CitizenMessageBody,
  GetReceiversResponse,
  ReplyToMessageBody,
  ThreadReply
} from 'lib-common/generated/api-types/messaging'
import { JsonOf } from 'lib-common/json'
import { UUID } from 'lib-common/types'

import { client } from '../api-client'

export async function getReceivedMessages(
  page: number,
  staffAnnotation: string,
  pageSize = 10
): Promise<Result<Paged<CitizenThread>>> {
  return client
    .get<JsonOf<Paged<CitizenThread>>>('/citizen/messages/received', {
      params: { page, pageSize }
    })
    .then((res) =>
      Success.of({
        ...res.data,
        data: res.data.data.map((d) =>
          deserializeCitizenThread(d, staffAnnotation)
        )
      })
    )
    .catch((e) => Failure.fromError(e))
}

export async function getReceivers(
  staffAnnotation: string
): Promise<Result<GetReceiversResponse>> {
  return client
    .get<GetReceiversResponse>(`/citizen/messages/receivers`)
    .then((res) =>
      Success.of({
        ...res.data,
        messageAccounts: res.data.messageAccounts.map((d) =>
          deserializeMessageAccount(d, staffAnnotation)
        )
      })
    )
    .catch((e) => Failure.fromError(e))
}

export async function getMessageAccount(): Promise<Result<UUID>> {
  return client
    .get<UUID>(`/citizen/messages/my-account`)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function markThreadRead(id: string): Promise<Result<void>> {
  return client
    .put(`/citizen/messages/threads/${id}/read`)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export async function markBulletinRead(id: string): Promise<Result<void>> {
  return client
    .put(`/citizen/messages/bulletins/${id}/read`)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export async function getUnreadMessagesCount(): Promise<Result<number>> {
  return client
    .get<number>(`/citizen/messages/unread-count`)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function sendMessage(
  message: CitizenMessageBody
): Promise<Result<UUID>> {
  return client
    .post<JsonOf<UUID>>(`/citizen/messages`, message)
    .then(({ data }) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export type ReplyToThreadParams = ReplyToMessageBody & {
  messageId: UUID
  staffAnnotation: string
}

export async function replyToThread({
  messageId,
  content,
  recipientAccountIds,
  staffAnnotation
}: ReplyToThreadParams): Promise<Result<ThreadReply>> {
  return client
    .post<JsonOf<ThreadReply>>(`/citizen/messages/${messageId}/reply`, {
      content,
      recipientAccountIds
    })
    .then(({ data }) =>
      Success.of(deserializeReplyResponse(data, staffAnnotation))
    )
    .catch((e) => Failure.fromError(e))
}

export async function archiveThread(id: UUID): Promise<Result<void>> {
  return client
    .put(`/citizen/messages/threads/${id}/archive`)
    .then(() => Success.of(undefined))
    .catch((e) => Failure.fromError(e))
}

export async function archiveBulletin(id: UUID): Promise<Result<void>> {
  return client
    .put(`/citizen/messages/bulletins/${id}/archive`)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}
