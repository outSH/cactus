FROM cactus-cmd-socketio-server:latest

ARG NPM_PKG_VERSION=latest

ENV APP_HOME=/root/cactus

WORKDIR ${APP_HOME}

COPY ./dist/yarn.lock ./package.json ./
COPY ./dist/validatorKey ./validatorKey
RUN yarn link "@hyperledger/cactus-cmd-socket-server" && \
    yarn add @hyperledger/cactus-verifier-client@${NPM_PKG_VERSION} --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist/

ENTRYPOINT ["node", "./dist/www.js"]
