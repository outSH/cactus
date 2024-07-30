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

import org.openapitools.client.models.FabricCertificateIdentityV1
import org.openapitools.client.models.FullBlockTransactionEndorsementV1

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Transaction action returned from fabric block.
 *
 * @param functionName 
 * @param functionArgs 
 * @param chaincodeId 
 * @param creator 
 * @param endorsements 
 */


data class FullBlockTransactionActionV1 (

    @Json(name = "functionName")
    val functionName: kotlin.String,

    @Json(name = "functionArgs")
    val functionArgs: kotlin.collections.List<kotlin.String>,

    @Json(name = "chaincodeId")
    val chaincodeId: kotlin.String,

    @Json(name = "creator")
    val creator: FabricCertificateIdentityV1,

    @Json(name = "endorsements")
    val endorsements: kotlin.collections.List<FullBlockTransactionEndorsementV1>

)
