################################
# STAGE 1
# Setup quorum-dev-quickstart
################################

FROM node:18.17.0 AS quorum-dev-quickstart-setup

ENV QUORUM_QUICKSTART_VERSION=0.1.5
ENV ROOT_DIR=/opt/quorum-dev-quickstart

WORKDIR "${ROOT_DIR}"
RUN npm install -g "quorum-dev-quickstart@${QUORUM_QUICKSTART_VERSION}"
RUN quorum-dev-quickstart --clientType besu --outputPath ./ --monitoring default --privacy true --orchestrate false

################################
# STAGE 2
# docker compose base
################################

FROM docker:24.0.5-dind

ENV ROOT_DIR=/opt/quorum-dev-quickstart

WORKDIR /

RUN addgroup -g 1000 quorum \
  && adduser -u 1000 -G quorum -g docker -s /bin/sh -D quorum \
  && addgroup docker \
  && addgroup quorum docker

RUN apk update

# Install dependencies of Docker Compose
RUN apk add docker-cli docker-cli-compose curl

# Need git to clone the sources of the Fabric Samples repository from GitHub
RUN apk add --no-cache git

# Fabric Samples needs bash, sh is not good enough here
RUN apk add --no-cache bash

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file

# Need NodeJS tooling for the Typescript contracts
RUN apk add --no-cache npm nodejs

# Needed because the Fabric binaries need the GNU libc dynamic linker to be executed
# and alpine does not have that by default
# @see https://askubuntu.com/a/1035037/1008695
# @see https://github.com/gliderlabs/docker-alpine/issues/219#issuecomment-254741346
RUN apk add --no-cache libc6-compat

RUN apk add --no-cache --update chromium

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
RUN mkdir -p $CACTUS_CFG_PATH
RUN apk add --no-cache augeas

# Configure the OpenSSH server we just installed
RUN augtool 'set /files/etc/ssh/sshd_config/AuthorizedKeysFile ".ssh/authorized_keys /etc/authorized_keys/%u"'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitRootLogin yes'
RUN augtool 'set /files/etc/ssh/sshd_config/PasswordAuthentication no'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitEmptyPasswords no'
RUN augtool 'set /files/etc/ssh/sshd_config/Port 22'
RUN augtool 'set /files/etc/ssh/sshd_config/LogLevel DEBUG2'
RUN augtool 'set /files/etc/ssh/sshd_config/LoginGraceTime 10'
# Create the server's key - without this sshd will refuse to start
RUN ssh-keygen -A

# Generate an RSA keypair on the fly to avoid having to hardcode one in the image
# which technically does not pose a security threat since this is only a development
# image, but we do it like this anyway.
RUN mkdir ~/.ssh
RUN chmod 700 ~/.ssh/
RUN touch ~/.ssh/authorized_keys
RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/besu-aio-image <<< y"]
RUN mv $CACTUS_CFG_PATH/besu-aio-image $CACTUS_CFG_PATH/besu-aio-image.key
RUN cp $CACTUS_CFG_PATH/besu-aio-image.pub ~/.ssh/authorized_keys

RUN apk add --no-cache util-linux

# FIXME - make it so that SSHd does not need this to work
RUN echo "root:$(uuidgen)" | chpasswd

# Copy quorum-dev-quickstart from the base
COPY --chown=quorum:quorum --from=quorum-dev-quickstart-setup "${ROOT_DIR}" "${ROOT_DIR}"
WORKDIR "${ROOT_DIR}"
COPY --chown=quorum:quorum env-config.ini .env

RUN apk add --no-cache supervisor
RUN apk add --no-cache ncurses

COPY healthcheck.sh /healthcheck.sh
COPY --chown=quorum:quorum supervisord.conf /etc/supervisord.conf

# # Extend the parent image's entrypoint
# # https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

HEALTHCHECK --interval=1s --timeout=5s --start-period=60s --retries=300 CMD /healthcheck.sh

# OpenSSH Server
EXPOSE 22

# Grafana
EXPOSE 3000

# RPC Node: HTTP, WebSocket Providers
EXPOSE 8545 8546

# supervisord web ui/dashboard
EXPOSE 9001

# Prometheus
EXPOSE 9090

# ETH signer proxy
EXPOSE 18545

# Besu member 1: HTTP; WebSocket Providers; Tessera
EXPOSE 20000 20001 9081

# Besu member 2: HTTP; WebSocket Providers; Tessera
EXPOSE 20002 20003 9082

# Besu member 3: HTTP; WebSocket Providers; Tessera
EXPOSE 20004 20005 9083

# Web block explorer
EXPOSE 25000
