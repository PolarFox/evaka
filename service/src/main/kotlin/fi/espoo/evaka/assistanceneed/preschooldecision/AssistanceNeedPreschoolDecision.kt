// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.assistanceneed.preschooldecision

import fi.espoo.evaka.assistanceneed.decision.AssistanceNeedDecisionLanguage
import fi.espoo.evaka.assistanceneed.decision.AssistanceNeedDecisionStatus
import fi.espoo.evaka.assistanceneed.decision.UnitInfoBasics
import fi.espoo.evaka.shared.AssistanceNeedPreschoolDecisionGuardianId
import fi.espoo.evaka.shared.AssistanceNeedPreschoolDecisionId
import fi.espoo.evaka.shared.ChildId
import fi.espoo.evaka.shared.DaycareId
import fi.espoo.evaka.shared.EmployeeId
import fi.espoo.evaka.shared.PersonId
import fi.espoo.evaka.shared.domain.HelsinkiDateTime
import java.time.LocalDate
import org.jdbi.v3.core.mapper.Nested
import org.jdbi.v3.json.Json

data class AssistanceNeedPreschoolDecision(
    val id: AssistanceNeedPreschoolDecisionId,
    val decisionNumber: Long,
    @Nested("child") val child: AssistanceNeedPreschoolDecisionChild,
    @Nested val form: AssistanceNeedPreschoolDecisionForm,
    val status: AssistanceNeedDecisionStatus,
    val sentForDecision: LocalDate?,
    val decisionMade: LocalDate?,
    val annulmentReason: String,
    val hasDocument: Boolean,
    val unitName: String?,
    val preparer1Name: String?,
    val preparer2Name: String?,
    val decisionMakerName: String?
) {
    val isValid: Boolean
        get() {
            if (form.type == null) return false
            if (form.validFrom == null) return false
            if (
                form.extendedCompulsoryEducation &&
                    form.extendedCompulsoryEducationInfo.trim().isBlank()
            )
                return false
            if (form.selectedUnit == null) return false
            if (form.primaryGroup.trim().isBlank()) return false
            if (form.decisionBasis.trim().isBlank()) return false
            if (
                listOf(
                        form.basisDocumentPedagogicalReport,
                        form.basisDocumentPsychologistStatement,
                        form.basisDocumentSocialReport,
                        form.basisDocumentDoctorStatement,
                        form.basisDocumentOtherOrMissing
                    )
                    .none { it }
            )
                return false
            if (
                form.basisDocumentOtherOrMissing &&
                    form.basisDocumentOtherOrMissingInfo.trim().isBlank()
            )
                return false
            if (form.guardiansHeardOn == null) return false
            if (form.guardianInfo.any { !it.isHeard || it.details.trim().isBlank() }) return false
            if (
                form.guardianInfo.isEmpty() &&
                    (form.otherRepresentativeHeard ||
                        form.otherRepresentativeDetails.trim().isBlank())
            )
                return false
            if (form.viewOfGuardians.trim().isBlank()) return false
            if (form.preparer1EmployeeId == null) return false
            if (form.preparer1Title.trim().isBlank()) return false
            if (form.preparer2EmployeeId != null && form.preparer2Title.trim().isBlank())
                return false
            if (form.decisionMakerEmployeeId == null) return false
            if (form.decisionMakerTitle.trim().isBlank()) return false

            return true
        }
}

enum class AssistanceNeedPreschoolDecisionType {
    NEW,
    CONTINUING,
    TERMINATED
}

data class AssistanceNeedPreschoolDecisionForm(
    val language: AssistanceNeedDecisionLanguage,
    val type: AssistanceNeedPreschoolDecisionType?,
    val validFrom: LocalDate?,
    val extendedCompulsoryEducation: Boolean,
    val extendedCompulsoryEducationInfo: String,
    val grantedAssistanceService: Boolean,
    val grantedInterpretationService: Boolean,
    val grantedAssistiveDevices: Boolean,
    val grantedServicesBasis: String,
    val selectedUnit: DaycareId?,
    val primaryGroup: String,
    val decisionBasis: String,
    val basisDocumentPedagogicalReport: Boolean,
    val basisDocumentPsychologistStatement: Boolean,
    val basisDocumentSocialReport: Boolean,
    val basisDocumentDoctorStatement: Boolean,
    val basisDocumentOtherOrMissing: Boolean,
    val basisDocumentOtherOrMissingInfo: String,
    val basisDocumentsInfo: String,
    val guardiansHeardOn: LocalDate?,
    @Json val guardianInfo: Set<AssistanceNeedPreschoolDecisionGuardian>,
    val otherRepresentativeHeard: Boolean,
    val otherRepresentativeDetails: String,
    val viewOfGuardians: String,
    val preparer1EmployeeId: EmployeeId?,
    val preparer1Title: String,
    val preparer1PhoneNumber: String,
    val preparer2EmployeeId: EmployeeId?,
    val preparer2Title: String,
    val preparer2PhoneNumber: String,
    val decisionMakerEmployeeId: EmployeeId?,
    val decisionMakerTitle: String,
)

data class AssistanceNeedPreschoolDecisionChild(
    val id: ChildId,
    val name: String,
    val dateOfBirth: LocalDate
)

data class AssistanceNeedPreschoolDecisionBasics(
    val id: AssistanceNeedPreschoolDecisionId,
    val created: HelsinkiDateTime,
    val status: AssistanceNeedDecisionStatus,
    val type: AssistanceNeedPreschoolDecisionType?,
    val validFrom: LocalDate?,
    val validTo: LocalDate?,
    @Nested("selected_unit") val selectedUnit: UnitInfoBasics?,
    val sentForDecision: LocalDate?,
    val decisionMade: LocalDate?
)

data class AssistanceNeedPreschoolDecisionGuardian(
    val id: AssistanceNeedPreschoolDecisionGuardianId,
    val personId: PersonId,
    val name: String,
    val isHeard: Boolean,
    val details: String
)
