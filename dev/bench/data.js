window.BENCHMARK_DATA = {
  "lastUpdate": 1712574761346,
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
          "id": "79517848d3adc02a2dba4e3b310b44e8eacb8ef6",
          "message": "ci(github): refactor ActionLint job to use the official installer\n\n1. Previously we just winged it with a bash script downloading another\nbash script to unzip the actionlint binaries.\n2. From now on we'll use the GitHub action from the marketplace which\nhas a lot of configuration options exposed in a convenient way such as\nwhat type of warnings to ignore, what version of actionlint to install,\netc.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-04-04T03:19:17-07:00",
          "tree_id": "b4fe749e7d03f98b78f26959af44721300ded29f",
          "url": "https://github.com/outSH/cactus/commit/79517848d3adc02a2dba4e3b310b44e8eacb8ef6"
        },
        "date": 1712227020562,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 583,
            "range": "±1.83%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 361,
            "range": "±1.28%",
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
          "id": "afce15529ec97541ed76493e0e428ee2db045f7e",
          "message": "docs(examples): fix supply-chain container image - swap tee with sponge\n\n1. It appears to be some kind of race condition in the series of jq\ncommand we use to update the package.json file with resolution overrides.\n2. The supporting information for the above theory is that the image build\nwould fail at different jq invocations on sub-sequent build tries that had\nno changes between them.\n3. Sponge is designed for the use-case of in-place file editing and therefore\n`tee` is the likely culprit but we don't have a full explanation to the why\nquite yet.\n4. It is also not known how this issue manifested after the latest set of\nfixes were tested and verified back when the pull request was made:\nhttps://github.com/hyperledger/cacti/pull/3059/commits\n5. The current code builds successfully with or without the NPM_PKG_VERSION\noverride. One of the commands we used to test that it works was this:\n```sh\nDOCKER_BUILDKIT=1 docker build \\\n    --build-arg=\"NPM_PKG_VERSION=2.0.0-2945-supply-chain-app-build-failed.241+b2c306ea0\" \\\n    --file ./examples/cactus-example-supply-chain-backend/Dockerfile \\\n    . \\\n    --tag scaeb\n```\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-04-08T01:07:31-07:00",
          "tree_id": "fd1a6fb8ef305a6ff61a59e4047f1f9709a9ac02",
          "url": "https://github.com/outSH/cactus/commit/afce15529ec97541ed76493e0e428ee2db045f7e"
        },
        "date": 1712574759342,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 584,
            "range": "±1.81%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 365,
            "range": "±1.15%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}