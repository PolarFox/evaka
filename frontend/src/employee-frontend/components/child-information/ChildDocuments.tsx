// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { faFile, faQuestion, faTrash } from 'Icons'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { combine } from 'lib-common/api'
import { oneOf, required } from 'lib-common/form/form'
import { useForm } from 'lib-common/form/hooks'
import {
  ChildDocumentSummary,
  DocumentTemplateSummary
} from 'lib-common/generated/api-types/document'
import { useMutationResult, useQueryResult } from 'lib-common/query'
import { UUID } from 'lib-common/types'
import Title from 'lib-components/atoms/Title'
import { AddButtonRow } from 'lib-components/atoms/buttons/AddButton'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import { SelectF } from 'lib-components/atoms/dropdowns/Select'
import { ChildDocumentStateChip } from 'lib-components/document-templates/ChildDocumentStateChip'
import { Table, Thead, Th, Tbody, Tr, Td } from 'lib-components/layout/Table'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import { AsyncFormModal } from 'lib-components/molecules/modals/FormModal'
import InfoModal from 'lib-components/molecules/modals/InfoModal'
import { Label } from 'lib-components/typography'
import { featureFlags } from 'lib-customizations/employee'

import { useTranslation } from '../../state/i18n'
import { renderResult } from '../async-rendering'
import { activeDocumentTemplateSummariesQuery } from '../document-templates/queries'

import {
  childDocumentsQuery,
  createChildDocumentMutation,
  deleteChildDocumentMutation
} from './queries'

const ChildDocuments = React.memo(function ChildDocuments({
  childId,
  documents
}: {
  childId: UUID
  documents: ChildDocumentSummary[]
}) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  const { mutateAsync: deleteChildDocument } = useMutationResult(
    deleteChildDocumentMutation
  )

  const [confirmingDelete, setConfirmingDelete] =
    useState<ChildDocumentSummary | null>(null)

  return (
    <div>
      {confirmingDelete && (
        <InfoModal
          type="warning"
          title={i18n.childInformation.childDocuments.removeConfirmation}
          text={confirmingDelete.templateName}
          icon={faQuestion}
          reject={{
            action: () => setConfirmingDelete(null),
            label: i18n.common.cancel
          }}
          resolve={{
            action: async () => {
              const res = await deleteChildDocument({
                childId,
                documentId: confirmingDelete.id
              })
              if (res.isSuccess) {
                setConfirmingDelete(null)
              }
            },
            label: i18n.common.remove
          }}
        />
      )}
      <Table data-qa="table-of-child-documents">
        <Thead>
          <Tr>
            <Th>{i18n.childInformation.childDocuments.table.document}</Th>
            <Th>{i18n.childInformation.childDocuments.table.published}</Th>
            <Th>{i18n.childInformation.childDocuments.table.document}</Th>
            <Th>{i18n.childInformation.childDocuments.table.status}</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {documents.map((document) => (
            <Tr key={document.id} data-qa="child-document-row">
              <Td>
                <IconButton
                  icon={faFile}
                  aria-label={i18n.childInformation.childDocuments.table.open}
                  onClick={() => navigate(`/child-documents/${document.id}`)}
                  data-qa="open-document"
                />
              </Td>
              <Td>{document.publishedAt?.format() ?? '-'}</Td>
              <Td>{document.templateName}</Td>
              <Td data-qa="document-status">
                <ChildDocumentStateChip status={document.status} />
              </Td>
              <Td>
                {!document.publishedAt && (
                  <IconButton
                    icon={faTrash}
                    aria-label={i18n.common.remove}
                    onClick={() => setConfirmingDelete(document)}
                  />
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  )
})

const CreationModal = React.memo(function CreationModal({
  childId,
  templates,
  onClose
}: {
  childId: UUID
  templates: DocumentTemplateSummary[]
  onClose: () => void
}) {
  const { i18n } = useTranslation()
  const { mutateAsync: createChildDocument } = useMutationResult(
    createChildDocumentMutation
  )
  const navigate = useNavigate()

  const form = required(oneOf<UUID>())
  const bind = useForm(
    form,
    () => ({
      domValue: templates[0]?.id,
      options: templates.map((t) => ({
        domValue: t.id,
        value: t.id,
        label: t.name
      }))
    }),
    i18n.validationErrors
  )

  const submit = async () => {
    const res = await createChildDocument({
      childId,
      templateId: bind.value()
    })
    if (res.isSuccess) {
      navigate(`/child-documents/${res.value}`)
    }
    return res
  }

  return (
    <AsyncFormModal
      title={i18n.childInformation.childDocuments.addNew}
      resolveAction={submit}
      onSuccess={onClose}
      resolveLabel={i18n.common.confirm}
      rejectAction={onClose}
      rejectLabel={i18n.common.cancel}
      resolveDisabled={!bind.isValid()}
    >
      <FixedSpaceColumn>
        <Label>{i18n.childInformation.childDocuments.select}</Label>
        <SelectF bind={bind} />
      </FixedSpaceColumn>
    </AsyncFormModal>
  )
})

const ChildDocumentsList = React.memo(function ChildDocumentsList({
  childId
}: {
  childId: UUID
}) {
  const { i18n } = useTranslation()
  const documentsResult = useQueryResult(childDocumentsQuery(childId))
  const documentTemplatesResult = useQueryResult(
    activeDocumentTemplateSummariesQuery(childId)
  )
  const [creationModalOpen, setCreationModalOpen] = useState(false)

  return renderResult(
    combine(documentsResult, documentTemplatesResult),
    ([documents, templates]) => {
      const validTemplates = templates
        .filter(
          (template) =>
            !documents.some(
              (doc) => doc.type === template.type && doc.status !== 'COMPLETED'
            )
        )
        .filter(
          (template) =>
            featureFlags.experimental?.hojks || template.type !== 'HOJKS'
        )

      return (
        <FixedSpaceColumn>
          <AddButtonRow
            text={i18n.childInformation.childDocuments.addNew}
            onClick={() => setCreationModalOpen(true)}
            disabled={validTemplates.length < 1}
            data-qa="create-document"
          />

          {creationModalOpen && (
            <CreationModal
              childId={childId}
              templates={validTemplates}
              onClose={() => setCreationModalOpen(false)}
            />
          )}

          <ChildDocuments childId={childId} documents={documents} />
        </FixedSpaceColumn>
      )
    }
  )
})

export default React.memo(function ChildDocumentsWrapper({
  childId
}: {
  childId: UUID
}) {
  const { i18n } = useTranslation()

  return (
    <div>
      <Title size={4}>{i18n.childInformation.childDocuments.title}</Title>
      <ChildDocumentsList childId={childId} />
    </div>
  )
})
