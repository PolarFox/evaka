// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package evaka.codegen.apitypes

import fi.espoo.evaka.shared.Id
import fi.espoo.evaka.shared.security.Action
import java.time.LocalDate
import java.util.UUID

const val basePackage = "fi.espoo.evaka"

private val standardTsMapping: Map<String, String> =
    mapOf(
        "kotlin.String" to "string",
        "kotlin.Byte" to "number",
        "kotlin.Int" to "number",
        "kotlin.Long" to "number",
        "kotlin.Double" to "number",
        "java.math.BigDecimal" to "number",
        "kotlin.Boolean" to "boolean",
        "java.time.OffsetDateTime" to "Date",
        "java.net.URI" to "string"
    )

private val customClassesMapping: Map<String, TSMapping> =
    mapOf(
        "java.util.UUID" to TSMapping("UUID", "import { type UUID } from '../../types'"),
        "fi.espoo.evaka.shared.Id" to TSMapping("UUID", "import { type UUID } from '../../types'"),
        "java.time.LocalDate" to
            TSMapping("LocalDate", "import type LocalDate from '../../local-date'"),
        "java.time.LocalTime" to
            TSMapping("LocalTime", "import type LocalTime from '../../local-time'"),
        "fi.espoo.evaka.shared.domain.HelsinkiDateTime" to
            TSMapping(
                "HelsinkiDateTime",
                "import type HelsinkiDateTime from '../../helsinki-date-time'"
            ),
        "fi.espoo.evaka.shared.domain.FiniteDateRange" to
            TSMapping(
                "FiniteDateRange",
                "import type FiniteDateRange from '../../finite-date-range'"
            ),
        "fi.espoo.evaka.shared.domain.DateRange" to
            TSMapping("DateRange", "import type DateRange from '../../date-range'"),
        "fi.espoo.evaka.vasu.VasuQuestion" to
            TSMapping("VasuQuestion", "import { type VasuQuestion } from '../../api-types/vasu'"),
        "fi.espoo.evaka.messaging.MessageReceiver" to
            TSMapping(
                "MessageReceiver",
                "import { type MessageReceiver } from '../../api-types/messaging'"
            ),
        "fi.espoo.evaka.invoicing.domain.DecisionIncome" to
            TSMapping(
                "DecisionIncome",
                "import { type DecisionIncome } from '../../api-types/income'"
            ),
        "fi.espoo.evaka.invoicing.service.ProductKey" to TSMapping("string")
    )

private val actionsMapping: Map<String, TSMapping> =
    Action::class.nestedClasses.associate { action ->
        action.qualifiedName!! to
            TSMapping("Action.${action.simpleName}", "import { type Action } from '../action'")
    } +
        Action.Citizen::class.nestedClasses.associate { action ->
            action.qualifiedName!! to
                TSMapping(
                    "Action.Citizen.${action.simpleName}",
                    "import { type Action } from '../action'"
                )
        }

val tsMapping: Map<String, TSMapping> =
    standardTsMapping.mapValues { TSMapping(it.value) } + customClassesMapping + actionsMapping

data class TSMapping(val type: String, val import: String? = null)

val kotlinCollectionClasses =
    listOf(
        Collection::class,
        Array::class,
        IntArray::class,
        DoubleArray::class,
        BooleanArray::class
    )

val validMapKeyTypes = listOf(String::class, UUID::class, Id::class, LocalDate::class)
