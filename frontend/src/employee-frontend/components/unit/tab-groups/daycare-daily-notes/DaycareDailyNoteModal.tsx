import React, { useState } from 'react'
import { useTranslation } from '../../../../state/i18n'
import { faExclamation, faTrash } from 'lib-icons'
import {
  DaycareDailyNote,
  DaycareDailyNoteReminder
} from '../../../../types/unit'
import { formatName } from '../../../../utils'
import LocalDate from 'lib-common/local-date'
import {
  DaycareDailyNoteFormData,
  deleteDaycareDailyNote,
  upsertChildDaycareDailyNote,
  upsertGroupDaycareDailyNote
} from '../../../../api/unit'
import FormModal from 'lib-components/molecules/modals/FormModal'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import InputField, { TextArea } from 'lib-components/atoms/form/InputField'
import Checkbox from 'lib-components/atoms/form/Checkbox'
import Radio from 'lib-components/atoms/form/Radio'
import styled from 'styled-components'
import colors from 'lib-components/colors'

const GrayFontContainer = styled.div`
  & * {
    color: ${colors.greyscale.medium};
  }
`

interface Props {
  note: DaycareDailyNote | null
  childId: string | null
  groupId: string | null
  childFirstName: string
  childLastName: string
  groupNote: string | null
  onClose: () => void
  reload: () => void
}

const initialFormData = (
  note: DaycareDailyNote | null,
  childId: string | null,
  groupId: string | null
): DaycareDailyNoteFormData => {
  return note != null
    ? { ...note, childId, groupId }
    : {
        childId,
        groupId,
        date: LocalDate.today(),
        reminders: []
      }
}

export default React.memo(function DaycareDailyNoteModal({
  note,
  childId,
  groupId,
  childFirstName,
  childLastName,
  groupNote,
  onClose,
  reload
}: Props) {
  const { i18n } = useTranslation()

  const [form, setForm] = useState<DaycareDailyNoteFormData>(
    initialFormData(note, childId, groupId)
  )

  const updateForm = (updates: Partial<DaycareDailyNoteFormData>) => {
    const newForm = { ...form, ...updates }
    setForm(newForm)
  }

  const submit = () => {
    if (childId != null) {
      void upsertChildDaycareDailyNote(childId, form).then(() => {
        onClose()
        reload()
      })
    } else if (groupId != null) {
      void upsertGroupDaycareDailyNote(groupId, form).then(() => {
        onClose()
        reload()
      })
    }
  }

  const deleteNote = async (event: React.MouseEvent) => {
    event.preventDefault()
    if (note?.id) await deleteDaycareDailyNote(note.id)
    onClose()
    reload()
  }

  const toggleReminder = (reminder: DaycareDailyNoteReminder) => {
    const newReminders = form.reminders.some((r) => r == reminder)
      ? note?.reminders.filter((r) => r != reminder)
      : [...form.reminders, reminder]
    updateForm({ reminders: newReminders })
  }

  return groupId !== null ? (
    <FormModal
      data-qa={'daycare-daily-group-note-modal'}
      title={i18n.unit.groups.daycareDailyNote.groupNoteHeader}
      icon={faExclamation}
      iconColour={'blue'}
      resolve={{
        action: () => {
          submit()
          onClose()
        },
        label: i18n.common.confirm
      }}
      reject={{
        action: () => {
          onClose()
        },
        label: i18n.common.cancel
      }}
    >
      <FixedSpaceColumn>
        <FixedSpaceColumn alignItems={'center'} fullWidth={true}>
          <FixedSpaceRow
            fullWidth={true}
            justifyContent={'flex-end'}
            spacing={'s'}
          >
            <IconButton
              icon={faTrash}
              onClick={deleteNote}
              dataQa={'btn-delete-note'}
            />
            <span>{i18n.common.remove}</span>
          </FixedSpaceRow>
        </FixedSpaceColumn>
        <FixedSpaceColumn alignItems={'left'} fullWidth={true} spacing={'L'}>
          <FixedSpaceColumn>
            <div className="bold">
              {i18n.unit.groups.daycareDailyNote.groupNotesHeader}
            </div>
            <TextArea
              value={form.note || ''}
              placeholder={i18n.unit.groups.daycareDailyNote.notesHint}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateForm({ note: e.target.value })
              }
              data-qa="group-note-input"
            />
          </FixedSpaceColumn>
        </FixedSpaceColumn>
      </FixedSpaceColumn>
    </FormModal>
  ) : (
    <FormModal
      data-qa={'daycare-daily-note-modal'}
      title={i18n.unit.groups.daycareDailyNote.header}
      icon={faExclamation}
      iconColour={'blue'}
      resolve={{
        action: () => {
          submit()
          onClose()
        },
        label: i18n.common.confirm
      }}
      reject={{
        action: () => {
          onClose()
        },
        label: i18n.common.cancel
      }}
    >
      <FixedSpaceColumn>
        <FixedSpaceColumn alignItems={'center'} fullWidth={true}>
          <FixedSpaceRow>
            {formatName(childFirstName, childLastName, i18n)}
          </FixedSpaceRow>
          <FixedSpaceRow
            fullWidth={true}
            justifyContent={'flex-end'}
            spacing={'s'}
          >
            <IconButton icon={faTrash} onClick={deleteNote} />
            <span>{i18n.common.remove}</span>
          </FixedSpaceRow>
        </FixedSpaceColumn>
        <FixedSpaceColumn alignItems={'left'} fullWidth={true} spacing={'L'}>
          <FixedSpaceColumn>
            <div className="bold">
              {i18n.unit.groups.daycareDailyNote.notesHeader}
            </div>
            <TextArea
              value={form.note || ''}
              placeholder={i18n.unit.groups.daycareDailyNote.notesHint}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateForm({ note: e.target.value })
              }
              data-qa="note-input"
            />
          </FixedSpaceColumn>

          <FixedSpaceColumn>
            <div className="bold">
              {i18n.unit.groups.daycareDailyNote.feedingHeader}
            </div>
            <Radio
              checked={form.feedingNote == 'GOOD'}
              label={i18n.unit.groups.daycareDailyNote.level.GOOD}
              onChange={() => updateForm({ feedingNote: 'GOOD' })}
              dataQa={'feeding-level-good'}
            />
            <Radio
              checked={form.feedingNote == 'MEDIUM'}
              label={i18n.unit.groups.daycareDailyNote.level.MEDIUM}
              onChange={() => updateForm({ feedingNote: 'MEDIUM' })}
              dataQa={'feeding-level-medium'}
            />
            <Radio
              checked={form.feedingNote == 'NONE'}
              label={i18n.unit.groups.daycareDailyNote.level.NONE}
              onChange={() => updateForm({ feedingNote: 'NONE' })}
              dataQa={'feeding-level-none'}
            />
          </FixedSpaceColumn>

          <FixedSpaceColumn>
            <div className="bold">
              {i18n.unit.groups.daycareDailyNote.sleepingHeader}
            </div>
            <Radio
              checked={form.sleepingNote == 'GOOD'}
              label={i18n.unit.groups.daycareDailyNote.level.GOOD}
              onChange={() => updateForm({ sleepingNote: 'GOOD' })}
              dataQa={'sleeping-level-good'}
            />
            <Radio
              checked={form.sleepingNote == 'MEDIUM'}
              label={i18n.unit.groups.daycareDailyNote.level.MEDIUM}
              onChange={() => updateForm({ sleepingNote: 'MEDIUM' })}
              dataQa={'sleeping-level-medium'}
            />
            <Radio
              checked={form.sleepingNote == 'NONE'}
              label={i18n.unit.groups.daycareDailyNote.level.NONE}
              onChange={() => updateForm({ sleepingNote: 'NONE' })}
              dataQa={'sleeping-level-none'}
            />
          </FixedSpaceColumn>

          <FixedSpaceRow
            fullWidth={true}
            justifyContent={'flex-start'}
            spacing={'s'}
          >
            <InputField
              type={'number'}
              placeholder={i18n.unit.groups.daycareDailyNote.sleepingHint}
              value={form.sleepingHours || ''}
              onChange={(value) => updateForm({ sleepingHours: value })}
              data-qa="sleeping-hours-input"
            />
            <span>{i18n.unit.groups.daycareDailyNote.sleepingHours}</span>
          </FixedSpaceRow>

          <FixedSpaceColumn>
            <div className="bold">
              {i18n.unit.groups.daycareDailyNote.reminderHeader}
            </div>
            <Checkbox
              label={i18n.unit.groups.daycareDailyNote.reminderType.DIAPERS}
              checked={
                form.reminders.some((reminder) => reminder == 'DIAPERS') ||
                false
              }
              onChange={() => toggleReminder('DIAPERS')}
              dataQa="checkbox-diapers"
            />
            <Checkbox
              label={i18n.unit.groups.daycareDailyNote.reminderType.CLOTHES}
              checked={
                form.reminders.some((reminder) => reminder == 'CLOTHES') ||
                false
              }
              onChange={() => toggleReminder('CLOTHES')}
              dataQa="checkbox-clothes"
            />
            <Checkbox
              label={i18n.unit.groups.daycareDailyNote.reminderType.LAUNDRY}
              checked={
                form.reminders.some((reminder) => reminder == 'LAUNDRY') ||
                false
              }
              onChange={() => toggleReminder('LAUNDRY')}
              dataQa="checkbox-laundry"
            />
          </FixedSpaceColumn>

          <TextArea
            type={'text'}
            placeholder={
              i18n.unit.groups.daycareDailyNote.otherThingsToRememberHeader
            }
            value={form.reminderNote || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateForm({ reminderNote: e.target.value })
            }
            data-qa="reminder-note-input"
          />

          {groupNote && (
            <FixedSpaceColumn>
              <GrayFontContainer>
                <div className="bold">
                  {i18n.unit.groups.daycareDailyNote.groupNotesHeader}
                </div>
                <p data-qa={'group-note'}>{groupNote}</p>
              </GrayFontContainer>
            </FixedSpaceColumn>
          )}
        </FixedSpaceColumn>
      </FixedSpaceColumn>
    </FormModal>
  )
})
