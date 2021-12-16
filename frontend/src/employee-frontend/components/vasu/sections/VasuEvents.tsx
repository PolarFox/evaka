// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useMemo } from 'react'
import styled from 'styled-components'
import HorizontalLine from 'lib-components/atoms/HorizontalLine'
import { ContentArea } from 'lib-components/layout/Container'
import ListGrid from 'lib-components/layout/ListGrid'
import { Dimmed, H2, Label } from 'lib-components/typography'
import { defaultMargins } from 'lib-components/white-space'
import { useTranslation } from '../../../state/i18n'
import { VasuStateChip } from '../../common/VasuStateChip'
import { VasuDocument } from 'lib-common/generated/api-types/vasu'
import { getLastPublished } from '../vasu-events'
import LocalDate from 'lib-common/local-date'
import { isDateQuestion } from '../vasu-content'

const labelWidth = '320px'

const Container = styled(ContentArea)`
  padding: ${defaultMargins.L};
  ${H2} {
    margin-top: 0;
  }
`

const ChipContainer = styled.div`
  display: inline-flex;
`

function EventRow({ label, date }: { label: string; date: LocalDate | null }) {
  const { i18n } = useTranslation()

  return (
    <>
      <Label>{label}</Label>
      {date ? (
        <span>{date.format()}</span>
      ) : (
        <Dimmed>{i18n.vasu.noRecord}</Dimmed>
      )}
    </>
  )
}

interface Props {
  document: Pick<VasuDocument, 'documentState' | 'events' | 'modifiedAt'>
  content: VasuDocument['content']
}

export function VasuEvents({
  document: { documentState, events, modifiedAt },
  content
}: Props) {
  const { i18n } = useTranslation()
  const lastPublished = getLastPublished(events)

  const trackedDates: [string, LocalDate][] = useMemo(
    () =>
      content.sections.flatMap((section) =>
        section.questions
          .filter(isDateQuestion)
          .filter((question) => question.trackedInEvents)
          .map(({ name, nameInEvents, value }): [string, LocalDate | null] => [
            nameInEvents || name,
            value
          ])
          .filter((pair): pair is [string, LocalDate] => pair[1] !== null)
      ),
    [content]
  )

  return (
    <Container opaque>
      <H2>{i18n.vasu.events}</H2>
      <ListGrid labelWidth={labelWidth}>
        <Label>{i18n.vasu.state}</Label>
        <ChipContainer>
          <VasuStateChip state={documentState} labels={i18n.vasu.states} />
        </ChipContainer>
        <EventRow
          label={i18n.vasu.lastModified}
          date={LocalDate.fromSystemTzDate(modifiedAt)}
        />
        <EventRow
          label={i18n.vasu.lastPublished}
          date={
            lastPublished ? LocalDate.fromSystemTzDate(lastPublished) : null
          }
        />
        {trackedDates.map(([label, date]) => (
          <EventRow key={label} label={label} date={date} />
        ))}
      </ListGrid>
      {events.length > 0 && (
        <>
          <HorizontalLine slim />
          <ListGrid labelWidth={labelWidth}>
            {events.map(({ id, eventType, created }) => (
              <EventRow
                key={id}
                label={i18n.vasu.eventTypes[eventType]}
                date={LocalDate.fromSystemTzDate(created)}
              />
            ))}
          </ListGrid>
        </>
      )}
    </Container>
  )
}
