window.BENCHMARK_DATA = {
  "lastUpdate": 1716472951081,
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
      }
    ]
  }
}