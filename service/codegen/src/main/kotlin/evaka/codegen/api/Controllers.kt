// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package evaka.codegen.api

import fi.espoo.evaka.shared.auth.AuthenticatedUser
import kotlin.reflect.KClass
import kotlin.reflect.KFunction
import kotlin.reflect.KParameter
import kotlin.reflect.KType
import kotlin.reflect.full.functions
import kotlin.reflect.full.hasAnnotation
import kotlin.reflect.full.isSubtypeOf
import kotlin.reflect.full.valueParameters
import kotlin.reflect.jvm.javaMethod
import kotlin.reflect.typeOf
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.ClassPathBeanDefinitionScanner
import org.springframework.core.MethodParameter
import org.springframework.core.env.StandardEnvironment
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.StringHttpMessageConverter
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.context.support.StaticWebApplicationContext
import org.springframework.web.method.annotation.RequestParamMethodArgumentResolver
import org.springframework.web.servlet.mvc.method.annotation.PathVariableMethodArgumentResolver
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping
import org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor

/** Scans all REST endpoints using Spring, returning metadata about all of them */
fun scanEndpoints(
    packageName: String,
    profiles: List<String> = emptyList()
): List<EndpointMetadata> =
    StaticWebApplicationContext().use { ctx ->
        val env = StandardEnvironment()
        env.setActiveProfiles(*profiles.toTypedArray())
        val scanner = ClassPathBeanDefinitionScanner(ctx, true, env)
        scanner.scan(packageName)
        ctx.getEndpointMetadata()
    }

fun ApplicationContext.getEndpointMetadata(): List<EndpointMetadata> =
    RequestMappingHandlerMapping()
        .also { mapping ->
            mapping.applicationContext = this
            mapping.afterPropertiesSet()
        }
        .getEndpointMetadata()

data class EndpointMetadata(
    val controllerClass: KClass<*>,
    val controllerMethod: KFunction<*>,
    val isJsonEndpoint: Boolean,
    val isDeprecated: Boolean,
    val path: String,
    /**
     * Index number of the path, counted by the order the paths were scanned.
     *
     * For example, a controller method with `@GetMapping(value = ["/units", "/public/units"])`:
     * - EndpointMetadata(path="/units", pathIndex=0, ...)
     * - EndpointMetadata(path="/public/units", pathIndex=1, ...)
     */
    val pathIndex: Int,
    val httpMethod: RequestMethod,
    val pathVariables: List<NamedParameter>,
    val requestParameters: List<NamedParameter>,
    val requestBodyType: KType?,
    val responseBodyType: KType?,
    val authenticatedUserType: KType?,
) {
    fun types(): Sequence<KType> =
        pathVariables.asSequence().map { it.type } +
            requestParameters.asSequence().map { it.type } +
            listOfNotNull(requestBodyType, responseBodyType)

    fun validate() {
        fun fail(reason: String): Nothing =
            error("Invalid $httpMethod endpoint $path in $controllerClass: $reason")
        when (httpMethod) {
            RequestMethod.GET,
            RequestMethod.HEAD,
            RequestMethod.DELETE, -> {
                if (httpMethod == RequestMethod.GET && responseBodyType == null) {
                    fail("It should have a response body")
                }
                if (requestBodyType != null) {
                    fail("It should not use a request body")
                }
            }
            RequestMethod.POST,
            RequestMethod.PUT,
            RequestMethod.PATCH -> {}
            RequestMethod.TRACE,
            RequestMethod.OPTIONS -> fail("Method not supported")
        }
    }
}

data class NamedParameter(val name: String, val type: KType)

private fun RequestMappingHandlerMapping.getEndpointMetadata(): List<EndpointMetadata> {
    fun KFunction<*>.find(param: MethodParameter): KParameter =
        valueParameters[param.parameterIndex]
    fun <A : Annotation> KFunction<*>.findAnnotatedParameter(
        annotation: KClass<A>,
        getName: (A) -> String?,
        param: MethodParameter
    ): NamedParameter {
        val kotlinParam = find(param)
        val name =
            param.getParameterAnnotation(annotation.java)?.let(getName)?.takeIf { it.isNotBlank() }
                ?: kotlinParam.name!!
        return NamedParameter(name = name, type = kotlinParam.type)
    }

    val pathSupport = PathVariableMethodArgumentResolver()
    val paramSupport = RequestParamMethodArgumentResolver(false)
    val bodySupport = RequestResponseBodyMethodProcessor(listOf(StringHttpMessageConverter()))
    return handlerMethods
        .asSequence()
        .flatMap { (info, method) ->
            val controllerClass = method.beanType.kotlin
            val kotlinMethod = controllerClass.functions.find { it.javaMethod == method.method }!!
            val authenticatedUserType =
                kotlinMethod.parameters
                    .singleOrNull { it.type.isSubtypeOf(typeOf<AuthenticatedUser>()) }
                    ?.type
            val pathVariables =
                method.methodParameters
                    .filter { pathSupport.supportsParameter(it) }
                    .mapNotNull { param ->
                        kotlinMethod.findAnnotatedParameter(PathVariable::class, { it.name }, param)
                    }
            val requestParameters =
                method.methodParameters
                    .filter { paramSupport.supportsParameter(it) }
                    .mapNotNull { param ->
                        kotlinMethod.findAnnotatedParameter(RequestParam::class, { it.name }, param)
                    }
            val requestBodyType =
                method.methodParameters
                    .firstOrNull { bodySupport.supportsParameter(it) }
                    ?.let { kotlinMethod.find(it).type }
            val responseBodyType =
                if (!method.isVoid && bodySupport.supportsReturnType(method.returnType)) {
                    if (kotlinMethod.returnType.classifier == ResponseEntity::class) {
                        kotlinMethod.returnType.arguments.single().type
                    } else kotlinMethod.returnType
                } else null
            // Extract all possible path patterns manually in order to preserve order if possible.
            // The underlying Spring types use sets, but they seem to be order-preserving
            // implementations
            val paths =
                listOfNotNull(
                        info.pathPatternsCondition?.patterns?.map { it.patternString },
                        info.patternsCondition?.patterns?.toList()
                    )
                    .flatten()
            val methods = info.methodsCondition.methods
            val consumesJson =
                info.consumesCondition.isEmpty ||
                    info.consumesCondition.consumableMediaTypes.contains(MediaType.APPLICATION_JSON)
            val producesJson =
                info.producesCondition.isEmpty ||
                    info.producesCondition.producibleMediaTypes.contains(MediaType.APPLICATION_JSON)
            paths
                .withIndex()
                .flatMap { (pathIndex, path) ->
                    methods.map { method -> Triple(path, pathIndex, method) }
                }
                .map { (path, pathIndex, method) ->
                    EndpointMetadata(
                        controllerClass = controllerClass,
                        controllerMethod = kotlinMethod,
                        isJsonEndpoint =
                            consumesJson && producesJson && responseBodyType != typeOf<Any>(),
                        isDeprecated = kotlinMethod.hasAnnotation<Deprecated>(),
                        path = path,
                        pathIndex = pathIndex,
                        httpMethod = method,
                        pathVariables = pathVariables,
                        requestParameters = requestParameters,
                        requestBodyType = requestBodyType,
                        responseBodyType = responseBodyType,
                        authenticatedUserType = authenticatedUserType,
                    )
                }
        }
        .toList()
}
