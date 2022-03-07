# Copyright 2019-2022 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0

echo "[process] start docker environment for Go-Ethereum testnet"
docker network create geth1net
docker-compose build
docker-compose up -d
