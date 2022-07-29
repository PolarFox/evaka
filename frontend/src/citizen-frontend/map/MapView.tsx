// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import sortBy from 'lodash/sortBy'
import type { ReactNode } from 'react'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { Success } from 'lib-common/api'
import type { ApplicationType } from 'lib-common/generated/api-types/application'
import type {
  Language,
  ProviderType,
  PublicUnit
} from 'lib-common/generated/api-types/daycare'
import type { Coordinate } from 'lib-common/generated/api-types/shared'
import { useApiState } from 'lib-common/utils/useRestApi'
import AdaptiveFlex from 'lib-components/layout/AdaptiveFlex'
import { defaultMargins, Gap } from 'lib-components/white-space'

import { useUser } from '../auth/state'
import { headerHeightDesktop } from '../header/const'
import { useTranslation } from '../localization'
import useTitle from '../useTitle'

import MapBox from './MapBox'
import MobileTabs from './MobileTabs'
import SearchSection from './SearchSection'
import UnitDetailsPanel from './UnitDetailsPanel'
import UnitList from './UnitList'
import { fetchUnits, queryDistances } from './api'
import type { MobileMode } from './const'
import { mapViewBreakpoint } from './const'
import type { UnitWithStraightDistance } from './distances'
import { calcStraightDistance } from './distances'

export type MapAddress = {
  coordinates: Coordinate
  streetAddress: string
  postalCode: string
  postOffice: string
  unit?: {
    id: string
    name: string
  }
}

export type CareTypeOption = ApplicationType

export type ProviderTypeOption = Exclude<ProviderType, 'MUNICIPAL_SCHOOL'>

interface MapContainerProps {
  loggedIn: boolean
  children: ReactNode
}

const MapFullscreenContainer = React.memo(function MapFullscreenContainer({
  loggedIn,
  children
}: MapContainerProps) {
  return (
    <FullScreen data-qa="map-view" loggedIn={loggedIn}>
      {children}
    </FullScreen>
  )
})

async function fetchUnitsWithDistances(
  selectedAddress: MapAddress | null,
  filteredUnits: Result<PublicUnit[]>
) {
  if (selectedAddress && filteredUnits.isSuccess) {
    const units = filteredUnits.value

    const unitsWithStraightDistance = units.map<UnitWithStraightDistance>(
      (unit) => ({
        ...unit,
        straightDistance: unit.location
          ? calcStraightDistance(unit.location, selectedAddress.coordinates)
          : null
      })
    )
    return await queryDistances(
      selectedAddress.coordinates,
      unitsWithStraightDistance
    )
  } else {
    return Success.of([])
  }
}

export interface Props {
  scrollToTop: () => void
}

export default React.memo(function MapView({ scrollToTop }: Props) {
  const navigate = useNavigate()
  const t = useTranslation()
  const [mobileMode, setMobileMode] = useState<MobileMode>('map')
  const user = useUser()

  const [selectedUnit, setSelectedUnit] = useState<PublicUnit | null>(null)

  const [selectedAddress, setSelectedAddress] = useState<MapAddress | null>(
    null
  )
  const [careType, setCareType] = useState<CareTypeOption>('DAYCARE')
  const [languages, setLanguages] = useState<Language[]>([])
  const [providerTypes, setProviderTypes] = useState<ProviderTypeOption[]>([])
  const [shiftCare, setShiftCare] = useState<boolean>(false)

  // Scroll the main content area to top on first mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => scrollToTop(), [])

  const [allUnits] = useApiState(() => fetchUnits(careType), [careType])

  const filteredUnits = useMemo<Result<PublicUnit[]>>(
    () => filterUnits(allUnits, careType, languages, providerTypes, shiftCare),
    [allUnits, careType, languages, providerTypes, shiftCare]
  )

  const [unitsWithDistances] = useApiState(
    () => fetchUnitsWithDistances(selectedAddress, filteredUnits),
    [selectedAddress, filteredUnits]
  )

  useTitle(t, t.map.title)

  const units = useMemo(
    () =>
      selectedAddress
        ? unitsWithDistances.getOrElse([])
        : filteredUnits.getOrElse([]),
    [filteredUnits, selectedAddress, unitsWithDistances]
  )

  const navigateBack = useMemo(
    () => (user ? undefined : () => navigate('/login')),
    [navigate, user]
  )

  return (
    <MapFullscreenContainer loggedIn={!!user}>
      <FlexContainer
        className={`mobile-mode-${mobileMode}`}
        breakpoint={mapViewBreakpoint}
        horizontalSpacing="zero"
        verticalSpacing="zero"
      >
        {selectedUnit ? (
          <UnitDetailsPanel
            unit={selectedUnit}
            onClose={() => setSelectedUnit(null)}
            selectedAddress={selectedAddress}
          />
        ) : (
          <PanelWrapper>
            <SearchSection
              allUnits={allUnits}
              careType={careType}
              setCareType={setCareType}
              languages={languages}
              setLanguages={setLanguages}
              providerTypes={providerTypes}
              setProviderTypes={setProviderTypes}
              shiftCare={shiftCare}
              setShiftCare={setShiftCare}
              selectedAddress={selectedAddress}
              setSelectedAddress={setSelectedAddress}
              setSelectedUnit={setSelectedUnit}
              navigateBack={navigateBack}
            />
            <Gap size="xs" />

            <MobileTabs mobileMode={mobileMode} setMobileMode={setMobileMode} />

            <UnitList
              selectedAddress={selectedAddress}
              filteredUnits={filteredUnits}
              unitsWithDistances={unitsWithDistances}
              setSelectedUnit={setSelectedUnit}
            />
          </PanelWrapper>
        )}
        <MapContainer>
          <MapBox
            units={units}
            selectedUnit={selectedUnit}
            selectedAddress={selectedAddress}
            setSelectedUnit={setSelectedUnit}
          />
        </MapContainer>
      </FlexContainer>
    </MapFullscreenContainer>
  )
})

const filterUnits = (
  unitsResult: Result<PublicUnit[]>,
  careType: CareTypeOption,
  languages: Language[],
  providerTypes: ProviderTypeOption[],
  shiftCare: boolean
): Result<PublicUnit[]> =>
  unitsResult.map((value) => {
    const filteredUnits = value
      .filter((u) =>
        careType === 'DAYCARE'
          ? u.type.includes('CENTRE') ||
            u.type.includes('FAMILY') ||
            u.type.includes('GROUP_FAMILY')
          : careType === 'CLUB'
          ? u.type.includes('CLUB')
          : careType === 'PRESCHOOL'
          ? u.type.includes('PRESCHOOL') ||
            u.type.includes('PREPARATORY_EDUCATION')
          : false
      )
      .filter(
        (u) =>
          languages.length == 0 ||
          (!(u.language === 'fi' && !languages.includes('fi')) &&
            !(u.language === 'sv' && !languages.includes('sv')))
      )
      .filter(
        (u) =>
          providerTypes.length == 0 ||
          (!(
            (u.providerType === 'MUNICIPAL' ||
              u.providerType === 'MUNICIPAL_SCHOOL') &&
            !providerTypes.includes('MUNICIPAL')
          ) &&
            !(
              u.providerType === 'PURCHASED' &&
              !providerTypes.includes('PURCHASED')
            ) &&
            !(
              u.providerType === 'PRIVATE' && !providerTypes.includes('PRIVATE')
            ) &&
            !(
              u.providerType === 'PRIVATE_SERVICE_VOUCHER' &&
              !providerTypes.includes('PRIVATE_SERVICE_VOUCHER')
            ))
      )
      .filter((u) => !shiftCare || u.roundTheClock)

    return sortBy(filteredUnits, (u) => u.name)
  })

const PanelWrapper = styled.div`
  width: 400px;
  min-width: 300px;
  flex-grow: 1;
  flex-shrink: 1;

  display: flex;
  flex-direction: column;

  overflow-y: auto;
  @media (max-width: ${mapViewBreakpoint}) {
    width: 100%;
    overflow-y: unset;
  }
`

const FullScreen = styled.div<{ loggedIn: boolean }>`
  position: absolute;
  top: calc(
    ${headerHeightDesktop}px + ${({ loggedIn }) => (loggedIn ? '76px' : '0px')}
  );
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: stretch;

  @media (max-width: ${mapViewBreakpoint}) {
    position: static;
  }
`

const FlexContainer = styled(AdaptiveFlex)`
  align-items: stretch;
  width: 100%;

  @media (max-width: ${mapViewBreakpoint}) {
    margin-top: ${defaultMargins.s};
    margin-bottom: 0;
    &.mobile-mode-map {
      .unit-list {
        display: none;
      }
    }

    &.mobile-mode-list {
      .map-box {
        display: none;
      }
    }
  }
`

const MapContainer = styled.div`
  min-width: 300px;
  flex-grow: 99;
`
