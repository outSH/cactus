package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.ObjectWriter
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.springframework.stereotype.Service
import org.springframework.scheduling.annotation.Scheduled
import net.corda.core.flows.FlowLogic
import net.corda.core.messaging.CordaRPCOps
import net.corda.core.messaging.FlowProgressHandle
import net.corda.core.transactions.SignedTransaction
import net.corda.core.utilities.loggerFor
import net.schmizz.sshj.SSHClient
import net.schmizz.sshj.connection.channel.direct.Session
import net.schmizz.sshj.transport.TransportException
import net.schmizz.sshj.transport.verification.PromiscuousVerifier
import net.schmizz.sshj.userauth.method.AuthPassword
import net.schmizz.sshj.userauth.password.PasswordUtils
import net.schmizz.sshj.xfer.InMemorySourceFile
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.api.ApiPluginLedgerConnectorCordaService
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.*
import java.io.IOException
import java.io.InputStream
import java.lang.Exception
import java.lang.RuntimeException
import java.util.*
import java.util.concurrent.TimeUnit
import java.math.BigInteger
import kotlin.IllegalArgumentException
import net.corda.core.contracts.ContractState
import rx.Subscription

// TODO - Inny pliczek
class ClientStateMonitorSession() {
    data class MonitorQueue(val events: MutableList<GetMonitorTransactionsV1ResponseTx>, val subscription: Subscription)

    val stateBuffers = mutableMapOf<String, MonitorQueue>()

    fun startMonitor(ContractState) {
        // handle case it's already started
        // ret bool? if succeed?

        @Suppress("UNCHECKED_CAST")
        val contractState = jsonJvmObjectDeserializer.getOrInferType(stateName) as Class<out ContractState>
        // if possible toString(), then pass ContractState

        // FIXME: "valutTrack(xxx).updates" occurs an error if Corda ledger has already over 200 transactions using the stateName that you set above.
        // Please refer to "https://r3-cev.atlassian.net/browse/CORDA-2956" to get more infomation.
        val stateObservable = this.rpc.proxy.vaultTrack(contractState).updates
        var txCounter = BigInteger.valueOf(0)
        this.watchedTransactionsBuffer[stateName] = mutableListOf<GetMonitorTransactionsV1ResponseTx>()
        this.watchedTransactionsSubs[stateName] = stateObservable.subscribe { update ->
            update.produced.forEach { newTx ->
                val txResponse = GetMonitorTransactionsV1ResponseTx(txCounter.toString(), newTx.toString())
                txCounter = txCounter.add(BigInteger.valueOf(1))
                logger.debug("Pushing new transaction for state '{}', index {}", stateName, txCounter)
                this.watchedTransactionsBuffer[stateName]?.add(txResponse)
            }
        }

        logger.info("Monitoring for state '{}' started.", stateName)
    }

    fun getTransactions() {
                val transactions = this.watchedTransactionsBuffer.getOrElse(stateName) { listOf<GetMonitorTransactionsV1ResponseTx>() }

    }

    fun clearTransactions() {
val transactions = this.watchedTransactionsBuffer.getOrElse(stateName) { mutableListOf<GetMonitorTransactionsV1ResponseTx>() }
        logger.debug("Transactions before remove", transactions.size)
        transactions.removeAll { it.index in indexesToRemove }
        logger.debug("Transactions after remove", transactions.size)
    }

    fun stopMonitor() {
this.watchedTransactionsSubs[stateName]?.unsubscribe()
        this.watchedTransactionsSubs.remove(stateName)
        this.watchedTransactionsBuffer.remove(stateName)
        logger.info("Monitoring for state '{}' stopped.", stateName)

    }
}

// TODO Look into this project for powering the connector of ours:
// https://github.com/180Protocol/codaptor
@Service
class ApiPluginLedgerConnectorCordaServiceImpl(
    // FIXME: We already have the code/annotations  set up "the spring boot way" so that credentials do not need
    // to be hardcoded like this. Not even sure if these magic strings here actually get used at all or if spring just
    // overwrites the bean property with whatever it constructed internally based on the configuration.
    // Either way, these magic strings gotta go.
    val rpc: NodeRPCConnection
) : ApiPluginLedgerConnectorCordaService {

    val clientMonitorStates = mutableMapOf<String, ClientStateMonitorSession>()
    // TODO - remove empty clients
    fun getClientMonitor(clientAppId: String) = this.clientMonitorStates.getOrPut(clientAppId) { ClientStateMonitorSession() }

    companion object {
        val logger = loggerFor<ApiPluginLedgerConnectorCordaServiceImpl>()

        // FIXME: do not recreate the mapper for every service implementation instance that we create...
        val mapper: ObjectMapper = jacksonObjectMapper()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)

        val writer: ObjectWriter = mapper.writer()

        val jsonJvmObjectDeserializer = JsonJvmObjectDeserializer()
    }

    @Scheduled(fixedDelay = 500)
    fun scheduleCleanDeadMonitorSessions(): Unit {
        logger.info("HODOR", watchedTransactionsBuffer.size)
    }

    fun dynamicInvoke(rpc: CordaRPCOps, req: InvokeContractV1Request): InvokeContractV1Response {
        @Suppress("UNCHECKED_CAST")
        val classFlowLogic = jsonJvmObjectDeserializer.getOrInferType(req.flowFullClassName) as Class<out FlowLogic<*>>
        val params = req.params.map { p -> jsonJvmObjectDeserializer.instantiate(p) }.toTypedArray()
        logger.info("params={}", params)

        val flowHandle = when (req.flowInvocationType) {
            FlowInvocationType.TRACKED_FLOW_DYNAMIC -> rpc.startTrackedFlowDynamic(classFlowLogic, *params)
            FlowInvocationType.FLOW_DYNAMIC -> rpc.startFlowDynamic(classFlowLogic, *params)
        }

        val timeoutMs: Long = req.timeoutMs?.toLong() ?: 60000
        logger.debug("Invoking flow with timeout of $timeoutMs ms ...")
        val progress: List<String> = when (req.flowInvocationType) {
            FlowInvocationType.TRACKED_FLOW_DYNAMIC -> (flowHandle as FlowProgressHandle<*>)
                .progress
                .toList()
                .toBlocking()
                .first()
            FlowInvocationType.FLOW_DYNAMIC -> emptyList()
        }
        logger.debug("Starting to wait for flow completion now...")
        val returnValue = flowHandle.returnValue.get(timeoutMs, TimeUnit.MILLISECONDS)
        val id = flowHandle.id

        // allow returnValue to be something different to SignedTransaction
        var callOutput: kotlin.Any = ""
        var transactionId: kotlin.String? = null

        if (returnValue is SignedTransaction) {
            logger.trace("returnValue is SignedTransaction - using returnValue.id.toString() ...");
            transactionId = returnValue.id.toString();

            callOutput = mapOf(
                "tx" to mapOf(
                    "id" to returnValue.tx.id,
                    "notary" to returnValue.tx.notary,
                    "requiredSigningKeys" to returnValue.tx.requiredSigningKeys,
                    "merkleTree" to returnValue.tx.merkleTree,
                    "privacySalt" to returnValue.tx.privacySalt,
                    "attachments" to returnValue.tx.attachments,
                    "commands" to returnValue.tx.commands,
                    // "digestService" to returnValue.tx.digestService,
                    "inputs" to returnValue.tx.inputs,
                    "networkParametersHash" to returnValue.tx.networkParametersHash,
                    "references" to returnValue.tx.references,
                    "timeWindow" to returnValue.tx.timeWindow
                ),
                "id" to returnValue.id,
                "inputs" to returnValue.inputs,
                "networkParametersHash" to returnValue.networkParametersHash,
                "notary" to returnValue.notary,
                "references" to returnValue.references,
                "requiredSigningKeys" to returnValue.requiredSigningKeys,
                "sigs" to returnValue.sigs
            );

        } else if (returnValue != null) {
            callOutput = try {
                val returnValueJson = writer.writeValueAsString(returnValue);
                logger.trace("returnValue JSON serialized OK, using returnValue ...");
                returnValueJson;
            } catch (ex: Exception) {
                logger.trace("returnValue JSON serialized failed, using returnValue.toString() ...");
                returnValue.toString();
            }
        }

        logger.info("Progress(${progress.size})={}", progress)
        logger.info("ReturnValue={}", returnValue)
        logger.info("Id=$id")
        // FIXME: If the full return value (SignedTransaction instance) gets returned as "returnValue"
        // then Jackson crashes like this:
        // 2021-03-01 06:58:25.608 ERROR 7 --- [nio-8080-exec-7] o.a.c.c.C.[.[.[/].[dispatcherServlet]:
        // Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception
        // [Request processing failed; nested exception is org.springframework.http.converter.HttpMessageNotWritableException:
        // Could not write JSON: Failed to deserialize group OUTPUTS_GROUP at index 0 in transaction:
        // net.corda.samples.obligation.states.IOUState: Interface net.corda.core.contracts.LinearState
        // requires a field named participants but that isn't found in the schema or any superclass schemas;
        // nested exception is com.fasterxml.jackson.databind.JsonMappingException:
        // Failed to deserialize group OUTPUTS_GROUP at index 0 in transaction: net.corda.samples.obligation.states.IOUState:
        // Interface net.corda.core.contracts.LinearState requires a field named participants but that isn't found in
        // the schema or any superclass schemas (through reference chain:
        // org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Response["returnValue"]->
        // net.corda.client.jackson.internal.StxJson["wire"]->net.corda.client.jackson.internal.WireTransactionJson["outputs"])]
        // with root cause
        return InvokeContractV1Response(true, callOutput, id.toString(), transactionId, progress)
    }

    // FIXME - make it clear in the documentation that this deployment endpoint is not recommended for production
    // because it does not support taking all the precautionary steps that are recommended by the official docs here
    // https://docs.corda.net/docs/corda-enterprise/4.6/node-upgrade-notes.html#step-1-drain-the-node
    // The other solution is of course to make it so that this endpoint is a fully fledged, robust, production ready
    // implementation and that would be preferred over the longer term, but maybe it's actually just scope creep...
    override fun deployContractJarsV1(deployContractJarsV1Request: DeployContractJarsV1Request?): DeployContractJarsSuccessV1Response {
        if (deployContractJarsV1Request == null) {
            throw IllegalArgumentException("DeployContractJarsV1Request cannot be null")
        }
        try {
            val decoder = Base64.getDecoder()

            deployContractJarsV1Request.cordappDeploymentConfigs.forEachIndexed { index, cdc ->
                val cred = cdc.sshCredentials
                logger.debug("Creating new SSHClient object for CordappDeploymentConfig #$index...")
                val ssh = SSHClient()
                // FIXME we need to support host key verification as a minimum in order to claim that we
                // are secure by default
                // ssh.addHostKeyVerifier(cred.hostKeyEntry)
                ssh.addHostKeyVerifier(PromiscuousVerifier())

                logger.debug("Connecting with new SSHClient object for CordappDeploymentConfig #$index...")
                val maxTries = 10;
                val tryIntervalMs = 1000L;
                var tries = 0

                // TODO: pull this out to be a class level function instead of an inline one
                fun tryConnectingToSshHost () {
                    tries++
                    try {
                        ssh.connect(cred.hostname, cred.port)
                    } catch (ex: TransportException) {
                        if (tries < maxTries) {
                            Thread.sleep(tryIntervalMs)
                            tryConnectingToSshHost()
                        } else {
                            throw RuntimeException("Fed up after $maxTries retries while connecting to SSH host:", ex)
                        }
                    }
                }
                tryConnectingToSshHost()

                try {
                    // FIXME - plain text passwords sent in in the request is the worst possible solution (but was also
                    // the one that we could quickly get to work with)
                    // Need to implement public key authentication, also need to support pulling credentials from the keychain
                    // at least support pulling the private key being retrieved from the keychain and also to be specified
                    // as a file on the node's file system and also as an environment variable.
                    // Also need to document which one of these options is the most secure and that one has to be the default
                    // so that we are adhering to the "secure by default" design principle of ours.
                    ssh.auth(cred.username, AuthPassword(PasswordUtils.createOneOff(cred.password.toCharArray())))

                    logger.debug("Deploying to Node {} at host {}:{}:{}", index, cred.hostname, cred.port, cdc.cordappDir)

                    try {
                        val nodeRPCConnection = NodeRPCConnection(
                            cdc.rpcCredentials.hostname,
                            cdc.rpcCredentials.username,
                            cdc.rpcCredentials.password,
                            cdc.rpcCredentials.port
                        )

                        nodeRPCConnection.initialiseNodeRPCConnection()
                        nodeRPCConnection.gracefulShutdown()

                    } catch (ex: Exception) {
                        throw RuntimeException("Failed to gracefully shut down the node prior to cordapp deployment onto ${cred.hostname}:${cred.port}:${cdc.cordappDir}", ex)
                    }

                    try {
                        deployContractJarsV1Request.jarFiles.map {
                            val jarFileString = decoder.decode(it.contentBase64)

                            // TODO refactor this: write an actual class that implements the interface and then use that
                            // instead of creating anonymous classes inline...
                            val localSourceFile = object : InMemorySourceFile() {

                                private val filename = it.filename
                                private val contentBase64 = it.contentBase64
                                private val byteArray: ByteArray = decoder.decode(contentBase64)
                                private val inputStream: InputStream

                                init {
                                    inputStream = byteArray.inputStream()
                                }

                                override fun getName(): String {
                                    return filename
                                }

                                override fun getLength(): Long {
                                    val jarFileLength = byteArray.size.toLong()
                                    logger.debug("jarFileLength: $jarFileLength for $filename")
                                    return jarFileLength
                                }

                                override fun getInputStream(): InputStream {
                                    return inputStream
                                }
                            }

                            val taskDescription = "SCP upload ${it.filename} (size=${jarFileString.size}) onto ${cred.hostname}:${cred.port}:${cdc.cordappDir}"
                            logger.debug("Starting $taskDescription")
                            ssh.newSCPFileTransfer().upload(localSourceFile, cdc.cordappDir)
                            logger.debug("Finished $taskDescription")

                            if (it.hasDbMigrations) {
                                logger.debug("${it.filename} has db migrations declared, executing those now...")
                                val session = ssh.startSession()
                                session.allocateDefaultPTY()
                                val migrateCmd = "java -jar ${cdc.cordaJarPath} run-migration-scripts --app-schemas --base-directory=${cdc.nodeBaseDirPath}"
                                logger.debug("migrateCmd=$migrateCmd")
                                val migrateCmdRes = session.exec(migrateCmd)
                                val migrateCmdOut = net.schmizz.sshj.common.IOUtils.readFully(migrateCmdRes.inputStream).toString()
                                logger.debug("migrateCmdOut=${migrateCmdOut}")
                                session.close()
                                logger.debug("Closed the db migrations CMD SSH session successfully.")
                            }
                            it.filename
                        }
                    } catch (ex: Exception) {
                        throw RuntimeException("Failed to upload jars to corda node.", ex)
                    }

                    val session: Session = ssh.startSession()
                    try {
                        val startNodeTask = "Starting of Corda node ${cred.hostname}:${cred.port} with CMD=${cdc.cordaNodeStartCmd}"
                        logger.debug("$startNodeTask ...")
                        session.allocateDefaultPTY()
                        val startNodeRes = session.exec(cdc.cordaNodeStartCmd)
                        val startNodeOut = net.schmizz.sshj.common.IOUtils.readFully(startNodeRes.inputStream).toString()
                        logger.debug("$startNodeTask successfully finished with: {}", startNodeOut)
                    } catch (ex: Exception) {
                        throw RuntimeException("Failed to start the node after the cordapp deployment onto ${cred.hostname}:${cred.port}:${cdc.cordappDir}", ex)
                    } finally {
                        try {
                            session.close()
                            logger.debug("Closed Corda Start CMD SSH session successfully.")
                        } catch (e: IOException) {
                            logger.warn("SSH session failed to close, but this might be normal based on the SSHJ docs/examples: ", e)
                        }
                    }
                } finally {
                    logger.debug("Disconnecting from SSH host ${cred.hostname}:${cred.port}...")
                    try {
                        ssh.disconnect()
                        logger.debug("Disconnected OK from SSH host ${cred.hostname}:${cred.port}")
                    } catch (ex: Exception) {
                        logger.warn("Disconnect failed from SSH host ${cred.hostname}:${cred.port}. Ignoring since we are done anyway...")
                    }
                }
            }
            val deployedJarFileNames = deployContractJarsV1Request.jarFiles.map {
                val jarFileInputStream = decoder.decode(it.contentBase64).inputStream()
                jsonJvmObjectDeserializer.jcl.add(jarFileInputStream)
                logger.info("Added jar to classpath of Corda Connector Plugin Server: ${it.filename}")
                it.filename
            }

            return DeployContractJarsSuccessV1Response(deployedJarFileNames)
        } catch (ex: Throwable) {
            logger.error("Failed to serve DeployContractJarsV1Request", ex)
            throw ex
        }
    }

    override fun diagnoseNodeV1(diagnoseNodeV1Request: DiagnoseNodeV1Request?): DiagnoseNodeV1Response {
        val reader = mapper.readerFor(object : TypeReference<NodeDiagnosticInfo?>() {})

        val nodeDiagnosticInfoCorda = rpc.proxy.nodeDiagnosticInfo()

        val json = writer.writeValueAsString(nodeDiagnosticInfoCorda)
        logger.debug("NodeDiagnosticInfo JSON=\n{}", json)

        val nodeDiagnosticInfoCactus = reader.readValue<NodeDiagnosticInfo>(json)
        logger.debug("Responding with marshalled ${NodeDiagnosticInfo::class.qualifiedName}: {}", nodeDiagnosticInfoCactus)
        return DiagnoseNodeV1Response(nodeDiagnosticInfo = nodeDiagnosticInfoCactus)
    }

    override fun getPrometheusMetricsV1(): String {
        TODO("Not yet implemented")
    }

    override fun invokeContractV1(invokeContractV1Request: InvokeContractV1Request?): InvokeContractV1Response {
        Objects.requireNonNull(invokeContractV1Request, "InvokeContractV1Request must be non-null!")
        return dynamicInvoke(rpc.proxy, invokeContractV1Request!!)
    }

    override fun listFlowsV1(listFlowsV1Request: ListFlowsV1Request?): ListFlowsV1Response {
        val flows = rpc.proxy.registeredFlows()
        return ListFlowsV1Response(flows)
    }

    override fun networkMapV1(body: Any?): List<NodeInfo> {
        val reader = mapper.readerFor(object : TypeReference<List<NodeInfo?>?>() {})

        val networkMapSnapshot = rpc.proxy.networkMapSnapshot()
        val networkMapJson = writer.writeValueAsString(networkMapSnapshot)
        logger.trace("networkMapSnapshot=\n{}", networkMapJson)

        val nodeInfoList = reader.readValue<List<NodeInfo>>(networkMapJson)
        logger.info("Returning {} NodeInfo elements in response.", nodeInfoList.size)
        return nodeInfoList
    }

    /**
     * Start monitoring state changes for clientAppID of stateClass specified in the request body.
     */
    override fun startMonitorV1(req: StartMonitorV1Request?): StartMonitorV1Response {
        val clientAppId = req?.clientAppId
        val stateName = req?.stateFullClassName

        if (clientAppId.isNullOrEmpty()) {
            logger.info("Request rejected because missing client app ID")
            return StartMonitorV1Response(false)
        }

        if (stateName.isNullOrEmpty()) {
            logger.info("Request rejected because missing state class name")
            return StartMonitorV1Response(false)
        }

        getClientMonitor(clientAppId).startMonitor(stateName)

        return StartMonitorV1Response(true)
    }

    /**
     * Read all transactions that were not read by it's client yet.
     * Must be called after startMonitorV1 and before stopMonitorV1.
     * Transactions buffer must be explicitly cleared with clearMonitorTransactionsV1
     */
    override fun getMonitorTransactionsV1(req: GetMonitorTransactionsV1Request?): GetMonitorTransactionsV1Response {
        val clientAppId = req?.clientAppId
        val stateName = req?.stateFullClassName

        if (clientAppId.isNullOrEmpty()) {
            logger.info("Request rejected because missing client app ID")
            return GetMonitorTransactionsV1Response("", listOf())
        }

        if (stateName.isNullOrEmpty()) {
            logger.info("Request rejected because missing state class name")
            return GetMonitorTransactionsV1Response("", listOf())
        }

        val transactions = getClientMonitor(clientAppId).getTransactions(stateName)
        logger.debug("Returning {} transaction to the caller", transactions.size)
        return GetMonitorTransactionsV1Response(stateName, transactions)
    }

    /**
     * Clear monitored transactions based on index from internal client buffer.
     * Any future call to getMonitorTransactionsV1 will not return transactions removed by this call.
     */
    override fun clearMonitorTransactionsV1(req: ClearMonitorTransactionsV1Request?): ClearMonitorTransactionsV1Response {
        val clientAppId = req?.clientAppId
        val stateName = req?.stateFullClassName
        val indexesToRemove = req?.txIndexes

        if (clientAppId.isNullOrEmpty()) {
            logger.info("Request rejected because missing client app ID")
            return ClearMonitorTransactionsV1Response(false)
        }

        if (stateName.isNullOrEmpty()) {
            logger.info("Request rejected because missing state class name")
            return ClearMonitorTransactionsV1Response(false)
        }

        if (indexesToRemove.isNullOrEmpty()) {
            logger.info("No indexes to remove")
            return ClearMonitorTransactionsV1Response(true)
        }

        getClientMonitor(clientAppId).clearTransactions(stateName, indexesToRemove)
        return ClearMonitorTransactionsV1Response(true)
    }

    /**
     * Stop monitoring state changes for clientAppID of stateClass specified in the request body.
     * Removes all transactions that were not read yet, unsubscribes from the monitor.
     */
    override fun stopMonitorV1(req: StopMonitorV1Request?): StopMonitorV1Response {
        val clientAppId = req?.clientAppId
        val stateName = req?.stateFullClassName

        if (clientAppId.isNullOrEmpty()) {
            logger.info("Request rejected because missing client app ID")
            return StopMonitorV1Response(false)
        }

        if (stateName.isNullOrEmpty()) {
            logger.info("Request rejected because missing state class name")
            return StopMonitorV1Response(false)
        }

        getClientMonitor(clientAppId).stopMonitor(stateName)
        return StopMonitorV1Response(true)
    }
}
