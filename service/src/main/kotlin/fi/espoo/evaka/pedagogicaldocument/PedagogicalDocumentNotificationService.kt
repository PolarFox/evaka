// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.pedagogicaldocument

import fi.espoo.evaka.EmailEnv
import fi.espoo.evaka.EvakaEnv
import fi.espoo.evaka.daycare.domain.Language
import fi.espoo.evaka.emailclient.IEmailClient
import fi.espoo.evaka.shared.ChildId
import fi.espoo.evaka.shared.PedagogicalDocumentId
import fi.espoo.evaka.shared.async.AsyncJob
import fi.espoo.evaka.shared.async.AsyncJobRunner
import fi.espoo.evaka.shared.db.Database
import fi.espoo.evaka.shared.db.mapColumn
import fi.espoo.evaka.shared.domain.HelsinkiDateTime
import fi.espoo.evaka.shared.utils.dateNow
import org.springframework.stereotype.Service

@Service
class PedagogicalDocumentNotificationService(
    private val asyncJobRunner: AsyncJobRunner<AsyncJob>,
    private val emailClient: IEmailClient,
    env: EvakaEnv,
    emailEnv: EmailEnv
) {
    init {
        asyncJobRunner.registerHandler(::sendNotification)
    }

    val baseUrl: String = env.frontendBaseUrlFi
    val baseUrlSv: String = env.frontendBaseUrlSv
    val senderAddress: String = emailEnv.senderAddress
    val senderNameFi: String = emailEnv.senderNameFi
    val senderNameSv: String = emailEnv.senderNameSv

    fun getFromAddress(language: Language) = when (language) {
        Language.sv -> "$senderNameSv <$senderAddress>"
        else -> "$senderNameFi <$senderAddress>"
    }

    fun getPedagogicalDocumentationNotifications(
        tx: Database.Transaction,
        docId: PedagogicalDocumentId,
        childId: ChildId
    ): List<AsyncJob.SendPedagogicalDocumentNotificationEmail> {
        // language=sql
        val sql = """
        WITH guardians AS (
            SELECT g.guardian_id AS person_id
            FROM guardian g
            WHERE g.child_id = :childId
        ), head_of_child AS (
            SELECT fc.head_of_child AS person_id
            FROM fridge_child fc
            WHERE fc.child_id = :childId AND daterange(fc.start_date, fc.end_date, '[]') @> :date
        ), recipient_ids AS (
            SELECT person_id FROM guardians
            UNION DISTINCT 
            SELECT person_id FROM head_of_child
        )
        
        SELECT DISTINCT
            p.email as recipient_email,
            coalesce(lower(p.language), 'fi') as language
        FROM recipient_ids r
        JOIN person p ON r.person_id = p.id
        WHERE NOT EXISTS(SELECT 1 FROM messaging_blocklist bl WHERE bl.child_id = :childId AND bl.blocked_recipient = p.id)
        """.trimIndent()

        try {
            return tx.createQuery(sql)
                .bind("childId", childId)
                .bind("date", dateNow())
                .map { row ->
                    AsyncJob.SendPedagogicalDocumentNotificationEmail(
                        pedagogicalDocumentId = docId,
                        recipientEmail = row.mapColumn("recipient_email"),
                        language = getLanguage(row.mapColumn("language"))
                    )
                }
                .list()
        } catch (e: Exception) {
            return listOf()
        }
    }

    fun scheduleSendingNotifications(tx: Database.Transaction, docId: PedagogicalDocumentId, childId: ChildId) {
        asyncJobRunner.plan(
            tx,
            payloads = getPedagogicalDocumentationNotifications(tx, docId, childId),
            runAt = HelsinkiDateTime.now(),
            retryCount = 10
        )
    }

    private fun getLanguage(languageStr: String?): Language {
        return when (languageStr?.lowercase()) {
            "sv" -> Language.sv
            "en" -> Language.en
            else -> Language.fi
        }
    }

    fun sendNotification(db: Database.Connection, msg: AsyncJob.SendPedagogicalDocumentNotificationEmail) {
        val (pedagogicalDocumentId, recipientEmail, language) = msg

        db.transaction { tx ->
            emailClient.sendEmail(
                traceId = pedagogicalDocumentId.toString(),
                toAddress = recipientEmail,
                fromAddress = getFromAddress(language),
                subject = getSubject(),
                htmlBody = getHtml(language),
                textBody = getText(language)
            )
            tx.markPedagogicalDocumentNotificationSent(pedagogicalDocumentId)
        }
    }

    private fun getSubject(): String {
        val postfix = if (System.getenv("VOLTTI_ENV") == "prod") "" else " [${System.getenv("VOLTTI_ENV")}]"

        return "Uusi pedagoginen dokumentti eVakassa / Nytt pedagogiskt dokument i eVaka / New pedagogical document in eVaka$postfix"
    }

    private fun getDocumentsUrl(lang: Language): String {
        val base = when (lang) {
            Language.sv -> baseUrlSv
            else -> baseUrl
        }
        return "$base/pedagogical-documents"
    }

    private fun getHtml(language: Language): String {
        val documentsUrl = getDocumentsUrl(language)
        return """
                <p>Sinulle on saapunut uusi pedagoginen dokumentti eVakaan. Lue dokumentti täältä: <a href="$documentsUrl">$documentsUrl</a></p>
                <p>Tämä on eVaka-järjestelmän automaattisesti lähettämä ilmoitus. Älä vastaa tähän viestiin.</p>
            
                <hr>
                
                <p>Du har fått ett nytt pedagogiskt dokument i eVaka. Läs dokumentet här: <a href="$documentsUrl">$documentsUrl</a></p>
                <p>Detta besked skickas automatiskt av eVaka. Svara inte på detta besked.</p>          
                
                <hr>
                
                <p>You have received a new eVaka pedagogical document. Read the document here: <a href="$documentsUrl">$documentsUrl</a></p>
                <p>This is an automatic message from the eVaka system. Do not reply to this message.</p>       
        """.trimIndent()
    }

    private fun getText(language: Language): String {
        val documentsUrl = getDocumentsUrl(language)
        return """
                Sinulle on saapunut uusi pedagoginen dokumentti eVakaan. Lue dokumentti täältä: $documentsUrl
                
                Tämä on eVaka-järjestelmän automaattisesti lähettämä ilmoitus. Älä vastaa tähän viestiin.
                
                -----
       
                Du har fått ett nytt pedagogiskt dokument i eVaka. Läs dokumentet här: $documentsUrl
                
                Detta besked skickas automatiskt av eVaka. Svara inte på detta besked. 
                
                -----
                
                You have received a new eVaka pedagogical document. Read the document here: $documentsUrl
                
                This is an automatic message from the eVaka system. Do not reply to this message.  
        """.trimIndent()
    }
}

private fun Database.Transaction.markPedagogicalDocumentNotificationSent(
    documentId: PedagogicalDocumentId
) {
    this.createUpdate(
        """
            UPDATE pedagogical_document
            SET email_sent = TRUE 
            WHERE id = :id
        """.trimIndent()
    )
        .bind("id", documentId)
        .execute()
}
