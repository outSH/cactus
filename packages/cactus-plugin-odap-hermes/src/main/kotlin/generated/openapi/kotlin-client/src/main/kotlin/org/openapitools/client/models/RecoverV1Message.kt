/**
 *
 * Please note:
 * This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * Do not edit this file manually.
 *
 */

@file:Suppress(
    "ArrayInDataClass",
    "EnumEntryName",
    "RemoveRedundantQualifierName",
    "UnusedImport"
)

package org.openapitools.client.models


import com.squareup.moshi.Json

/**
 * 
 *
 * @param sessionID 
 * @param odapPhase 
 * @param sequenceNumber 
 * @param lastLogEntryTimestamp 
 * @param isBackup 
 * @param newBasePath 
 * @param signature 
 * @param newGatewayPubKey 
 */


data class RecoverV1Message (

    @Json(name = "sessionID")
    val sessionID: kotlin.String,

    @Json(name = "odapPhase")
    val odapPhase: kotlin.String,

    @Json(name = "sequenceNumber")
    val sequenceNumber: java.math.BigDecimal,

    @Json(name = "lastLogEntryTimestamp")
    val lastLogEntryTimestamp: kotlin.String,

    @Json(name = "isBackup")
    val isBackup: kotlin.Boolean,

    @Json(name = "newBasePath")
    val newBasePath: kotlin.String,

    @Json(name = "signature")
    val signature: kotlin.String,

    @Json(name = "newGatewayPubKey")
    val newGatewayPubKey: kotlin.String? = null

)
