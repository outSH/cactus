package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.utilities.loggerFor
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import javax.annotation.PreDestroy

private const val SessionExpireMinutes = "cactus.sessionExpireMinutes"
private const val SessionExpireMinutesDefault = "30"
private const val SessionExpireCheckInterval: Long = 60 * 1000 // every minute

@Component
class StateMonitorQueuesManager(
    @Value("\${$SessionExpireMinutes:${SessionExpireMinutesDefault}}") val sessionExpireMinutes: Long,
    val rpc: NodeRPCConnection
) : AutoCloseable {
    companion object {
        val logger = loggerFor<StateMonitorQueuesManager>()
    }

    val clientSessions = mutableMapOf<String, StateMonitorClientSession>()

    @Scheduled(fixedDelay = SessionExpireCheckInterval)
    fun cleanInvalidClientSessions() {
        logger.info("Remove all invalid client sessions. Before - {}", clientSessions.size)
        clientSessions.entries.removeAll { !it.value.hasMonitorRunning() || it.value.isExpired() }
        logger.info("Remove all invalid client sessions. After - {}", clientSessions.size)
    }

    @PreDestroy
    override fun close() {
        logger.info("StateMonitorQueuesManager close - stop all running monitors.")
        clientSessions.forEach { it.value.close() }
    }

    final inline fun<T> withClient(clientAppId: String, block: StateMonitorClientSession.() -> T): T {
        // Get client session and update it's expire time
        val clientSession =
            this.clientSessions.getOrPut(clientAppId) { StateMonitorClientSession(rpc, sessionExpireMinutes) }
        clientSession.refreshExpireTime()

        // Run the caller logic on specific client session
        val results = clientSession.block()
        logger.debug("Monitor withClient block response:", results)

        // Check if client session still valid
        if (!clientSession.hasMonitorRunning()) {
            logger.info("Client session {} not valid anymore - remove.", clientAppId)
            this.clientSessions.remove(clientAppId)
        }

        return results
    }
}