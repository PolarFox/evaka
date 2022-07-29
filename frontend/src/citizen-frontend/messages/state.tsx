// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import type { Paged, Result } from 'lib-common/api'
import { Loading, Success } from 'lib-common/api'
import type {
  MessageThread,
  ThreadReply,
  UnreadCountByAccount
} from 'lib-common/generated/api-types/messaging'
import type { UUID } from 'lib-common/types'
import { useRestApi } from 'lib-common/utils/useRestApi'

import { useTranslation } from '../localization'

import type { ReplyToThreadParams } from './api'
import {
  getMessageAccount,
  getReceivedMessages,
  getUnreadMessagesCount,
  markThreadRead,
  replyToThread
} from './api'

const initialThreadState: ThreadsState = {
  threads: [],
  selectedThread: undefined,
  loadingResult: Loading.of(),
  currentPage: 0,
  pages: Infinity
}

interface ThreadsState {
  threads: MessageThread[]
  selectedThread: UUID | undefined
  loadingResult: Result<void>
  currentPage: number
  pages: number
}

export interface MessagePageState {
  accountId: Result<UUID>
  loadAccount: () => void
  threads: MessageThread[]
  refreshThreads: () => void
  threadLoadingResult: Result<void>
  loadMoreThreads: () => void
  selectedThread: MessageThread | undefined
  setSelectedThread: (threadId: UUID | undefined) => void
  sendReply: (params: ReplyToThreadParams) => void
  replyState: Result<void> | undefined
  setReplyContent: (threadId: UUID, content: string) => void
  getReplyContent: (threadId: UUID) => string
  unreadMessagesCount: number | undefined
  refreshUnreadMessagesCount: () => void
}

const defaultState: MessagePageState = {
  accountId: Loading.of(),
  loadAccount: () => undefined,
  threads: [],
  refreshThreads: () => undefined,
  threadLoadingResult: Loading.of(),
  loadMoreThreads: () => undefined,
  selectedThread: undefined,
  setSelectedThread: () => undefined,
  sendReply: () => undefined,
  replyState: undefined,
  getReplyContent: () => '',
  setReplyContent: () => undefined,
  unreadMessagesCount: undefined,
  refreshUnreadMessagesCount: () => undefined
}

export const MessageContext = createContext<MessagePageState>(defaultState)

const markMatchingThreadRead = (
  threads: MessageThread[],
  id: UUID
): MessageThread[] =>
  threads.map((t) =>
    t.id === id
      ? {
          ...t,
          messages: t.messages.map((m) => ({
            ...m,
            readAt: m.readAt || new Date()
          }))
        }
      : t
  )

export const MessageContextProvider = React.memo(
  function MessageContextProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslation()
    const [accountId, setAccountId] = useState<Result<UUID>>(Loading.of())
    const loadAccount = useRestApi(getMessageAccount, setAccountId)

    const [threads, setThreads] = useState<ThreadsState>(initialThreadState)

    const setMessagesResult = useCallback(
      (result: Result<Paged<MessageThread>>) =>
        setThreads((state) =>
          result.mapAll({
            loading: () => state,
            failure: () => ({
              ...state,
              loadingResult: result.map(() => undefined)
            }),
            success: ({ data, pages }) => ({
              ...state,
              threads: [...state.threads, ...data],
              loadingResult: Success.of(undefined),
              pages
            })
          })
        ),
      []
    )

    const loadMessages = useRestApi(getReceivedMessages, setMessagesResult)
    const refreshThreads = useCallback(() => {
      setThreads({ ...initialThreadState })
      setThreads((threads) => ({ ...threads, currentPage: 1 }))
    }, [])

    useEffect(() => {
      if (threads.currentPage > 0) {
        setThreads((state) => ({ ...state, loadingResult: Loading.of() }))
        void loadMessages(threads.currentPage, t.messages.staffAnnotation)
      }
    }, [loadMessages, threads.currentPage, t.messages.staffAnnotation])

    const loadMoreThreads = useCallback(() => {
      if (threads.currentPage < threads.pages) {
        setThreads((state) => ({
          ...state,
          currentPage: state.currentPage + 1
        }))
      }
    }, [threads.currentPage, threads.pages])

    useEffect(() => {
      if (accountId.isSuccess) {
        setThreads((state) => ({ ...state, currentPage: 1 }))
      }
    }, [accountId])

    const [replyState, setReplyState] = useState<Result<void>>()
    const setReplyResponse = useCallback((res: Result<ThreadReply>) => {
      setReplyState(res.map(() => undefined))
      if (res.isSuccess) {
        const {
          value: { message, threadId }
        } = res
        setThreads(function appendMessageAndMoveThreadToTopOfList(state) {
          const thread = state.threads.find((t) => t.id === threadId)
          if (!thread) return state
          const otherThreads = state.threads.filter((t) => t.id !== threadId)
          return {
            ...state,
            threads: [
              {
                ...thread,
                messages: [...thread.messages, message]
              },
              ...otherThreads
            ]
          }
        })
        setReplyContents((state) => ({ ...state, [threadId]: '' }))
      }
    }, [])
    const reply = useRestApi(replyToThread, setReplyResponse)
    const sendReply = useCallback(reply, [reply])

    const [replyContents, setReplyContents] = useState<Record<UUID, string>>({})

    const getReplyContent = useCallback(
      (threadId: UUID) => replyContents[threadId] ?? '',
      [replyContents]
    )
    const setReplyContent = useCallback((threadId: UUID, content: string) => {
      setReplyContents((state) => ({ ...state, [threadId]: content }))
    }, [])

    const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>()
    const setUnreadResult = useCallback(
      (res: Result<UnreadCountByAccount[]>) => {
        if (res.isSuccess) {
          setUnreadMessagesCount(res.value[0].unreadCount)
        }
      },
      []
    )
    const refreshUnreadMessagesCount = useRestApi(
      getUnreadMessagesCount,
      setUnreadResult
    )

    const setSelectedThread = useCallback(
      (threadId: UUID | undefined) =>
        setThreads((state) => ({ ...state, selectedThread: threadId })),
      [setThreads]
    )

    const selectedThread = useMemo(
      () =>
        threads.selectedThread
          ? threads.threads.find((t) => t.id === threads.selectedThread)
          : undefined,
      [threads.selectedThread, threads.threads]
    )

    useEffect(() => {
      if (!selectedThread) return

      if (!accountId.isSuccess) return

      const hasUnreadMessages = selectedThread?.messages.some(
        (m) => !m.readAt && m.sender.id !== accountId.value
      )

      if (hasUnreadMessages) {
        setThreads((state) => {
          return {
            ...state,
            threads: markMatchingThreadRead(state.threads, selectedThread.id)
          }
        })

        void markThreadRead(selectedThread.id).then(() => {
          void refreshUnreadMessagesCount()
        })
      }
    }, [selectedThread, accountId, refreshUnreadMessagesCount])

    const value = useMemo(
      () => ({
        accountId,
        loadAccount,
        threads: threads.threads,
        refreshThreads,
        threadLoadingResult: threads.loadingResult,
        getReplyContent,
        setReplyContent,
        loadMoreThreads,
        selectedThread,
        setSelectedThread,
        replyState,
        sendReply,
        unreadMessagesCount,
        refreshUnreadMessagesCount
      }),
      [
        accountId,
        loadAccount,
        threads.threads,
        refreshThreads,
        threads.loadingResult,
        getReplyContent,
        setReplyContent,
        loadMoreThreads,
        selectedThread,
        setSelectedThread,
        replyState,
        sendReply,
        unreadMessagesCount,
        refreshUnreadMessagesCount
      ]
    )

    return (
      <MessageContext.Provider value={value}>
        {children}
      </MessageContext.Provider>
    )
  }
)
