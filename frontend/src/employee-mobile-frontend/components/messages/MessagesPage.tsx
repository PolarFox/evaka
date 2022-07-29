// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { GroupInfo } from 'lib-common/generated/api-types/attendance'
import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import EmptyMessageFolder from 'lib-components/employee/messages/EmptyMessageFolder'
import { ContentArea } from 'lib-components/layout/Container'
import { H1 } from 'lib-components/typography'
import { defaultMargins } from 'lib-components/white-space'
import colors from 'lib-customizations/common'

import { useTranslation } from '../../state/i18n'
import { MessageContext } from '../../state/messages'
import { UnitContext } from '../../state/unit'
import { renderResult } from '../async-rendering'
import BottomNavBar from '../common/BottomNavbar'
import { PageWithNavigation } from '../common/PageWithNavigation'
import TopBar from '../common/TopBar'

import { MessagePreview } from './MessagePreview'
import { ThreadView } from './ThreadView'

export default function MessagesPage() {
  const navigate = useNavigate()
  const { unitId } = useNonNullableParams<{
    unitId: UUID
  }>()

  const { unitInfoResponse } = useContext(UnitContext)

  function changeGroup(group: GroupInfo | undefined) {
    if (group) navigate(`/units/${unitId}/groups/${group.id}/messages`)
  }

  const {
    groupAccounts,
    receivedMessages,
    selectedThread,
    selectThread,
    selectedAccount
  } = useContext(MessageContext)

  const { i18n } = useTranslation()
  const onBack = useCallback(() => selectThread(undefined), [selectThread])

  return selectedThread && selectedAccount ? (
    <ContentArea
      opaque
      fullHeight
      paddingHorizontal="zero"
      paddingVertical="zero"
      data-qa="messages-page-content-area"
    >
      <ThreadView
        thread={selectedThread}
        onBack={onBack}
        senderAccountId={selectedAccount.account.id}
      />
    </ContentArea>
  ) : !selectedThread && selectedAccount ? (
    <PageWithNavigation
      selected="messages"
      selectedGroup={
        selectedAccount?.daycareGroup
          ? {
              id: selectedAccount.daycareGroup.id,
              name: selectedAccount.daycareGroup.name,
              utilization: 0
            }
          : undefined
      }
      onChangeGroup={changeGroup}
      allowedGroupIds={groupAccounts.flatMap((ga) => ga.daycareGroup?.id || [])}
      includeSelectAll={false}
    >
      {renderResult(receivedMessages, (messages) => (
        <ContentArea
          opaque
          paddingVertical="zero"
          paddingHorizontal="zero"
          data-qa="messages-page-content-area"
        >
          <HeaderContainer>
            <H1 noMargin={true}>{i18n.messages.title}</H1>
          </HeaderContainer>
          {messages.length > 0 ? (
            messages.map((thread) => (
              <MessagePreview
                thread={thread}
                hasUnreadMessages={thread.messages.some(
                  (item) =>
                    !item.readAt &&
                    item.sender.id !== selectedAccount?.account.id &&
                    !groupAccounts.some(
                      (ga) => ga.account.id === item.sender.id
                    )
                )}
                onClick={() => {
                  selectThread(thread)
                }}
                key={thread.id}
              />
            ))
          ) : (
            <EmptyMessageFolder
              loading={receivedMessages.isLoading}
              iconColor={colors.grayscale.g35}
              text={i18n.messages.emptyInbox}
            />
          )}
        </ContentArea>
      ))}
    </PageWithNavigation>
  ) : (
    renderResult(unitInfoResponse, (unit) => (
      <ContentArea
        opaque
        paddingVertical="zero"
        paddingHorizontal="zero"
        data-qa="messages-page-content-area"
      >
        <TopBar title={unit.name} />
        <HeaderContainer>
          <H1 noMargin={true}>{i18n.messages.title}</H1>
        </HeaderContainer>
        {groupAccounts.length === 0 ? (
          <NoAccounts data-qa="info-no-account-access">
            {i18n.messages.noAccountAccess}
          </NoAccounts>
        ) : (
          <EmptyMessageFolder
            loading={false}
            iconColor={colors.grayscale.g35}
            text={i18n.messages.emptyInbox}
          />
        )}
        <BottomNavBar selected="messages" />
      </ContentArea>
    ))
  )
}

export const HeaderContainer = styled.div`
  padding: ${defaultMargins.m} ${defaultMargins.s};
  border-bottom: 1px solid ${colors.grayscale.g15};
`

const NoAccounts = styled.div`
  padding: ${defaultMargins.m} ${defaultMargins.s};
`
