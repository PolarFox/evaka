import { ContactInfoFormData } from '~applications/editor/ApplicationFormData'
import React from 'react'
import { useTranslation } from '~localization'
import { H2, H3, Label } from '@evaka/lib-components/src/typography'
import ListGrid from '@evaka/lib-components/src/layout/ListGrid'
import { Gap } from '@evaka/lib-components/src/white-space'
import { ApplicationDataGridLabelWidth } from '~applications/editor/verification/const'
import { ApplicationType } from '~../../lib-common/src/api-types/application/enums'
import ContactInfoSecondGuardianDaycare from './ContactInfoSecondGuardianDaycare'
import ContactInfoSecondGuardianPreschool from './ContactInfoSecondGuardianPreschool'

type ContactInfoProps = {
  formData: ContactInfoFormData
  type: ApplicationType
  showFridgeFamilySection: boolean
}

export default React.memo(function ContactInfoSection({
  formData,
  type,
  showFridgeFamilySection
}: ContactInfoProps) {
  const t = useTranslation()
  const tLocal = t.applications.editor.verification.contactInfo

  return (
    <div>
      <H2 noMargin>{tLocal.title}</H2>

      <Gap size="s" />

      <H3>{tLocal.child.title}</H3>
      <ListGrid
        labelWidth={ApplicationDataGridLabelWidth}
        rowGap="s"
        columnGap="L"
      >
        <Label>{tLocal.child.name}</Label>
        <span>
          {formData.childFirstName} {formData.childLastName}
        </span>

        <Label>{tLocal.child.ssn}</Label>
        <span>{formData.childSSN}</span>

        <Label>{tLocal.child.streetAddress}</Label>
        <span>{formData.childStreet}</span>

        <Label>{tLocal.child.isAddressChanging}</Label>
        <span>
          {formData.childFutureAddressExists
            ? tLocal.child.hasFutureAddress
            : t.applications.editor.verification.no}
        </span>

        {formData.childFutureAddressExists && (
          <>
            <Label>{tLocal.child.addressChangesAt}</Label>
            <span>{formData.childMoveDate}</span>

            <Label>{tLocal.child.newAddress}</Label>
            <span>
              {formData.childFutureStreet} {formData.childFuturePostalCode}{' '}
              {formData.childFuturePostOffice}
            </span>
          </>
        )}
      </ListGrid>

      <Gap size="m" />

      <H3>{tLocal.guardian.title}</H3>
      <ListGrid
        labelWidth={ApplicationDataGridLabelWidth}
        rowGap="s"
        columnGap="L"
      >
        <Label>{tLocal.guardian.name}</Label>
        <span>
          {formData.guardianFirstName} {formData.guardianLastName}
        </span>
        <Label>{tLocal.guardian.tel}</Label>
        <span>{formData.guardianPhone}</span>
        <Label>{tLocal.guardian.email}</Label>
        <span>{formData.guardianEmail}</span>
        <Label>{tLocal.guardian.streetAddress}</Label>
        <span>{formData.guardianHomeAddress}</span>
      </ListGrid>

      {type !== 'CLUB' && (
        <>
          <Gap size="m" />
          <H3>{tLocal.secondGuardian.title}</H3>
          {type === 'DAYCARE' && <ContactInfoSecondGuardianDaycare />}
          {type === 'PRESCHOOL' && !!formData.otherGuardianAgreementStatus && (
            <ContactInfoSecondGuardianPreschool formData={formData} />
          )}

          {showFridgeFamilySection && (
            <>
              <Gap size="m" />
              <H3>{tLocal.fridgePartner.title}</H3>
              {formData.otherPartnerExists ? (
                <ListGrid
                  labelWidth={ApplicationDataGridLabelWidth}
                  rowGap="s"
                  columnGap="L"
                >
                  <Label>{tLocal.fridgePartner.name}</Label>
                  <span>
                    {formData.otherPartnerFirstName}{' '}
                    {formData.otherPartnerLastName}
                  </span>

                  <Label>{tLocal.fridgePartner.ssn}</Label>
                  <span>{formData.otherPartnerSSN}</span>
                </ListGrid>
              ) : (
                <span>{t.applications.editor.verification.no}</span>
              )}

              <Gap size="m" />
              <H3>{tLocal.fridgeChildren.title}</H3>
              {formData.otherChildren.length > 0 ? (
                formData.otherChildren.map(
                  ({ firstName, lastName, socialSecurityNumber }) => (
                    <ListGrid
                      key={socialSecurityNumber}
                      labelWidth={ApplicationDataGridLabelWidth}
                      rowGap="s"
                      columnGap="L"
                    >
                      <Label>{tLocal.fridgeChildren.name}</Label>
                      <span>
                        {firstName} {lastName}
                      </span>

                      <Label>{tLocal.fridgeChildren.ssn}</Label>
                      <span>{socialSecurityNumber}</span>
                      <Gap size="m" />
                    </ListGrid>
                  )
                )
              ) : (
                <span>{tLocal.fridgeChildren.noOtherChildren}</span>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
})
