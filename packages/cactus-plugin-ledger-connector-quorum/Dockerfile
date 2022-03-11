FROM node:16

ENV QUORUM_LP_PATH=/opt/cactus-plugin-ledger-connector-quorum
ENV QUORUM_LOG_LEVEL="debug"
ENV QUORUM_RPC_HTTP_HOST="http://localhost:8545"
ENV QUORUM_RPC_WS_HOST="ws://localhost:8546"

WORKDIR ${QUORUM_LP_PATH}

# CMake is required by one of npm dependencies (install other packages in this step as well in the future)
RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

COPY ./package.json ./
RUN yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist

EXPOSE 9113
CMD ["node", "./dist/lib/docker-main.js"]
