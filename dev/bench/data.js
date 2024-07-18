window.BENCHMARK_DATA = {
  "lastUpdate": 1721302484464,
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
        "date": 1718360313018,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 759,
            "range": "±2.79%",
            "unit": "ops/sec",
            "extra": "181 samples"
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
          "id": "fa6cb101e599158cab34824f438fe2875e80be1b",
          "message": "docs(RELEASE_MANAGEMENT): explain auto-merge for release PRs is a no-no\n\nThe detailed explanation is here:\n\nDo not enable auto-merging on GitHub for the pull request doing the release.\nThe problem with auto-merging here is that it would modify the release commit's SHA as the\nrebase would happen on GitHub's servers where your git signing identity is not available to use\ngiven that GitHub does (should) not have access to your private key for signing.\nThe way the preserve your commit signature as valid the commit SHA must remain the same and the\nway to achieve this is to perform the pull request merging with fast forward. The merging\nensures that there is no commit SHA change and the `--ff-only` option ensures that there is no\nmerge commit to throw a wrench in the process.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-19T00:05:22-07:00",
          "tree_id": "93d83f51f62c2c03750a9fbf0b3a8a0584050e6d",
          "url": "https://github.com/outSH/cactus/commit/fa6cb101e599158cab34824f438fe2875e80be1b"
        },
        "date": 1718798390102,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 750,
            "range": "±2.67%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "michal.bajer@fujitsu.com",
            "name": "Michal Bajer",
            "username": "outSH"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "8c030ae9e739a28ff0900f7af27ec0fbbb4b7ff9",
          "message": "feat(fabric-connector): add getChainInfo, improve getBlock output\n\n- Add new method `getChainInfo` for quering chain information from qscc.\n- Add `GetChainInfoEndpointV1` to allow calling `getChainInfo` remotely.\n- Refactor `getBlock` so it can return same custom block formats\n  as `WatchBlocks`. Default remains the same (full decode block).\n  BREAKING CHANGE: It accepts `type` instead of `skipDecode` flag.\n- Move common block formatting logic to `cacti-block-formatters.ts`.\n- Add tests for new features. Move test common to quering `qscc` to single file\n  to increase CI speed.\n\nSigned-off-by: Michal Bajer <michal.bajer@fujitsu.com>",
          "timestamp": "2024-07-04T10:38:37-07:00",
          "tree_id": "bd2aa3e8814245fadefd516c8f9e6c4b73a0644d",
          "url": "https://github.com/outSH/cactus/commit/8c030ae9e739a28ff0900f7af27ec0fbbb4b7ff9"
        },
        "date": 1720179031291,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 563,
            "range": "±1.65%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 348,
            "range": "±1.34%",
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
          "id": "02efca018a962bbbf480d2d7d98e29bc3879c195",
          "message": "build(docs/examples): add yarn patch to @ionic deps of example frontend\n\n1. The `main` field of the package.json of these two packages were invalid\nbecause the `main` field was set to `bundle.js` but that file is actually\nunder `ngx/bundle.js` within the package directory and therefore the value\nof it originally was invalid that caused warnings in our tooling.\n2. By using the yarn **patch** feature we overcame this problem by modifying\nthe sources of the dependencies in question: `@ionic-native/splash-screen` and\n`@ionic-native/status-bar`\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-05T19:29:12-07:00",
          "tree_id": "77847aca1aabd476926837cdbabc3436914f3835",
          "url": "https://github.com/outSH/cactus/commit/02efca018a962bbbf480d2d7d98e29bc3879c195"
        },
        "date": 1720430607539,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 588,
            "range": "±1.65%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 357,
            "range": "±1.22%",
            "unit": "ops/sec",
            "extra": "181 samples"
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
          "id": "5d7ec2985d2d0aed10c5f0915c6081c755bc99a7",
          "message": "ci(connector-corda): fix insufficient disk space errors\n\nWe have the disk clean-up in the CI off by default because it takes a few\nminutes to perform and most jobs don't need it, but for Corda it seems\nnecessary because our tests started failing with the message below\n(lines wrapped to make sure we don't run over the 100 character limit\nfor the git commit message)\n\ncactus-corda-4-8-all-in-one-flowdb:2024-07-08-hotfix-1]\n[WARN] 09:48:28+0000 [Thread-2\n(ActiveMQ-server-org.apache.activemq.artemis.core.server.impl.ActiveMQServerImpl$6@11a43807)]\ncore.server. -\nAMQ222210: Free storage space is at 145.7MB of 77.9GB total. Usage rate is 99.8% which is\nbeyond the configured <max-disk-usage>. System will start blocking producers.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-11T21:54:20-07:00",
          "tree_id": "76f975422b6bbe5c840bd589b87f9afe373f5b19",
          "url": "https://github.com/outSH/cactus/commit/5d7ec2985d2d0aed10c5f0915c6081c755bc99a7"
        },
        "date": 1720778129490,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 608,
            "range": "±1.64%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 372,
            "range": "±1.32%",
            "unit": "ops/sec",
            "extra": "182 samples"
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
          "id": "497ea3226631fdcad763e6281ee058d91ca01988",
          "message": "test(test-tooling): add container image builder utilities\n\n1. Currently our integration tests depend on pre-published container\nimages to be on the official registry (ghcr.io). This has pros and cons.\nThe pro is that we can pin the tests to a specific ledger version and\nthen have confidence that the test code works with that specific image.\nOn the other hand if the image itself has problems we won't know it until\nafter it was published and then tests were executed with it (unless we\nperform manual testing which is a lot of effrot as it requires the\nmanual modification of the test cases).\n2. In order to gives us the ability to test against the container image\ndefinitions as they are in the current revision of the source code,\nwe are adding here a couple of utility functions to streamline writing\ntest cases that build the container images for themselves as part of the\ntest case.\n\nAn example of how to use it in a test case:\n\n```typescript\nconst imgConnectorJvm = await buildImageConnectorCordaServer({\n    logLevel,\n});\n\n// ...\n\nconnector = new CordaConnectorContainer({\n    logLevel,\n    imageName: imgConnectorJvm.imageName,\n    imageVersion: imgConnectorJvm.imageVersion,\n    envVars: [envVarSpringAppJson],\n});\n\n```\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-17T17:31:23-07:00",
          "tree_id": "59d3d8a612cce5ee7e4b23eb014491baec319e68",
          "url": "https://github.com/outSH/cactus/commit/497ea3226631fdcad763e6281ee058d91ca01988"
        },
        "date": 1721302483170,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 589,
            "range": "±1.57%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 358,
            "range": "±1.54%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}