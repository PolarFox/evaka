// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import styled from 'styled-components'
import _ from 'lodash'
import { faTimes, faTrash } from 'lib-icons'
import colors from 'lib-components/colors'
import InputField from 'lib-components/atoms/form/InputField'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import InlineButton from 'lib-components/atoms/buttons/InlineButton'
import Button from 'lib-components/atoms/buttons/Button'
import { defaultMargins, Gap } from 'lib-components/white-space'
import { Label } from 'lib-components/typography'
import { useTranslation } from '../../state/i18n'
import { Bulletin } from './types'

type Props = {
  bulletin: Bulletin
  onChange: (change: Partial<Bulletin>) => void
  onDeleteDraft: () => void
  onClose: () => void
  onSend: () => void
}

export default React.memo(function MessageEditor({
  bulletin,
  onChange,
  onDeleteDraft,
  onClose,
  onSend
}: Props) {
  const { i18n } = useTranslation()

  return (
    <Container>
      <TopBar>
        <span>{i18n.messages.messageEditor.newBulletin}</span>
        <IconButton icon={faTimes} onClick={onClose} white />
      </TopBar>
      <FormArea>
        <div>
          <div>
            {bulletin.receiverUnits.map(({ unitName }) => unitName).join(',')}
          </div>
          <div>
            {bulletin.receiverGroups
              .map(({ groupName }) => `${groupName} (YKSIKÖN NIMI)`)
              .join(',')}
          </div>
          <div>
            {bulletin.receiverChildren.map(
              ({ firstName, lastName }) => `${firstName} ${lastName}`
            )}
          </div>
        </div>
        <Gap size={'xs'} />
        <div>{i18n.messages.messageEditor.sender}</div>
        <Gap size={'xs'} />
        <InputField
          value={bulletin.sender}
          onChange={(sender) => onChange({ sender })}
          data-qa={'input-sender'}
        />
        <Gap size={'xs'} />
        <div>{i18n.messages.messageEditor.title}</div>
        <Gap size={'xs'} />
        <InputField
          value={bulletin.title}
          onChange={(title) => onChange({ title })}
          data-qa={'input-title'}
        />
        <Gap size={'s'} />

        <Label>{i18n.messages.messageEditor.message}</Label>
        <Gap size={'xs'} />
        <StyledTextArea
          value={bulletin.content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ content: e.target.value })
          }
          data-qa={'input-content'}
        />
        <Gap size={'s'} />
        <BottomRow>
          <InlineButton
            onClick={onDeleteDraft}
            text={i18n.messages.messageEditor.deleteDraft}
            icon={faTrash}
          />
          <Button
            text={i18n.messages.messageEditor.send}
            primary
            onClick={onSend}
            data-qa="send-bulletin-btn"
          />
        </BottomRow>
      </FormArea>
    </Container>
  )
})

const Container = styled.div`
  width: 680px;
  height: 100%;
  max-height: 700px;
  position: absolute;
  z-index: 100;
  right: 0;
  bottom: 0;
  box-shadow: 0 8px 8px 8px rgba(15, 15, 15, 0.15);
  display: flex;
  flex-direction: column;
  background-color: ${colors.greyscale.white};
`

const TopBar = styled.div`
  width: 100%;
  height: 60px;
  background-color: ${colors.primary};
  color: ${colors.greyscale.white};
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${defaultMargins.m};
`

const FormArea = styled.div`
  width: 100%;
  flex-grow: 1;
  padding: ${defaultMargins.m};
  display: flex;
  flex-direction: column;
`

const StyledTextArea = styled.textarea`
  width: 100%;
  resize: none;
  flex-grow: 1;
`

const BottomRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`
