FROM ethereum/client-go:v1.8.27

COPY ./data-geth1 /root/.ethereum
WORKDIR /root/.ethereum
RUN [ "geth", "init", "./genesis.json" ]

EXPOSE 8545

# Healtcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=6 \
  CMD wget -O- \
  --header="Content-Type: application/json" \
  --post-data '{"method":"eth_getBlockByNumber","params":["latest", false], "id":1, "jsonrpc":"2.0"}' \
  http://0.0.0.0:8545

ENTRYPOINT [ "geth" ]
CMD [ "--rpc", \
  "--networkid", "10" , \
  "--nodiscover", \
  "--datadir=/root/.ethereum", \
  "--rpcaddr", "0.0.0.0", \
  "--rpcport", "8545", \
  "--rpccorsdomain", "*", \
  "--rpcvhosts", "*", \
  "--rpcapi", "eth,web3", \
  "--unlock", "0,1,2,3,4", \
  "--password", "/dev/null", \
  "--gasprice", "0", \
  "--mine", \
  "--minerthreads=1" ]
