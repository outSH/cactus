package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.contracts.ContractState
import net.corda.core.utilities.loggerFor
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1ResponseTx
import rx.Subscription
import java.math.BigInteger
import java.time.LocalDateTime

class StateMonitorClientSession(private val rpc: NodeRPCConnection, private val sessionExpireMinutes: Long) {
    data class StateMonitor(
        val stateChanges: MutableSet<GetMonitorTransactionsV1ResponseTx>,
        val subscription: Subscription
    )

    private val monitors = mutableMapOf<String, StateMonitor>()
    private var sessionExpireTime = LocalDateTime.now().plusMinutes(sessionExpireMinutes)

    companion object {
        val logger = loggerFor<StateMonitorClientSession>()
    }

    fun startMonitor(stateName: String, cordaState: Class<out ContractState>) {
        if (monitors.containsKey(stateName)) {
            logger.info("Monitoring of state {} is already running", stateName)
            return
        }

        // FIXME: "valutTrack(xxx).updates" occurs an error if Corda ledger has already over 200 transactions using the stateName that you set above.
        // Please refer to "https://r3-cev.atlassian.net/browse/CORDA-2956" to get more infomation.
        val stateObservable = this.rpc.proxy.vaultTrack(cordaState).updates
        var indexCounter = BigInteger.valueOf(0)
        val stateChanges = mutableSetOf<GetMonitorTransactionsV1ResponseTx>()
        val monitorSub = stateObservable.subscribe { update ->
            update.produced.forEach { change ->
                val txResponse = GetMonitorTransactionsV1ResponseTx(indexCounter.toString(), change.toString())
                indexCounter = indexCounter.add(BigInteger.valueOf(1))
                logger.debug("Pushing new transaction for state '{}', index {}", stateName, indexCounter)
                stateChanges.add(txResponse)
            }
        }
        monitors[stateName] = StateMonitor(stateChanges, monitorSub)
        logger.info("Monitoring for changes of state '{}' started.", stateName)
    }

    fun getTransactions(stateName: String) = monitors[stateName]?.stateChanges ?: mutableSetOf()

    fun clearTransactions(stateName: String, indexesToRemove: List<String>) {
        val transactions = this.getTransactions(stateName)
        logger.debug("Transactions before remove", transactions.size)
        transactions.removeAll { it.index in indexesToRemove }
        logger.debug("Transactions after remove", transactions.size)
    }

    fun stopMonitor(stateName: String) {
        monitors[stateName]?.subscription?.unsubscribe()
        monitors.remove(stateName)
        logger.info("Monitoring for state '{}' stopped.", stateName)
    }

    fun stopAllMonitors() {
        monitors.forEach { it.value.subscription.unsubscribe() }
        monitors.clear()
    }

    fun refreshExpireTime() {
        this.sessionExpireTime = LocalDateTime.now().plusMinutes(sessionExpireMinutes)
    }

    fun isExpired() = LocalDateTime.now().isAfter(sessionExpireTime)

    fun isValid(): Boolean {
        return monitors.isNotEmpty() || isExpired()
    }
}