// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.shared.auth

import fi.espoo.evaka.shared.domain.Forbidden

enum class UserRole {
    END_USER,
    CITIZEN_WEAK,

    ADMIN,
    REPORT_VIEWER,
    DIRECTOR,
    FINANCE_ADMIN,
    SERVICE_WORKER,

    UNIT_SUPERVISOR,
    STAFF,
    SPECIAL_EDUCATION_TEACHER,
    MOBILE,

    GROUP_STAFF;

    companion object {
        val SCOPED_ROLES = setOf(UNIT_SUPERVISOR, STAFF, SPECIAL_EDUCATION_TEACHER, MOBILE, GROUP_STAFF)
    }
}

interface RoleContainer {
    val roles: Set<UserRole>

    @Deprecated("use Action model instead", replaceWith = ReplaceWith(""))
    fun hasOneOfRoles(vararg requiredRoles: UserRole) = requiredRoles.any { roles.contains(it) }

    @Deprecated("use Action model instead", replaceWith = ReplaceWith(""))
    fun requireOneOfRoles(vararg roles: UserRole) {
        @Suppress("DEPRECATION")
        if (!hasOneOfRoles(*roles)) throw Forbidden()
    }
}
