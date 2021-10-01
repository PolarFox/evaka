// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { faHome } from 'lib-icons'
import { Table, Tbody, Td, Th, Thead, Tr } from 'lib-components/layout/Table'
import Loader from 'lib-components/atoms/Loader'
import CollapsibleSection from 'lib-components/molecules/CollapsibleSection'
import LabelValueList from '../../components/common/LabelValueList'
import { Translations, useTranslation } from '../../state/i18n'
import { PersonContext } from '../../state/person'
import {
  FamilyOverview,
  FamilyOverviewPerson,
  FamilyOverviewRow,
  FamilyOverviewPersonRole
} from '../../types/family-overview'
import { UUID } from '../../types'
import { formatCents } from 'lib-common/money'
import { getAge } from 'lib-common/utils/local-date'
import { formatName } from '../../utils'

interface Props {
  id: UUID
  open: boolean
}

const LabelValueListContainer = styled.div`
  margin: 1rem 0;
`

function mapPersonToRow(
  {
    personId,
    firstName,
    lastName,
    income,
    dateOfBirth,
    restrictedDetailsEnabled,
    streetAddress,
    postalCode,
    postOffice
  }: FamilyOverviewPerson,
  role: FamilyOverviewPersonRole,
  i18n: Translations
): FamilyOverviewRow {
  const age = getAge(dateOfBirth)
  return {
    personId,
    name: formatName(firstName, lastName, i18n),
    role,
    age,
    restrictedDetailsEnabled,
    address: `${streetAddress} ${postalCode} ${postOffice}`,
    income
  }
}

function getMembers(
  family: FamilyOverview,
  i18n: Translations
): FamilyOverviewRow[] {
  const { headOfFamily, partner, children } = family
  return [
    mapPersonToRow(headOfFamily, 'HEAD', i18n),
    partner && mapPersonToRow(partner, 'PARTNER', i18n),
    ...children.map((item) => mapPersonToRow(item, 'CHILD', i18n))
  ].filter(Boolean) as FamilyOverviewRow[]
}

function getAdults(family: FamilyOverview): FamilyOverviewPerson[] {
  const { headOfFamily, partner } = family
  return partner ? [headOfFamily, partner] : [headOfFamily]
}

const FamilyOverview = React.memo(function FamilyOverview({ id, open }: Props) {
  const { i18n } = useTranslation()
  const { family, setFamily, reloadFamily } = useContext(PersonContext)

  function getIncomeString(
    incomeTotal: number | undefined,
    incomeEffect: string | undefined
  ): string {
    if (incomeEffect === 'INCOME') {
      const formattedTotal = formatCents(incomeTotal)
      return formattedTotal
        ? i18n.personProfile.familyOverview.incomeValue(formattedTotal)
        : ''
    }

    if (incomeEffect !== undefined) {
      return String(
        i18n.personProfile.income.details.effectOptions[incomeEffect]
      )
    }

    return i18n.personProfile.familyOverview.incomeMissingCompletely
  }

  useEffect(() => {
    void reloadFamily(id)
  }, [id, setFamily]) // eslint-disable-line react-hooks/exhaustive-deps

  const familyIncomeTotal = family
    .map(({ totalIncome }) => formatCents(totalIncome?.total))
    .getOrElse(undefined)

  return (
    <div>
      {family.isSuccess && (
        <CollapsibleSection
          icon={faHome}
          title={i18n.personProfile.familyOverview.title}
          data-qa="family-overview-collapsible"
          startCollapsed={!open}
        >
          <LabelValueListContainer>
            <LabelValueList
              spacing="small"
              contents={[
                {
                  label: i18n.personProfile.familyOverview.familySizeLabel,
                  value: i18n.personProfile.familyOverview.familySizeValue(
                    getAdults(family.value).length,
                    family.value.children.length
                  )
                },
                ...(familyIncomeTotal !== undefined
                  ? [
                      {
                        label:
                          i18n.personProfile.familyOverview.incomeTotalLabel,
                        value:
                          i18n.personProfile.familyOverview.incomeValue(
                            familyIncomeTotal
                          )
                      }
                    ]
                  : [])
              ]}
            />
          </LabelValueListContainer>
          <div>
            <Table>
              <Thead>
                <Tr>
                  <Th>{i18n.personProfile.familyOverview.colName}</Th>
                  <Th>{i18n.personProfile.familyOverview.colRole}</Th>
                  <Th>{i18n.personProfile.familyOverview.colAge}</Th>
                  {family.value.totalIncome ? (
                    <Th>{i18n.personProfile.familyOverview.colIncome}</Th>
                  ) : null}
                  <Th>{i18n.personProfile.familyOverview.colAddress}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {getMembers(family.value, i18n)?.map(
                  ({
                    personId,
                    name,
                    role,
                    age,
                    restrictedDetailsEnabled,
                    address,
                    income
                  }) => (
                    <Tr
                      key={personId}
                      data-qa={`table-family-overview-row-${personId}`}
                    >
                      <Td>
                        {role === 'CHILD' ? (
                          <Link to={`/child-information/${personId}`}>
                            {name}
                          </Link>
                        ) : (
                          <Link to={`/profile/${personId}`}>{name}</Link>
                        )}
                      </Td>
                      <Td>{i18n.personProfile.familyOverview.role[role]}</Td>
                      <Td data-qa="person-age">{age}</Td>
                      {family.value.totalIncome ? (
                        <Td data-qa="person-income-total">
                          {role !== 'CHILD' &&
                            getIncomeString(income?.total, income?.effect)}
                        </Td>
                      ) : null}
                      <Td>
                        {restrictedDetailsEnabled
                          ? i18n.personProfile.restrictedDetails
                          : address}
                      </Td>
                    </Tr>
                  )
                )}
              </Tbody>
            </Table>
          </div>
        </CollapsibleSection>
      )}
      {family.isLoading && <Loader />}
      {family.isFailure && <div>{i18n.common.loadingFailed}</div>}
    </div>
  )
})

export default FamilyOverview
