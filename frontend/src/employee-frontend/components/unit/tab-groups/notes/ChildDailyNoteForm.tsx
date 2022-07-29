// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { Fragment, useCallback, useState } from 'react'

import type { UpdateStateFn } from 'lib-common/form-state'
import type {
  ChildDailyNote,
  ChildDailyNoteBody,
  ChildDailyNoteReminder
} from 'lib-common/generated/api-types/note'
import {
  childDailyNoteLevelValues,
  childDailyNoteReminderValues
} from 'lib-common/generated/api-types/note'
import type { UUID } from 'lib-common/types'
import { ChipWrapper, ChoiceChip } from 'lib-components/atoms/Chip'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import ResponsiveInlineButton from 'lib-components/atoms/buttons/ResponsiveInlineButton'
import Checkbox from 'lib-components/atoms/form/Checkbox'
import InputField from 'lib-components/atoms/form/InputField'
import TextArea from 'lib-components/atoms/form/TextArea'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import { H1, H2, H3, Label } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'
import { faTrash } from 'lib-icons'

import {
  deleteChildDailyNote,
  postChildDailyNote,
  putChildDailyNote
} from '../../../../api/daycare-notes'
import { useTranslation } from '../../../../state/i18n'

interface ChildDailyNoteFormData
  extends Omit<ChildDailyNoteBody, 'sleepingMinutes'> {
  sleepingHours: string
  sleepingMinutes: string
}

const initialFormData = (
  note: ChildDailyNote | null
): ChildDailyNoteFormData => {
  return note
    ? {
        ...note,
        sleepingHours: note.sleepingMinutes
          ? Math.floor(Number(note.sleepingMinutes) / 60).toString()
          : '',
        sleepingMinutes: note.sleepingMinutes
          ? Math.round(Number(note.sleepingMinutes) % 60).toString()
          : ''
      }
    : {
        reminders: [],
        feedingNote: null,
        note: '',
        reminderNote: '',
        sleepingHours: '',
        sleepingMinutes: '',
        sleepingNote: null
      }
}

const formDataToRequestBody = (
  form: ChildDailyNoteFormData
): ChildDailyNoteBody => ({
  feedingNote: form.feedingNote,
  note: form.note,
  reminderNote: form.reminderNote,
  reminders: form.reminders,
  sleepingMinutes:
    form.sleepingHours || form.sleepingMinutes
      ? 60 * (parseInt(form.sleepingHours) || 0) +
        (parseInt(form.sleepingMinutes) || 0)
      : null,
  sleepingNote: form.sleepingNote
})

interface Props {
  note: ChildDailyNote | null
  childId: UUID
  childName: string
  onSuccess: () => void
  onCancel: () => void
  onRemove: () => void
}

export default React.memo(function ChildDailyNoteForm({
  note,
  childId,
  childName,
  onCancel,
  onRemove,
  onSuccess
}: Props) {
  const { i18n } = useTranslation()

  const [form, setForm] = useState<ChildDailyNoteFormData>(
    initialFormData(note)
  )
  const updateForm: UpdateStateFn<ChildDailyNoteFormData> = useCallback(
    (updates) => {
      setForm((prev) => ({ ...prev, ...updates }))
    },
    []
  )
  const toggleReminder = (reminder: ChildDailyNoteReminder) => {
    const reminders = form.reminders.some((r) => r == reminder)
      ? form.reminders.filter((r) => r != reminder)
      : [...form.reminders, reminder]
    updateForm({ reminders })
  }

  const [submitting, setSubmitting] = useState(false)
  const submit = useCallback(() => {
    setSubmitting(true)
    const body = formDataToRequestBody(form)
    return note
      ? putChildDailyNote(note.id, body)
      : postChildDailyNote(childId, body)
  }, [childId, form, note])
  const submitSuccess = useCallback(() => {
    setSubmitting(false)
    onSuccess()
  }, [onSuccess])
  const submitFailure = useCallback(() => {
    setSubmitting(false)
  }, [])

  const [deleting, setDeleting] = useState(false)
  const clearNote = useCallback(() => {
    if (!note?.id) {
      return Promise.reject()
    }
    setDeleting(true)
    return deleteChildDailyNote(note.id).then((res) => {
      setDeleting(false)
      if (res.isSuccess) {
        onRemove()
      }
    })
  }, [note, onRemove])

  return (
    <>
      <H1 primary noMargin>
        {i18n.unit.groups.daycareDailyNote.header}
      </H1>
      <Gap size="xs" />
      <H3 primary noMargin>
        {childName}
      </H3>

      <Gap size="L" />

      <FixedSpaceColumn alignItems="left" fullWidth spacing="m">
        <TextArea
          autoFocus
          value={form.note}
          onChange={(note) => updateForm({ note })}
          placeholder={i18n.unit.groups.daycareDailyNote.notesHint}
          data-qa="note-input"
        />

        <FixedSpaceRow fullWidth justifyContent="space-between" spacing="s">
          <H2 noMargin>{i18n.unit.groups.daycareDailyNote.otherThings}</H2>
          {note && (
            <ResponsiveInlineButton
              icon={faTrash}
              onClick={clearNote}
              disabled={deleting || submitting}
              text={i18n.common.clear}
              data-qa="btn-delete"
            />
          )}
        </FixedSpaceRow>

        <FixedSpaceColumn spacing="s">
          <Label>{i18n.unit.groups.daycareDailyNote.feedingHeader}</Label>
          <ChipWrapper margin="zero">
            {childDailyNoteLevelValues.map((level) => (
              <Fragment key={level}>
                <ChoiceChip
                  text={i18n.unit.groups.daycareDailyNote.level[level]}
                  selected={form.feedingNote === level}
                  onChange={() =>
                    updateForm({
                      feedingNote: form.feedingNote === level ? null : level
                    })
                  }
                  data-qa={`feeding-level-${level.toLowerCase()}`}
                />
                <Gap horizontal size="xxs" />
              </Fragment>
            ))}
          </ChipWrapper>
        </FixedSpaceColumn>

        <FixedSpaceColumn spacing="s">
          <Label>{i18n.unit.groups.daycareDailyNote.sleepingHeader}</Label>
          <ChipWrapper margin="zero">
            {childDailyNoteLevelValues.map((level) => (
              <Fragment key={level}>
                <ChoiceChip
                  text={i18n.unit.groups.daycareDailyNote.level[level]}
                  selected={form.sleepingNote === level}
                  onChange={() =>
                    updateForm({
                      sleepingNote: form.sleepingNote === level ? null : level
                    })
                  }
                  data-qa={`sleeping-level-${level.toLowerCase()}`}
                />
                <Gap horizontal size="xxs" />
              </Fragment>
            ))}
          </ChipWrapper>

          <FixedSpaceRow
            justifyContent="flex-start"
            spacing="s"
            alignItems="baseline"
          >
            <InputField
              type="number"
              width="s"
              placeholder={i18n.unit.groups.daycareDailyNote.sleepingHoursHint}
              value={form.sleepingHours || ''}
              onChange={(sleepingHours) => updateForm({ sleepingHours })}
              data-qa="sleeping-hours-input"
            />
            <span>{i18n.unit.groups.daycareDailyNote.sleepingHours}</span>
            <InputField
              type="number"
              width="s"
              placeholder={
                i18n.unit.groups.daycareDailyNote.sleepingMinutesHint
              }
              value={form.sleepingMinutes || ''}
              onChange={(sleepingMinutes) => updateForm({ sleepingMinutes })}
              data-qa="sleeping-minutes-input"
              info={
                Number(form.sleepingMinutes) > 59
                  ? {
                      text: i18n.common.error.minutes,
                      status: 'warning'
                    }
                  : undefined
              }
            />
            <span>{i18n.unit.groups.daycareDailyNote.sleepingMinutes}</span>
          </FixedSpaceRow>
        </FixedSpaceColumn>

        <FixedSpaceColumn spacing="s">
          <Label>{i18n.unit.groups.daycareDailyNote.reminderHeader}</Label>
          <FixedSpaceColumn spacing="xs">
            {childDailyNoteReminderValues.map((reminder) => (
              <Checkbox
                key={reminder}
                label={i18n.unit.groups.daycareDailyNote.reminderType[reminder]}
                onChange={() => toggleReminder(reminder)}
                checked={form.reminders.includes(reminder)}
                data-qa={`checkbox-${reminder}`}
              />
            ))}
            <TextArea
              type="text"
              placeholder={
                i18n.unit.groups.daycareDailyNote.otherThingsToRememberHeader
              }
              value={form.reminderNote}
              onChange={(reminderNote) => updateForm({ reminderNote })}
              data-qa="reminder-note-input"
            />
          </FixedSpaceColumn>
        </FixedSpaceColumn>
        <FixedSpaceRow justifyContent="space-around">
          <Button
            onClick={onCancel}
            text={i18n.common.cancel}
            data-qa="btn-cancel"
          />
          <AsyncButton
            primary
            onClick={submit}
            text={i18n.common.save}
            onSuccess={submitSuccess}
            onFailure={submitFailure}
            data-qa="btn-submit"
          />
        </FixedSpaceRow>
      </FixedSpaceColumn>
    </>
  )
})
