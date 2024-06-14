window.BENCHMARK_DATA = {
  "lastUpdate": 1718359507561,
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
          "id": "c18b3fc6b119785f2c92359d89b33b4fb92bd863",
          "message": "build: unpin OpenAPI specs from v2.0.0-alpha.2 URL refs, use REMOTE\n\nOn a high level this is a find & replace operation where the occurrences of the\nfirst bullet point were replaced with the second bullet point:\n* `\"$ref\": \"https://raw.githubusercontent.com/hyperledger/cactus/v2.0.0-alpha.2`\n* `\"$ref\": \"../../../../..`\n\nThe firs bullet point above is called a URL reference while the second one is\ncalled a REMOTE references (remote as in a different spec file on the file-system).\n\n1. With this change, we unlock the release process being able to issue code that\nis working on the latest OpenAPI specifications that we are cross-referencing\nfrom one package to another.\n2. Previously you had to manually update the references in about a hundred\nand fifty locations to make sure that the versions are bumped but after this\nchange this happens automatically as the newly introduced bundling process\nand the usage of the REMOTE references instead of URL references.\n3. The problem so far with the release process was that with the URL references\nwe dependended on the existence of a pushed git tag for a successful release build.\nBut we cannot git push the tag before having performed a successful release build,\nso this was a chicken-egg problem that had to be somehow untangled from its\ncircular dependency hell and this change is what makes it happen by no longer\ndepending on the git tags having been pushed to the upstream repository.\n\nRelated to, but does not yet fix: https://github.com/hyperledger/cacti/issues/2175\n\nDepends on #3288\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-14T01:28:00-07:00",
          "tree_id": "7b4ece36c7176aa4c7e8f0cfd4f3e493a0b498f4",
          "url": "https://github.com/outSH/cactus/commit/c18b3fc6b119785f2c92359d89b33b4fb92bd863"
        },
        "date": 1718359505469,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 565,
            "range": "±1.75%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 358,
            "range": "±1.43%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}