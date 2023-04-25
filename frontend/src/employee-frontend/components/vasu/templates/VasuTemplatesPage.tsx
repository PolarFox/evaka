// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { Result } from 'lib-common/api'
import { Loading } from 'lib-common/api'
import type { VasuTemplateSummary } from 'lib-common/generated/api-types/vasu'
import { useRestApi } from 'lib-common/utils/useRestApi'
import { AddButtonRow } from 'lib-components/atoms/buttons/AddButton'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import ErrorSegment from 'lib-components/atoms/state/ErrorSegment'
import { SpinnerSegment } from 'lib-components/atoms/state/Spinner'
import Container, { ContentArea } from 'lib-components/layout/Container'
import { Table, Tbody, Td, Th, Thead, Tr } from 'lib-components/layout/Table'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { H1 } from 'lib-components/typography'
import { faPen, faTrash } from 'lib-icons'

import { useTranslation } from '../../../state/i18n'

import CopyTemplateModal from './CopyTemplateModal'
import CreateTemplateModal from './CreateOrEditTemplateModal'
import { deleteVasuTemplate, getVasuTemplateSummaries } from './api'

export default React.memo(function VasuTemplatesPage() {
  const { i18n } = useTranslation()
  const t = i18n.vasuTemplates
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<Result<VasuTemplateSummary[]>>(
    Loading.of()
  )

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [templateToCopy, setTemplateToCopy] = useState<VasuTemplateSummary>()
  const [templateToEdit, setTemplateToEdit] = useState<VasuTemplateSummary>()

  const loadTemplates = useRestApi(getVasuTemplateSummaries, setTemplates)
  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  return (
    <Container>
      <ContentArea opaque>
        <H1>{t.title}</H1>

        {templates.isLoading && <SpinnerSegment />}
        {templates.isFailure && <ErrorSegment />}
        {templates.isSuccess && (
          <>
            <AddButtonRow
              onClick={() => setCreateModalOpen(true)}
              text={t.addNewTemplate}
              data-qa="add-button"
            />
            <Table data-qa="template-table">
              <Thead>
                <Tr>
                  <Th>{t.name}</Th>
                  <Th>{t.valid}</Th>
                  <Th>{t.type}</Th>
                  <Th>{t.language}</Th>
                  <Th>{t.documentCount}</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {templates.value.map((template) => (
                  <Tr data-qa="template-row" key={template.id}>
                    <Td data-qa="template-name">
                      <Link to={`/vasu-templates/${template.id}`}>
                        {template.name}
                      </Link>
                    </Td>
                    <Td>{template.valid.format()}</Td>
                    <Td>{t.types[template.type]}</Td>
                    <Td>{t.languages[template.language]}</Td>
                    <Td>{template.documentCount}</Td>
                    <Td>
                      <FixedSpaceRow spacing="s">
                        <IconButton
                          icon={faPen}
                          onClick={() => setTemplateToEdit(template)}
                          aria-label={i18n.common.edit}
                        />
                        <IconButton
                          icon={faTrash}
                          disabled={template.documentCount > 0}
                          onClick={() => {
                            void deleteVasuTemplate(template.id).then(() =>
                              loadTemplates()
                            )
                          }}
                          aria-label={i18n.common.remove}
                        />
                      </FixedSpaceRow>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        )}

        {(createModalOpen || templateToEdit) && (
          <CreateTemplateModal
            onSuccess={(id) => {
              if (createModalOpen) {
                navigate(`/vasu-templates/${id}`)
              } else {
                void loadTemplates()
                setTemplateToEdit(undefined)
              }
            }}
            onCancel={() => {
              setCreateModalOpen(false)
              setTemplateToEdit(undefined)
            }}
            template={templateToEdit}
          />
        )}

        {templateToCopy && (
          <CopyTemplateModal
            template={templateToCopy}
            onSuccess={(id) => navigate(`/vasu-templates/${id}`)}
            onCancel={() => setTemplateToCopy(undefined)}
          />
        )}
      </ContentArea>
    </Container>
  )
})
