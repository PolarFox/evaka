// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import FiniteDateRange from 'lib-common/finite-date-range'
import type {
  PlacementResponse,
  PlacementType
} from 'lib-common/generated/api-types/placement'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { client } from '../client'

export interface PlacementCreate {
  childId: UUID
  type: PlacementType
  unitId: UUID
  startDate: LocalDate
  endDate: LocalDate
}

export interface PlacementUpdate {
  startDate: LocalDate
  endDate: LocalDate
}

export async function createPlacement(
  body: PlacementCreate
): Promise<Result<null>> {
  return client
    .post(`/placements`, {
      ...body,
      startDate: body.startDate,
      endDate: body.endDate
    })
    .then(() => Success.of(null))
    .catch((e) => Failure.fromError(e))
}

export async function getPlacements(
  childId: UUID
): Promise<Result<PlacementResponse>> {
  const config = {
    params: {
      childId
    }
  }
  return client
    .get<JsonOf<PlacementResponse>>('/placements', config)
    .then((res) => res.data)
    .then((data) => {
      return {
        ...data,
        placements: data.placements.map((p) => ({
          ...p,
          child: {
            ...p.child,
            dateOfBirth: LocalDate.parseIso(p.child.dateOfBirth)
          },
          startDate: LocalDate.parseIso(p.startDate),
          endDate: LocalDate.parseIso(p.endDate),
          terminationRequestedDate: p.terminationRequestedDate
            ? LocalDate.parseIso(p.terminationRequestedDate)
            : null,
          groupPlacements: p.groupPlacements.map((gp) => ({
            ...gp,
            startDate: LocalDate.parseIso(gp.startDate),
            endDate: LocalDate.parseIso(gp.endDate)
          })),
          updated: p.updated ? HelsinkiDateTime.parseIso(p.updated) : null,
          serviceNeeds: p.serviceNeeds.map((sn) => ({
            ...sn,
            startDate: LocalDate.parseIso(sn.startDate),
            endDate: LocalDate.parseIso(sn.endDate),
            option: {
              ...sn.option,
              updated: HelsinkiDateTime.parseIso(sn.option.updated)
            },
            updated: HelsinkiDateTime.parseIso(sn.updated),
            confirmed:
              sn.confirmed != null
                ? {
                    ...sn.confirmed,
                    at:
                      sn.confirmed.at != null
                        ? HelsinkiDateTime.parseIso(sn.confirmed.at)
                        : null
                  }
                : null
          }))
        }))
      }
    })
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

export async function updatePlacement(
  placementId: UUID,
  body: PlacementUpdate
): Promise<Result<void>> {
  return client
    .put(`/placements/${placementId}`, {
      ...body,
      startDate: body.startDate,
      endDate: body.endDate
    })
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function deletePlacement(
  placementId: UUID
): Promise<Result<null>> {
  return client
    .delete(`/placements/${placementId}`)
    .then(() => Success.of(null))
    .catch((e) => Failure.fromError(e))
}

export async function getChildPlacementPeriods(
  adultId: UUID
): Promise<Result<FiniteDateRange[]>> {
  return client
    .get<JsonOf<FiniteDateRange[]>>(
      `/placements/child-placement-periods/${adultId}`
    )
    .then(({ data }) =>
      data.map(
        ({ start, end }) =>
          new FiniteDateRange(
            LocalDate.parseIso(start),
            LocalDate.parseIso(end)
          )
      )
    )
    .then((periods) => Success.of(periods))
    .catch((e) => Failure.fromError(e))
}
