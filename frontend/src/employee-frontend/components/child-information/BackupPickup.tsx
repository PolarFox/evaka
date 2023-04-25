// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect, useState } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type { ChildBackupPickup } from 'lib-common/generated/api-types/backuppickup'
import type { UUID } from 'lib-common/types'
import { useRestApi } from 'lib-common/utils/useRestApi'
import AddButton from 'lib-components/atoms/buttons/AddButton'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import InputField from 'lib-components/atoms/form/InputField'
import ErrorSegment from 'lib-components/atoms/state/ErrorSegment'
import { SpinnerSegment } from 'lib-components/atoms/state/Spinner'
import { Table, Tbody, Td, Th, Thead, Tr } from 'lib-components/layout/Table'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import FormModal from 'lib-components/molecules/modals/FormModal'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { H3, Label } from 'lib-components/typography'
import { faPen, faQuestion, faTrash } from 'lib-icons'

import {
  createBackupPickup,
  getChildBackupPickups,
  removeBackupPickup,
  updateBackupPickup
} from '../../api/child/backup-pickup'
import { ChildContext } from '../../state'
import { useTranslation } from '../../state/i18n'
import { UIContext } from '../../state/ui'
import { RequireRole } from '../../utils/roles'
import { FlexRow } from '../common/styled/containers'

interface BackupPickupProps {
  id: UUID
}

function BackupPickup({ id }: BackupPickupProps) {
  const { i18n } = useTranslation()
  const { uiMode, toggleUiMode, clearUiMode } = useContext(UIContext)
  const { permittedActions } = useContext(ChildContext)

  const [result, setResult] = useState<Result<ChildBackupPickup[]>>(
    Loading.of()
  )
  const [backupPickup, setBackupPickup] = useState<
    ChildBackupPickup | undefined
  >(undefined)

  const loadBackupPickups = useRestApi(getChildBackupPickups, setResult)
  useEffect(() => {
    void loadBackupPickups(id)
  }, [id, loadBackupPickups])

  const openEditBackupPickupModal = (pickup: ChildBackupPickup) => {
    setBackupPickup(pickup)
    toggleUiMode(`edit-backup-pickup`)
  }

  const openRemoveBackupPickupModal = (pickup: ChildBackupPickup) => {
    setBackupPickup(pickup)
    toggleUiMode(`remove-backup-pickup`)
  }

  const confirmRemoveModal = async () => {
    if (result.isSuccess && backupPickup) {
      await removeBackupPickup(backupPickup.id)
      setBackupPickup(undefined)
      void loadBackupPickups(id)
      clearUiMode()
    }
  }

  const CreateBackupPickupModal = () => {
    const [name, setName] = useState<string>('')
    const [phone, setPhone] = useState<string>('')

    async function saveBackupPickup() {
      if (name !== '' && phone !== '') {
        await createBackupPickup(id, { name, phone })
        void loadBackupPickups(id)
        setBackupPickup(undefined)
        clearUiMode()
      }
    }

    return (
      <FormModal
        title={i18n.childInformation.backupPickups.add}
        resolveAction={saveBackupPickup}
        resolveLabel={i18n.common.save}
        rejectAction={clearUiMode}
        rejectLabel={i18n.common.cancel}
      >
        <FixedSpaceColumn>
          <FixedSpaceColumn spacing="xxs">
            <Label>{i18n.childInformation.backupPickups.name}</Label>
            <InputField
              value={name}
              onChange={setName}
              placeholder={i18n.childInformation.backupPickups.name}
              width="full"
              data-qa="backup-pickup-name-input"
            />
          </FixedSpaceColumn>
          <FixedSpaceColumn spacing="xxs">
            <Label>{i18n.childInformation.backupPickups.phone}</Label>
            <InputField
              value={phone}
              onChange={setPhone}
              placeholder={i18n.childInformation.backupPickups.phone}
              width="full"
              data-qa="backup-pickup-phone-input"
            />
          </FixedSpaceColumn>
        </FixedSpaceColumn>
      </FormModal>
    )
  }

  const EditBackupPickupModal = () => {
    const [name, setName] = useState<string>(backupPickup?.name ?? '')
    const [phone, setPhone] = useState<string>(backupPickup?.phone ?? '')

    async function saveBackupPickup() {
      if (backupPickup) {
        await updateBackupPickup(backupPickup.id, {
          name: name !== '' ? name : backupPickup.name,
          phone: phone !== '' ? phone : backupPickup.phone
        })
        void loadBackupPickups(id)
        setBackupPickup(undefined)
        clearUiMode()
      }
    }

    return (
      <FormModal
        title={i18n.childInformation.backupPickups.edit}
        resolveAction={clearUiMode}
        resolveLabel={i18n.common.cancel}
        rejectAction={saveBackupPickup}
        rejectLabel={i18n.common.save}
      >
        <FixedSpaceColumn>
          <FixedSpaceColumn spacing="xxs">
            <Label>{i18n.childInformation.backupPickups.name}</Label>
            <InputField
              value={name}
              onChange={setName}
              placeholder={i18n.childInformation.backupPickups.name}
              width="full"
              data-qa="backup-pickup-name-input"
            />
          </FixedSpaceColumn>
          <FixedSpaceColumn spacing="xxs">
            <Label>{i18n.childInformation.backupPickups.phone}</Label>
            <InputField
              value={phone}
              onChange={setPhone}
              placeholder={i18n.childInformation.backupPickups.phone}
              width="full"
              data-qa="backup-pickup-phone-input"
            />
          </FixedSpaceColumn>
        </FixedSpaceColumn>
      </FormModal>
    )
  }

  const DeleteBackupPickupModal = () => (
    <InfoModal
      type="warning"
      title={i18n.childInformation.backupPickups.removeConfirmation}
      icon={faQuestion}
      reject={{ action: () => clearUiMode(), label: i18n.common.cancel }}
      resolve={{ action: confirmRemoveModal, label: i18n.common.remove }}
    />
  )

  return (
    <>
      {result.isLoading && <SpinnerSegment />}
      {result.isFailure && <ErrorSegment />}
      {result.isSuccess && (
        <>
          <FlexRow justifyContent="space-between">
            <H3 noMargin>{i18n.childInformation.backupPickups.title}</H3>
            {permittedActions.has('CREATE_BACKUP_PICKUP') && (
              <AddButton
                text={i18n.childInformation.backupPickups.add}
                onClick={() => toggleUiMode('create-backup-pickup')}
                data-qa="create-backup-pickup-btn"
              />
            )}
          </FlexRow>
          {result.value.length > 0 && (
            <Table>
              <Thead>
                <Tr>
                  <Th>{i18n.childInformation.backupPickups.name}</Th>
                  <Th>{i18n.childInformation.backupPickups.phone}</Th>
                  <RequireRole oneOf={['ADMIN', 'UNIT_SUPERVISOR', 'STAFF']}>
                    <Th />
                  </RequireRole>
                </Tr>
              </Thead>
              <Tbody>
                {result.value.map((row) => (
                  <Tr
                    key={row.id}
                    data-qa={`table-backup-pickup-row-${row.name}`}
                  >
                    <Td data-qa="backup-pickup-name">{row.name}</Td>
                    <Td>{row.phone}</Td>
                    <RequireRole oneOf={['ADMIN', 'UNIT_SUPERVISOR', 'STAFF']}>
                      <Td>
                        <FixedSpaceRowAlignRight>
                          <IconButton
                            icon={faPen}
                            onClick={() => openEditBackupPickupModal(row)}
                            data-qa="edit-backup-pickup"
                            aria-label={i18n.common.edit}
                          />
                          <IconButton
                            icon={faTrash}
                            onClick={() => openRemoveBackupPickupModal(row)}
                            data-qa="delete-backup-pickup"
                            aria-label={i18n.common.remove}
                          />
                        </FixedSpaceRowAlignRight>
                      </Td>
                    </RequireRole>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </>
      )}
      {uiMode === `create-backup-pickup` && <CreateBackupPickupModal />}
      {uiMode === `remove-backup-pickup` && <DeleteBackupPickupModal />}
      {uiMode === `edit-backup-pickup` && <EditBackupPickupModal />}
    </>
  )
}

const FixedSpaceRowAlignRight = styled(FixedSpaceRow)`
  justify-content: flex-end;
`

export default BackupPickup
