#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

ROOT_DIR="../.." # Path to cactus root dir
CONFIG_VOLUME_PATH="./etc/cactus" # Docker volume with shared configuration
WAIT_TIME=10 # How often to check container status

export CACTUS_SAWTOOTH_LEDGER_CONTAINER_NAME="sawtooth_all_in_one_ledger_1x"

function start_ethereum_testnet() {
    pushd "${ROOT_DIR}/tools/docker/geth-testnet"
    ./script-start-docker.sh
    popd
}

function copy_ethereum_validator_config() {
    echo ">> copy_ethereum_validator_config()"
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-go-ethereum-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio/"
    echo ">> copy_ethereum_validator_config() done."
}

function start_sawtooth_testnet() {
    pushd "${ROOT_DIR}/tools/docker/sawtooth-all-in-one"
    ./script-start-docker.sh
    popd

    # Wait for fabric cotnainer to become healthy
    health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CACTUS_SAWTOOTH_LEDGER_CONTAINER_NAME})"
    while ! [ "${health_status}" == "healthy" ]
    do
        echo "Waiting for sawtooth container... current status => ${health_status}"
        sleep $WAIT_TIME
        health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CACTUS_SAWTOOTH_LEDGER_CONTAINER_NAME})"
    done
    echo ">> Sawtooth ${CACTUS_FABRIC_ALL_IN_ONE_VERSION} started."
}

function copy_sawtooth_validator_config() {
    echo ">> copy_sawtooth_validator_config()"
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-sawtooth-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-sawtooth-socketio/"
    echo ">> copy_sawtooth_validator_config() done."
}

function start_ledgers() {
    # Clear ./etc/cactus
    mkdir -p "${CONFIG_VOLUME_PATH}/"
    rm -fr ${CONFIG_VOLUME_PATH}/*

    # Copy cmd-socketio-config
    cp -f ./config/*.yaml "${CONFIG_VOLUME_PATH}/"

    # Start Ethereum
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio"
    start_ethereum_testnet
    copy_ethereum_validator_config

    # Start Sawtooth
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-sawtooth-socketio"
    start_sawtooth_testnet
    copy_sawtooth_validator_config
}

start_ledgers
echo "All Done."
