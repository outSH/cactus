FROM rust:1.71-alpine as builder

RUN apk update \
  && apk add --no-cache \
  git \
  musl-dev \
  openssl-dev

WORKDIR "/build"
RUN git clone --depth 1 -b iroha2-lts https://github.com/hyperledger/iroha.git .
# Reset to LTS state as of 26.07.2023
RUN git reset 9273a912c8a97f9ce1bfaa302c7192554f7abf00 --hard

RUN cargo build -p iroha_client_cli

FROM docker:24.0.2-dind

ENV APP_ROOT="/app"

# Install docker-compose
RUN apk update \
  && apk add --no-cache \
  docker-cli \
  docker-cli-compose \
  supervisor \
  jq

# Copy iroha_client_cli binary
COPY --from=builder /build/target/debug/iroha_client_cli /bin/iroha_client_cli
RUN chmod +x /bin/iroha_client_cli

# Setup healtcheck
COPY ./healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=60 CMD /bin/healthcheck

WORKDIR ${APP_ROOT}

# Copy Iroha 2 test network sources
COPY ./src .

# Peer0 API
EXPOSE 8080
# Peer0 telemetry
EXPOSE 8180

# Iroha LTS image digests as of 26.07.2023
ENV IROHA_IMAGE_DIGEST="sha256:57d8d2c8dd5ead90200f365be6809b995ecfad14a77796b9f6de1e32d0da62a3"

# Setup supervisor entrypoint
COPY supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
