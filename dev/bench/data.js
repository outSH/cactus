window.BENCHMARK_DATA = {
  "lastUpdate": 1717676236376,
  "repoUrl": "https://github.com/outSH/cactus",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "ff13f6a41ba3439d46f98e1423febfa56a4a0647",
          "message": "test(plugin-htlc-coordinator-besu): fix HSTS header assert lowercase\n\n1. The test seem to have been broken from the moment of the introduction\nof the HSTS header assertions.\n2. The HSTS headers should be managed on the API server level instead of\nindividual endpoints.\n3. I'll create a follow-up issue for working on this in a more generic\nway that gets HSTS headers in place across the board and also in a way\nthat these are configurable for scenarios when the users don't want them.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-22T20:14:21-07:00",
          "tree_id": "a8247220f28d9dc40276bdeacc1c1c370828a0b3",
          "url": "https://github.com/outSH/cactus/commit/ff13f6a41ba3439d46f98e1423febfa56a4a0647"
        },
        "date": 1716471841193,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 554,
            "range": "±1.82%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 341,
            "range": "±1.31%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "ff13f6a41ba3439d46f98e1423febfa56a4a0647",
          "message": "test(plugin-htlc-coordinator-besu): fix HSTS header assert lowercase\n\n1. The test seem to have been broken from the moment of the introduction\nof the HSTS header assertions.\n2. The HSTS headers should be managed on the API server level instead of\nindividual endpoints.\n3. I'll create a follow-up issue for working on this in a more generic\nway that gets HSTS headers in place across the board and also in a way\nthat these are configurable for scenarios when the users don't want them.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-22T20:14:21-07:00",
          "tree_id": "a8247220f28d9dc40276bdeacc1c1c370828a0b3",
          "url": "https://github.com/outSH/cactus/commit/ff13f6a41ba3439d46f98e1423febfa56a4a0647"
        },
        "date": 1716472948263,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 688,
            "range": "±2.65%",
            "unit": "ops/sec",
            "extra": "177 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "fazzatti@gmail.com",
            "name": "Fabricius Zatti",
            "username": "fazzatti"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "e1d86c3e3f07dcf7f09d0957a75678c6cccc2819",
          "message": "build(connector-stellar): add a deploy contract endpoint\n\n- Add a Stellar Connector plugin following the same pattern as the **Besu Connector plugin**.\n- Add a deploy contract endpoint to the Stellar Connector plugin.\n\n**Initialization remarks:**\nSupports a network configuration object to define all integration services that seamlessly\nintegrate with the Stellar test ledger within the Cacti test tooling.\n\n**Deploy remarks:**\nThe deploy process supports both the compiled smart contract WASM as well as the on-chain WASM\nhash as inputs. This follows the smart contract deployment design on Soroban\n(Stellar's smart contract platform). Refer to the Stellar documentation at:\nhttps://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/contracts\nfor further detail on this process.\n\nMore details can be found in the `README.md` file under the connector root directory.\n\nSigned-off-by: Fabricius Zatti <fazzatti@gmail.com>",
          "timestamp": "2024-06-03T09:24:08-07:00",
          "tree_id": "69b33b9ddae240a8170b8d277f42ff0b643206eb",
          "url": "https://github.com/outSH/cactus/commit/e1d86c3e3f07dcf7f09d0957a75678c6cccc2819"
        },
        "date": 1717675341197,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 573,
            "range": "±1.71%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 354,
            "range": "±1.36%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "fazzatti@gmail.com",
            "name": "Fabricius Zatti",
            "username": "fazzatti"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "e1d86c3e3f07dcf7f09d0957a75678c6cccc2819",
          "message": "build(connector-stellar): add a deploy contract endpoint\n\n- Add a Stellar Connector plugin following the same pattern as the **Besu Connector plugin**.\n- Add a deploy contract endpoint to the Stellar Connector plugin.\n\n**Initialization remarks:**\nSupports a network configuration object to define all integration services that seamlessly\nintegrate with the Stellar test ledger within the Cacti test tooling.\n\n**Deploy remarks:**\nThe deploy process supports both the compiled smart contract WASM as well as the on-chain WASM\nhash as inputs. This follows the smart contract deployment design on Soroban\n(Stellar's smart contract platform). Refer to the Stellar documentation at:\nhttps://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/contracts\nfor further detail on this process.\n\nMore details can be found in the `README.md` file under the connector root directory.\n\nSigned-off-by: Fabricius Zatti <fazzatti@gmail.com>",
          "timestamp": "2024-06-03T09:24:08-07:00",
          "tree_id": "69b33b9ddae240a8170b8d277f42ff0b643206eb",
          "url": "https://github.com/outSH/cactus/commit/e1d86c3e3f07dcf7f09d0957a75678c6cccc2819"
        },
        "date": 1717676234620,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 711,
            "range": "±2.73%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}