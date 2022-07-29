// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

import type { Paged, Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type {
  DraftContent,
  Message,
  MessageThread,
  AuthorizedMessageAccount,
  SentMessage,
  ThreadReply,
  UnreadCountByAccount
} from 'lib-common/generated/api-types/messaging'
import type { UUID } from 'lib-common/types'
import { usePeriodicRefresh } from 'lib-common/utils/usePeriodicRefresh'
import { useApiState, useRestApi } from 'lib-common/utils/useRestApi'
import type { ReactSelectOption } from 'lib-components/employee/messages/SelectorNode'

import { client } from '../../api/client'
import { UserContext } from '../../state/user'

import type { ReplyToThreadParams } from './api'
import {
  getMessageDrafts,
  getMessagingAccounts,
  getReceivedMessages,
  getSentMessages,
  getUnreadCounts,
  markThreadRead,
  replyToThread
} from './api'
import type { AccountView } from './types-view'

const PAGE_SIZE = 20
type RepliesByThread = Record<UUID, string>

export interface MessagesState {
  accounts: Result<AuthorizedMessageAccount[]>
  selectedDraft: DraftContent | undefined
  setSelectedDraft: (draft: DraftContent | undefined) => void
  selectedAccount: AccountView | undefined
  setSelectedAccount: (view: AccountView) => void
  selectedUnit: ReactSelectOption | undefined
  setSelectedUnit: (unit: ReactSelectOption) => void
  page: number
  setPage: (page: number) => void
  pages: number | undefined
  setPages: (pages: number) => void
  receivedMessages: Result<MessageThread[]>
  sentMessages: Result<SentMessage[]>
  messageDrafts: Result<DraftContent[]>
  selectedThread: MessageThread | undefined
  selectThread: (thread: MessageThread | undefined) => void
  sendReply: (params: ReplyToThreadParams) => void
  replyState: Result<void> | undefined
  setReplyContent: (threadId: UUID, content: string) => void
  getReplyContent: (threadId: UUID) => string
  refreshMessages: (account?: UUID) => void
  unreadCountsByAccount: Result<UnreadCountByAccount[]>
}

const defaultState: MessagesState = {
  accounts: Loading.of(),
  selectedDraft: undefined,
  setSelectedDraft: () => undefined,
  selectedAccount: undefined,
  setSelectedAccount: () => undefined,
  selectedUnit: undefined,
  setSelectedUnit: () => undefined,
  page: 1,
  setPage: () => undefined,
  pages: undefined,
  setPages: () => undefined,
  receivedMessages: Loading.of(),
  sentMessages: Loading.of(),
  messageDrafts: Loading.of(),
  selectedThread: undefined,
  selectThread: () => undefined,
  sendReply: () => undefined,
  replyState: undefined,
  getReplyContent: () => '',
  setReplyContent: () => undefined,
  refreshMessages: () => undefined,
  unreadCountsByAccount: Loading.of()
}

export const MessageContext = createContext<MessagesState>(defaultState)

const appendMessageAndMoveThreadToTopOfList =
  (threadId: UUID, message: Message) => (state: Result<MessageThread[]>) =>
    state.map((threads) => {
      const thread = threads.find((t) => t.id === threadId)
      if (!thread) return threads
      const otherThreads = threads.filter((t) => t.id !== threadId)
      return [
        {
          ...thread,
          messages: [...thread.messages, message]
        },
        ...otherThreads
      ]
    })

export const MessageContextProvider = React.memo(
  function MessageContextProvider({ children }: { children: JSX.Element }) {
    const [selectedUnit, setSelectedUnit] = useState<
      ReactSelectOption | undefined
    >()
    const { user } = useContext(UserContext)

    const [accounts] = useApiState(
      () =>
        user?.accessibleFeatures.messages
          ? getMessagingAccounts()
          : Promise.resolve(Loading.of<AuthorizedMessageAccount[]>()),
      [user]
    )

    const [unreadCountsByAccount, refreshUnreadCounts] = useApiState(
      () =>
        user?.accessibleFeatures.messages
          ? getUnreadCounts()
          : Promise.resolve(Loading.of<UnreadCountByAccount[]>()),
      [user]
    )

    usePeriodicRefresh(client, refreshUnreadCounts, { thresholdInMinutes: 1 })

    const [unverifiedSelectedAccount, setSelectedAccount] =
      useState<AccountView>()

    const selectedAccount = useMemo(
      () =>
        unverifiedSelectedAccount &&
        accounts.isSuccess &&
        accounts.value.find(
          (a) => a.account.id === unverifiedSelectedAccount.account.id
        )
          ? unverifiedSelectedAccount
          : undefined,
      [accounts, unverifiedSelectedAccount]
    )

    const [selectedDraft, setSelectedDraft] = useState(
      defaultState.selectedDraft
    )

    const [selectedThread, setSelectedThread] = useState<MessageThread>()

    const [page, setPage] = useState<number>(1)
    const [pages, setPages] = useState<number>()
    const [receivedMessages, setReceivedMessages] = useState<
      Result<MessageThread[]>
    >(Loading.of())
    const [messageDrafts, setMessageDrafts] = useState<Result<DraftContent[]>>(
      Loading.of()
    )
    const [sentMessages, setSentMessages] = useState<Result<SentMessage[]>>(
      Loading.of()
    )

    const setReceivedMessagesResult = useCallback(
      (result: Result<Paged<MessageThread>>) => {
        setReceivedMessages(result.map((r) => r.data))
        if (result.isSuccess) {
          setPages(result.value.pages)
        }
      },
      []
    )
    const loadReceivedMessages = useRestApi(
      getReceivedMessages,
      setReceivedMessagesResult
    )

    const loadMessageDrafts = useRestApi(getMessageDrafts, setMessageDrafts)

    const setSentMessagesResult = useCallback(
      (result: Result<Paged<SentMessage>>) => {
        setSentMessages(result.map((r) => r.data))
        if (result.isSuccess) {
          setPages(result.value.pages)
        }
      },
      []
    )
    const loadSentMessages = useRestApi(getSentMessages, setSentMessagesResult)

    // load messages if account, view or page changes
    const loadMessages = useCallback(() => {
      if (!selectedAccount) {
        return
      }
      switch (selectedAccount.view) {
        case 'RECEIVED':
          void loadReceivedMessages(selectedAccount.account.id, page, PAGE_SIZE)
          break
        case 'SENT':
          void loadSentMessages(selectedAccount.account.id, page, PAGE_SIZE)
          break
        case 'DRAFTS':
          void loadMessageDrafts(selectedAccount.account.id)
      }
    }, [
      loadMessageDrafts,
      loadReceivedMessages,
      loadSentMessages,
      page,
      selectedAccount
    ])

    const [replyState, setReplyState] = useState<Result<void>>()
    const setReplyResponse = useCallback((res: Result<ThreadReply>) => {
      setReplyState(res.map(() => undefined))
      if (res.isSuccess) {
        const {
          value: { message, threadId }
        } = res
        setReceivedMessages(
          appendMessageAndMoveThreadToTopOfList(threadId, message)
        )
        setSelectedThread((thread) =>
          thread?.id === threadId
            ? { ...thread, messages: [...thread.messages, message] }
            : thread
        )
        setReplyContents((state) => ({ ...state, [threadId]: '' }))
      }
    }, [])
    const reply = useRestApi(replyToThread, setReplyResponse)
    const sendReply = useCallback(reply, [reply])

    const [replyContents, setReplyContents] = useState<RepliesByThread>({})

    const getReplyContent = useCallback(
      (threadId: UUID) => replyContents[threadId] ?? '',
      [replyContents]
    )
    const setReplyContent = useCallback((threadId: UUID, content: string) => {
      setReplyContents((state) => ({ ...state, [threadId]: content }))
    }, [])

    const refreshMessages = useCallback(
      (accountId?: UUID) => {
        if (!accountId || selectedAccount?.account.id === accountId) {
          loadMessages()
        }
      },
      [loadMessages, selectedAccount]
    )
    const selectThread = useCallback(
      (thread: MessageThread | undefined) => {
        setSelectedThread(thread)
        if (!thread) return
        if (!selectedAccount) throw new Error('Should never happen')

        const accountId = selectedAccount.account.id
        const hasUnreadMessages = thread.messages.some(
          (m) => !m.readAt && m.sender.id !== accountId
        )
        if (hasUnreadMessages) {
          void markThreadRead(accountId, thread.id).then(() => {
            refreshMessages(accountId)
            void refreshUnreadCounts()
          })
        }
      },
      [refreshMessages, selectedAccount, refreshUnreadCounts]
    )

    const value = useMemo(
      () => ({
        accounts,
        selectedDraft,
        setSelectedDraft,
        selectedAccount,
        setSelectedAccount,
        selectedUnit,
        setSelectedUnit,
        page,
        setPage,
        pages,
        setPages,
        receivedMessages,
        sentMessages,
        messageDrafts,
        selectedThread,
        selectThread,
        replyState,
        sendReply,
        getReplyContent,
        setReplyContent,
        refreshMessages,
        unreadCountsByAccount
      }),
      [
        accounts,
        selectedDraft,
        selectedAccount,
        selectedUnit,
        setSelectedUnit,
        page,
        pages,
        receivedMessages,
        sentMessages,
        messageDrafts,
        selectedThread,
        selectThread,
        replyState,
        sendReply,
        getReplyContent,
        setReplyContent,
        refreshMessages,
        unreadCountsByAccount
      ]
    )

    return (
      <MessageContext.Provider value={value}>
        {children}
      </MessageContext.Provider>
    )
  }
)
