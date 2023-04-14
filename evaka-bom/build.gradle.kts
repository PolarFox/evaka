// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

plugins {
    `java-platform`
}

object Version {
    const val bouncyCastle = "1.72"
    const val cxf = "4.0.0"
    const val flyingSaucer = "9.1.22"
    const val fuel = "2.3.1"
    const val mockito = "5.1.1"
    const val openTracing = "0.33.0"
}

javaPlatform {
    allowDependencies()
}

dependencies {
    constraints {
        api("com.auth0:java-jwt:4.2.2")
        api("com.fasterxml.woodstox:woodstox-core:6.4.0")
        api("com.github.kagkarlsson:db-scheduler:11.6")
        api("com.github.kittinunf.fuel:fuel:${Version.fuel}")
        api("com.github.kittinunf.fuel:fuel-jackson:${Version.fuel}")
        api("com.google.guava:guava:31.1-jre")
        api("com.zaxxer:HikariCP:5.0.1")
        api("io.github.microutils:kotlin-logging-jvm:3.0.4")
        api("io.javalin:javalin:5.3.2")
        api("io.opentracing:opentracing-api:${Version.openTracing}")
        api("io.opentracing:opentracing-util:${Version.openTracing}")
        api("jakarta.annotation:jakarta.annotation-api:2.1.1")
        api("jakarta.jws:jakarta.jws-api:3.0.0")
        api("jakarta.xml.ws:jakarta.xml.ws-api:4.0.0")
        api("net.logstash.logback:logstash-logback-encoder:7.2")
        api("nz.net.ultraq.thymeleaf:thymeleaf-layout-dialect:3.2.0")
        api("org.apache.cxf:cxf-tools-wsdlto-databinding-jaxb:${Version.cxf}") // not included in cxf-bom
        api("org.apache.commons:commons-pool2:2.11.1")
        api("org.apache.commons:commons-text:1.10.0")
        api("org.apache.commons:commons-imaging:1.0-alpha3")
        api("org.apache.tika:tika-core:2.6.0")
        api("org.apache.wss4j:wss4j-ws-security-dom:3.0.0")
        api("org.bouncycastle:bcpkix-jdk18on:${Version.bouncyCastle}")
        api("org.bouncycastle:bcprov-jdk18on:${Version.bouncyCastle}")
        api("org.flywaydb:flyway-core:9.14.1")
        api("org.glassfish.jaxb:jaxb-runtime:4.0.1")
        api("org.jetbrains:annotations:24.0.0")
        api("org.mockito:mockito-core:${Version.mockito}")
        api("org.mockito:mockito-junit-jupiter:${Version.mockito}")
        api("org.mockito.kotlin:mockito-kotlin:4.1.0")
        api("org.postgresql:postgresql:42.5.1")
        api("org.skyscreamer:jsonassert:1.5.1")
        api("org.thymeleaf.extras:thymeleaf-extras-java8time:3.0.4.RELEASE")
        api("org.thymeleaf:thymeleaf:3.1.1.RELEASE")
        api("org.xhtmlrenderer:flying-saucer-core:${Version.flyingSaucer}")
        api("org.xhtmlrenderer:flying-saucer-pdf-openpdf:${Version.flyingSaucer}")
        api("org.yaml:snakeyaml:1.33")
        api("redis.clients:jedis:4.3.1")
    }

    api(platform("com.fasterxml.jackson:jackson-bom:2.14.2"))
    api(platform("org.apache.cxf:cxf-bom:${Version.cxf}"))
    api(platform("org.jdbi:jdbi3-bom:3.36.0"))
    api(platform("org.jetbrains.kotlin:kotlin-bom:1.8.10"))
    api(platform("org.junit:junit-bom:5.9.2"))
    api(platform("org.springframework.boot:spring-boot-dependencies:3.0.5"))
    api(platform("software.amazon.awssdk:bom:2.19.29"))
}
