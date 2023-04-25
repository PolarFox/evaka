// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import Footer, { footerHeightDesktop } from 'citizen-frontend/Footer'
import { renderResult } from 'citizen-frontend/async-rendering'
import { useUser } from 'citizen-frontend/auth/state'
import { useMutationResult, useQueryResult } from 'lib-common/query'
import type { UUID } from 'lib-common/types'
import Main from 'lib-components/atoms/Main'
import { desktopMin, tabletMin } from 'lib-components/breakpoints'
import AdaptiveFlex from 'lib-components/layout/AdaptiveFlex'
import Container from 'lib-components/layout/Container'
import { TabletAndDesktop } from 'lib-components/layout/responsive-layout'
import { defaultMargins, Gap } from 'lib-components/white-space'

import { useTranslation } from '../localization'

import EmptyThreadView from './EmptyThreadView'
import MessageEditor from './MessageEditor'
import ThreadList from './ThreadList'
import ThreadView from './ThreadView'
import { receiversQuery, sendMessageMutation } from './queries'
import { MessageContext } from './state'

const StyledFlex = styled(AdaptiveFlex)`
  align-items: stretch;
  top: ${defaultMargins.s};
  right: 0;
  bottom: 0;
  left: 0;
  height: calc(100% - ${footerHeightDesktop});

  @media (max-width: ${desktopMin}) {
    height: auto;
  }
`

export default React.memo(function MessagesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accountId, selectedThread, setSelectedThread } =
    useContext(MessageContext)
  const [editorVisible, setEditorVisible] = useState<boolean>(false)
  const [displaySendError, setDisplaySendError] = useState<boolean>(false)
  const t = useTranslation()
  const receivers = useQueryResult(receiversQuery(t.messages.staffAnnotation))

  const user = useUser()

  useEffect(() => {
    setEditorVisible(searchParams.get('editorVisible') === 'true')
  }, [setEditorVisible, searchParams])

  const changeEditorVisibility = useCallback(
    (setEditorVisible: boolean) => {
      if (!setEditorVisible) {
        navigate('/messages')
      } else {
        navigate(`/messages?editorVisible=true`)
      }
    },
    [navigate]
  )

  const params = useParams<{ threadId: UUID | undefined }>()
  useEffect(() => {
    setSelectedThread(params.threadId)
  }, [setSelectedThread, params.threadId])

  const selectThread = useCallback(
    (threadId: UUID | undefined) => {
      if (!threadId) {
        navigate('/messages')
      } else {
        navigate(`/messages/${threadId}`)
      }
    },
    [navigate]
  )

  const onSelectedThreadDeleted = useCallback(() => {
    changeEditorVisibility(false)
  }, [changeEditorVisibility])

  const canSendNewMessage =
    !editorVisible && !!user?.accessibleFeatures.composeNewMessage

  const { mutateAsync: sendMessage } = useMutationResult(sendMessageMutation)

  return (
    <Container>
      {renderResult(accountId, (id) => (
        <>
          <Main>
            <TabletAndDesktop>
              <Gap size="L" />
            </TabletAndDesktop>
            <StyledFlex breakpoint={tabletMin} horizontalSpacing="L">
              <ThreadList
                accountId={id}
                selectThread={selectThread}
                setEditorVisible={changeEditorVisibility}
                newMessageButtonEnabled={canSendNewMessage}
              />
              {selectedThread ? (
                <ThreadView
                  accountId={id}
                  closeThread={() => selectThread(undefined)}
                  thread={selectedThread}
                  onThreadDeleted={() => onSelectedThreadDeleted()}
                />
              ) : (
                <EmptyThreadView />
              )}
            </StyledFlex>
            {editorVisible &&
              renderResult(receivers, (receiverOptions) => (
                <MessageEditor
                  receiverOptions={receiverOptions}
                  onSend={sendMessage}
                  onSuccess={() => {
                    changeEditorVisibility(false)
                  }}
                  onFailure={() => setDisplaySendError(true)}
                  onClose={() => changeEditorVisibility(false)}
                  displaySendError={displaySendError}
                />
              ))}
          </Main>
          <Footer />
        </>
      ))}
    </Container>
  )
})
