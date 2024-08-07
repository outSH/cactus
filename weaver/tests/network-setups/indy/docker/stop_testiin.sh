# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

INDYNODES="${INDYNODES:-4}"
INDYCLIENTS="${INDYCLIENTS:-5}"

STARTPORT=9700
ENDPORT=$((($INDYNODES * 2) + $STARTPORT))

INDY_NODE_PORT_RANGE=$STARTPORT-$ENDPORT

INDYNODES=$INDYNODES INDYCLIENTS=$INDYCLIENTS INDY_NODE_PORT_RANGE=$INDY_NODE_PORT_RANGE docker compose down
