// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import type { PedagogicalDocumentCitizen } from 'lib-common/generated/api-types/pedagogicaldocument'
import type { JsonOf } from 'lib-common/json'
import type { UUID } from 'lib-common/types'

import { client } from '../api-client'

export async function getPedagogicalDocuments(): Promise<
  Result<PedagogicalDocumentCitizen[]>
> {
  try {
    const data = await client
      .get<JsonOf<PedagogicalDocumentCitizen[]>>(
        '/citizen/pedagogical-documents/'
      )
      .then((res) => res.data.map(deserializePedagogicalDocument))
    return Success.of(data)
  } catch (e) {
    return Failure.fromError(e)
  }
}

export function deserializePedagogicalDocument(
  data: JsonOf<PedagogicalDocumentCitizen>
): PedagogicalDocumentCitizen {
  const created = new Date(data.created)
  return { ...data, created }
}

export async function markPedagogicalDocumentRead(
  documentId: UUID
): Promise<Result<void>> {
  try {
    await client.post(`/citizen/pedagogical-documents/${documentId}/mark-read`)
    return Success.of()
  } catch (e) {
    return Failure.fromError(e)
  }
}

export async function getUnreadPedagogicalDocumentsCount(): Promise<
  Result<number>
> {
  try {
    const count = await client
      .get<number>(`/citizen/pedagogical-documents/unread-count`)
      .then((res) => res.data)
    return Success.of(count)
  } catch (e) {
    return Failure.fromError(e)
  }
}

export async function getUnreadVasuDocumentsCount(): Promise<Result<number>> {
  try {
    const count = await client
      .get<number>(`/citizen/vasu/children/unread-count`)
      .then((res) => res.data)
    return Success.of(count)
  } catch (e) {
    return Failure.fromError(e)
  }
}
