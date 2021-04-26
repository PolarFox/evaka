// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.messaging

import fi.espoo.evaka.PureJdbiTest
import fi.espoo.evaka.messaging.message.MessageType
import fi.espoo.evaka.messaging.message.createMessageThread
import fi.espoo.evaka.messaging.message.getMessageAccountsForUser
import fi.espoo.evaka.messaging.message.getMessagesByAccount
import fi.espoo.evaka.resetDatabase
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.dev.DevEmployee
import fi.espoo.evaka.shared.dev.DevPerson
import fi.espoo.evaka.shared.dev.insertTestEmployee
import fi.espoo.evaka.shared.dev.insertTestPerson
import org.jdbi.v3.core.kotlin.mapTo
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.UUID

class MessageQueriesTest : PureJdbiTest() {

    private val personId: UUID = UUID.randomUUID()
    private val person2Id: UUID = UUID.randomUUID()
    private val employeeId: UUID = UUID.randomUUID()

    @BeforeEach
    internal fun setUp() {
        db.transaction {
            it.insertTestPerson(DevPerson(id = personId, firstName = "Firstname", lastName = "Person"))
            it.execute("INSERT INTO message_account (person_id) VALUES ('$personId')")

            it.insertTestPerson(DevPerson(id = person2Id, firstName = "Firstname", lastName = "Person Two"))
            it.execute("INSERT INTO message_account (person_id) VALUES ('$person2Id')")

            it.insertTestEmployee(DevEmployee(id = employeeId, firstName = "Firstname", lastName = "Employee"))
            it.execute("INSERT INTO message_account (employee_id) VALUES ('$employeeId')")
        }
    }

    @AfterEach
    internal fun tearDown() {
        db.transaction { it.resetDatabase() }
    }

    @Test
    fun `a thread can be created, it can be accessed by all participating accounts`() {
        val (employeeAccount) = db.transaction { it.getMessageAccountsForUser(AuthenticatedUser.Employee(id = employeeId, roles = setOf())) }

        val personAccountId = getMessageAccountId(personId = personId)
        val person2AccountId = getMessageAccountId(personId = person2Id)

        db.transaction { it.createMessageThread(title = "Hello", content = "Content", type = MessageType.MESSAGE, sender = employeeAccount, recipientAccountIds = listOf(personAccountId, person2AccountId)) }

        val result = db.read { it.getMessagesByAccount(accountId = employeeAccount.id, pageSize = 10, page = 1) }

        assertEquals(1, result.total)
        assertEquals(1, result.data.size)
        val thread = result.data[0]

        assertEquals(1, thread.messages.size)
        assertEquals(employeeAccount.id, thread.messages[0].senderId)
        assertEquals("Employee Firstname", thread.messages[0].senderName)
        assertEquals("Content", thread.messages[0].content)
        assertEquals("Hello", thread.messages[0].title)

        val resultEmployee = db.read { it.getMessagesByAccount(accountId = personAccountId, pageSize = 10, page = 1) }
        assertEquals(resultEmployee, result, "Employee and person results did not match")
    }

    private fun getMessageAccountId(personId: UUID? = null, employeeId: UUID? = null): UUID {
        val (columnName, id) = if (personId != null) Pair("person_id", personId) else (Pair("employee_id", employeeId))
        return db.read {
            it.createQuery("SELECT id from message_account WHERE $columnName = :id")
                .bind("id", id)
                .mapTo<UUID>()
                .one()
        }
    }
}
