// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import type { EmployeeModule } from 'lib-customizations/types'

import Logo from './assets/EspooLogoPrimary.svg'

export {
  daycareAssistanceLevels,
  otherAssistanceMeasureTypes,
  preschoolAssistanceLevels
} from 'lib-common/generated/api-types/assistance'

export { employeeConfig as appConfig } from './appConfigs'
export { featureFlags } from './featureFlags'

export const translations: EmployeeModule['translations'] = {
  fi: {
    childInformation: {
      pedagogicalDocument: {
        explanation:
          'Pedagogisen dokumentoinnin ominaisuutta käytetään toiminnasta kertovien kuvien ja digitaalisten dokumenttien jakamiseen.',
        explanationInfo:
          'Pedagogisen dokumentoinnin prosessi tapahtuu pääsääntöisesti ennen dokumentin jakamista huoltajille. Tarkastele dokumentteja yhdessä lasten ja kasvattajatiimin kanssa. Nosta yhteisistä havainnoista kehittämiskohteita käytännön pedagogiselle työlle, sen tavoitteille ja sisällöille, jotta pedagoginen toiminta vastaa mahdollisimman hyvin yksittäisen lapsen ja lapsiryhmän tarpeita, vahvuuksia ja mielenkiinnon kohteita. Erityistä huomiota kiinnitetään aikuisen toimintaan. Pedagoginen dokumentointi luo pohjan lapsilähtöisen pedagogiikan toteuttamiselle.',
        documentInfo: 'Liitetiedoston tallennusmuoto voi olla JPG, PDF, MP3/4',
        descriptionInfo:
          'Kuvaillaan huoltajalle, mikä tilanteessa oli lapselle merkityksellistä oppimisen ja kehityksen näkökulmasta. Voit myös linkittää toiminnan vasun sisältöihin'
      }
    }
  },
  sv: {}
}
export const vasuTranslations: EmployeeModule['vasuTranslations'] = {
  FI: {},
  SV: {}
}
export const cityLogo: EmployeeModule['cityLogo'] = (
  <img src={Logo} alt="Espoo Logo" data-qa="footer-city-logo" />
)
export const placementTypes: EmployeeModule['placementTypes'] = [
  'PRESCHOOL',
  'PRESCHOOL_DAYCARE',
  'DAYCARE',
  'DAYCARE_PART_TIME',
  'PREPARATORY',
  'PREPARATORY_DAYCARE',
  'CLUB',
  'TEMPORARY_DAYCARE',
  'TEMPORARY_DAYCARE_PART_DAY'
]
export const absenceTypes: EmployeeModule['absenceTypes'] = [
  'OTHER_ABSENCE',
  'SICKLEAVE',
  'UNKNOWN_ABSENCE',
  'PLANNED_ABSENCE',
  'PARENTLEAVE',
  'FORCE_MAJEURE'
]
export const assistanceMeasures: EmployeeModule['assistanceMeasures'] = [
  'SPECIAL_ASSISTANCE_DECISION',
  'INTENSIFIED_ASSISTANCE',
  'EXTENDED_COMPULSORY_EDUCATION',
  'CHILD_SERVICE',
  'CHILD_ACCULTURATION_SUPPORT',
  'TRANSPORT_BENEFIT'
]
export const placementPlanRejectReasons: EmployeeModule['placementPlanRejectReasons'] =
  ['REASON_1', 'REASON_2', 'OTHER']
export const unitProviderTypes: EmployeeModule['unitProviderTypes'] = [
  'MUNICIPAL',
  'PURCHASED',
  'PRIVATE',
  'MUNICIPAL_SCHOOL',
  'PRIVATE_SERVICE_VOUCHER',
  'EXTERNAL_PURCHASED'
]
export const voucherValueDecisionTypes: EmployeeModule['voucherValueDecisionTypes'] =
  ['NORMAL', 'RELIEF_ACCEPTED', 'RELIEF_PARTLY_ACCEPTED', 'RELIEF_REJECTED']
