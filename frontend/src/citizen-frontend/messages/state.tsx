// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import uniqBy from 'lodash/uniqBy'
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import type { Result } from 'lib-common/api'
import { Failure, Loading } from 'lib-common/api'
import type {
  MessageThread,
  ThreadReply
} from 'lib-common/generated/api-types/messaging'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import {
  queryResult,
  useInfiniteQuery,
  useMutation,
  useMutationResult,
  useQueryResult
} from 'lib-common/query'
import type { UUID } from 'lib-common/types'

import { useUser } from '../auth/state'
import { useTranslation } from '../localization'

import type { ReplyToThreadParams } from './api'
import {
  markThreadReadMutation,
  messageAccountQuery,
  receivedMessagesQuery,
  replyToThreadMutation
} from './queries'

export interface MessagePageState {
  accountId: Result<UUID>
  threads: Result<MessageThread[]>
  hasMoreThreads: boolean
  loadMoreThreads: () => void
  selectedThread: MessageThread | undefined
  setSelectedThread: (threadId: UUID | undefined) => void
  sendReply: (params: ReplyToThreadParams) => Promise<Result<unknown>>
  setReplyContent: (threadId: UUID, content: string) => void
  getReplyContent: (threadId: UUID) => string
}

const defaultState: MessagePageState = {
  accountId: Loading.of(),
  threads: Loading.of(),
  loadMoreThreads: () => undefined,
  hasMoreThreads: false,
  selectedThread: undefined,
  setSelectedThread: () => undefined,
  sendReply: () => Promise.resolve(Failure.of({ message: 'Not initialized' })),
  getReplyContent: () => '',
  setReplyContent: () => undefined
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
            readAt: m.readAt ?? HelsinkiDateTime.now()
          }))
        }
      : t
  )

export const MessageContextProvider = React.memo(
  function MessageContextProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslation()

    const isLoggedIn = useUser() !== undefined
    const accountId = useQueryResult(messageAccountQuery, {
      enabled: isLoggedIn,
      staleTime: 24 * 60 * 60 * 1000
    })

    const {
      data,
      fetchNextPage,
      transformPages,
      error,
      isFetching,
      isFetchingNextPage,
      hasNextPage
    } = useInfiniteQuery(
      receivedMessagesQuery(t.messages.staffAnnotation, 10),
      {
        enabled: accountId.isSuccess
      }
    )

    const isFetchingFirstPage = isFetching && !isFetchingNextPage
    const threads = useMemo(
      () =>
        // Use .map() to only call uniqBy/flatMap when it's a Success
        queryResult(null, error, isFetchingFirstPage).map(() =>
          data
            ? uniqBy(
                data.pages.flatMap((p) => p.data),
                'id'
              )
            : []
        ),
      [data, error, isFetchingFirstPage]
    )

    const [selectedThreadId, setSelectedThreadId] = useState<UUID>()

    const [replyContents, setReplyContents] = useState<Record<UUID, string>>({})
    const getReplyContent = useCallback(
      (threadId: UUID) => replyContents[threadId] ?? '',
      [replyContents]
    )
    const setReplyContent = useCallback((threadId: UUID, content: string) => {
      setReplyContents((state) => ({ ...state, [threadId]: content }))
    }, [])

    const { mutateAsync: sendReply } = useMutationResult(
      replyToThreadMutation,
      {
        onSuccess: ({ message, threadId }: ThreadReply) => {
          // Append the new message to the thread
          transformPages((page) => ({
            ...page,
            data: page.data.map((thread) =>
              thread.id === threadId
                ? { ...thread, messages: [...thread.messages, message] }
                : thread
            )
          }))
          setReplyContents((state) => ({ ...state, [threadId]: '' }))
        }
      }
    )

    const selectedThread = useMemo(
      () =>
        selectedThreadId !== undefined
          ? threads
              .map((threads) => threads.find((t) => t.id === selectedThreadId))
              .getOrElse(undefined)
          : undefined,
      [selectedThreadId, threads]
    )

    const { mutate: markThreadRead } = useMutation(markThreadReadMutation)
    useEffect(() => {
      if (!accountId.isSuccess) return
      if (!selectedThreadId || !selectedThread) return

      const hasUnreadMessages = selectedThread?.messages.some(
        (m) => !m.readAt && m.sender.id !== accountId.value
      )

      if (hasUnreadMessages) {
        markThreadRead(selectedThread.id)
        transformPages((page) => ({
          ...page,
          data: markMatchingThreadRead(page.data, selectedThreadId)
        }))
      }
    }, [
      accountId,
      markThreadRead,
      selectedThread,
      selectedThreadId,
      transformPages
    ])

    const value = useMemo(
      () => ({
        accountId,
        threads,
        getReplyContent,
        setReplyContent,
        loadMoreThreads: () => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage()
          }
        },
        hasMoreThreads: hasNextPage !== undefined && hasNextPage,
        selectedThread,
        setSelectedThread: setSelectedThreadId,
        sendReply
      }),
      [
        accountId,
        fetchNextPage,
        getReplyContent,
        hasNextPage,
        isFetchingNextPage,
        selectedThread,
        sendReply,
        setReplyContent,
        threads
      ]
    )

    return (
      <MessageContext.Provider value={value}>
        {children}
      </MessageContext.Provider>
    )
  }
)
