<!--
 Copyright 2019-2020 Fujitsu Laboratories Ltd.
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# A tool to launch Go-Ethereum docker containers

## Abstract
- Modules to launch Go-Ethereum docker containers

## How to build
- Execute the following command, then the docker containers will be launched.
	```
	./script-start-docker.sh
	```
- If the following containers appear when you display the container list with the command `docker ps`, it will be fine.
	```
	CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS         PORTS                                                                       NAMES
	5d7b115557aa   geth-testnet   "geth --rpc --networ…"   36 minutes ago   Up 3 minutes   8546/tcp, 0.0.0.0:8545->8545/tcp, :::8545->8545/tcp, 30303/tcp, 30303/udp   geth1
	```

