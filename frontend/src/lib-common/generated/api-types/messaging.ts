// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier, @typescript-eslint/no-namespace */

import type HelsinkiDateTime from '../../helsinki-date-time'
import { type MessageAttachment } from './attachment'
import { type MessageReceiver } from '../../api-types/messaging'
import { type UUID } from '../../types'

/**
* Generated from fi.espoo.evaka.messaging.AccountType
*/
export type AccountType =
  | 'PERSONAL'
  | 'GROUP'
  | 'CITIZEN'
  | 'MUNICIPAL'
  | 'SERVICE_WORKER'

/**
* Generated from fi.espoo.evaka.messaging.AuthorizedMessageAccount
*/
export interface AuthorizedMessageAccount {
  account: MessageAccount
  daycareGroup: Group | null
}

/**
* Generated from fi.espoo.evaka.messaging.CitizenMessageBody
*/
export interface CitizenMessageBody {
  children: UUID[]
  content: string
  recipients: UUID[]
  title: string
}

/**
* Generated from fi.espoo.evaka.messaging.DraftContent
*/
export interface DraftContent {
  attachments: MessageAttachment[]
  content: string
  created: HelsinkiDateTime
  id: UUID
  recipientIds: UUID[]
  recipientNames: string[]
  title: string
  type: MessageType
  urgent: boolean
}

/**
* Generated from fi.espoo.evaka.messaging.ChildRecipientsController.EditRecipientRequest
*/
export interface EditRecipientRequest {
  blocklisted: boolean
}

/**
* Generated from fi.espoo.evaka.messaging.MessageControllerCitizen.GetReceiversResponse
*/
export interface GetReceiversResponse {
  childrenToMessageAccounts: Record<string, UUID[]>
  messageAccounts: MessageAccount[]
}

/**
* Generated from fi.espoo.evaka.messaging.Group
*/
export interface Group {
  id: UUID
  name: string
  unitId: UUID
  unitName: string
}

/**
* Generated from fi.espoo.evaka.messaging.Message
*/
export interface Message {
  attachments: MessageAttachment[]
  content: string
  id: UUID
  readAt: HelsinkiDateTime | null
  recipientNames: string[] | null
  recipients: MessageAccount[]
  sender: MessageAccount
  sentAt: HelsinkiDateTime
  threadId: UUID
}

/**
* Generated from fi.espoo.evaka.messaging.MessageAccount
*/
export interface MessageAccount {
  id: UUID
  name: string
  type: AccountType
}

/**
* Generated from fi.espoo.evaka.messaging.MessageChild
*/
export interface MessageChild {
  childId: UUID
  firstName: string
  lastName: string
  preferredName: string
}

/**
* Generated from fi.espoo.evaka.messaging.MessageCopy
*/
export interface MessageCopy {
  attachments: MessageAttachment[]
  content: string
  messageId: UUID
  readAt: HelsinkiDateTime | null
  recipientAccountType: AccountType
  recipientId: UUID
  recipientName: string
  recipientNames: string[]
  senderAccountType: AccountType
  senderId: UUID
  senderName: string
  sentAt: HelsinkiDateTime
  threadId: UUID
  title: string
  type: MessageType
  urgent: boolean
}

/**
* Generated from fi.espoo.evaka.messaging.MessageReceiversResponse
*/
export interface MessageReceiversResponse {
  accountId: UUID
  receivers: MessageReceiver[]
}

/**
* Generated from fi.espoo.evaka.messaging.MessageRecipient
*/
export interface MessageRecipient {
  id: UUID
  type: MessageRecipientType
}

/**
* Generated from fi.espoo.evaka.messaging.MessageRecipientType
*/
export type MessageRecipientType =
  | 'AREA'
  | 'UNIT'
  | 'GROUP'
  | 'CHILD'
  | 'CITIZEN'

/**
* Generated from fi.espoo.evaka.messaging.MessageThread
*/
export interface MessageThread {
  children: MessageChild[]
  id: UUID
  isCopy: boolean
  messages: Message[]
  title: string
  type: MessageType
  urgent: boolean
}

/**
* Generated from fi.espoo.evaka.messaging.MessageType
*/
export type MessageType =
  | 'MESSAGE'
  | 'BULLETIN'

/**
* Generated from fi.espoo.evaka.messaging.MessageController.PostMessageBody
*/
export interface PostMessageBody {
  attachmentIds: UUID[]
  content: string
  draftId: UUID | null
  recipientNames: string[]
  recipients: MessageRecipient[]
  relatedApplicationId: UUID | null
  title: string
  type: MessageType
  urgent: boolean
}

/**
* Generated from fi.espoo.evaka.messaging.Recipient
*/
export interface Recipient {
  blocklisted: boolean
  firstName: string
  lastName: string
  personId: UUID
}

/**
* Generated from fi.espoo.evaka.messaging.ReplyToMessageBody
*/
export interface ReplyToMessageBody {
  content: string
  recipientAccountIds: UUID[]
}

/**
* Generated from fi.espoo.evaka.messaging.SentMessage
*/
export interface SentMessage {
  attachments: MessageAttachment[]
  content: string
  contentId: UUID
  recipientNames: string[]
  recipients: MessageAccount[]
  sentAt: HelsinkiDateTime
  threadTitle: string
  type: MessageType
  urgent: boolean
}

/**
* Generated from fi.espoo.evaka.messaging.MessageService.ThreadReply
*/
export interface ThreadReply {
  message: Message
  threadId: UUID
}

/**
* Generated from fi.espoo.evaka.messaging.UnreadCountByAccount
*/
export interface UnreadCountByAccount {
  accountId: UUID
  unreadCopyCount: number
  unreadCount: number
}

/**
* Generated from fi.espoo.evaka.messaging.UnreadCountByAccountAndGroup
*/
export interface UnreadCountByAccountAndGroup {
  accountId: UUID
  groupId: UUID
  unreadCopyCount: number
  unreadCount: number
}

/**
* Generated from fi.espoo.evaka.messaging.UpdatableDraftContent
*/
export interface UpdatableDraftContent {
  content: string
  recipientIds: UUID[]
  recipientNames: string[]
  title: string
  type: MessageType
  urgent: boolean
}
