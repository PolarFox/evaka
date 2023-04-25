// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { ApplicationType } from 'lib-common/generated/api-types/application'
import type { PublicUnit } from 'lib-common/generated/api-types/daycare'
import type { Coordinate } from 'lib-common/generated/api-types/shared'
import { query } from 'lib-common/query'

import { createQueryKeys } from '../query'

import type { MapAddress } from './MapView'
import {
  fetchUnits,
  fetchDistance,
  autocompleteAddress,
  fetchUnitsWithDistances
} from './api'

const queryKeys = createQueryKeys('map', {
  units: (type: ApplicationType) => ['units', type],
  unitsWithDistances: (
    selectedAddress: MapAddress | null,
    filteredUnits: PublicUnit[]
  ) => [
    'unitsWithDistances',
    selectedAddress?.coordinates,
    filteredUnits.map((u) => u.id)
  ],
  addressOptions: (input: string) => ['addressOptions', input],
  distance: (start: Coordinate | null, end: Coordinate | null) => [
    'distance',
    start,
    end
  ]
})

export const unitsQuery = query({
  api: fetchUnits,
  queryKey: queryKeys.units
})

export const unitsWithDistancesQuery = query({
  api: async (
    selectedAddress: MapAddress | null,
    filteredUnits: PublicUnit[]
  ) =>
    selectedAddress && filteredUnits.length > 0
      ? fetchUnitsWithDistances(selectedAddress, filteredUnits)
      : [],
  queryKey: queryKeys.unitsWithDistances
})

export const addressOptionsQuery = query({
  api: async (input: string) =>
    input.length > 0 ? autocompleteAddress(input) : [],
  queryKey: queryKeys.addressOptions
})

export const distanceQuery = query({
  api: async (start: Coordinate | null, end: Coordinate | null) =>
    start && end ? fetchDistance(start, end) : null,
  queryKey: queryKeys.distance
})
