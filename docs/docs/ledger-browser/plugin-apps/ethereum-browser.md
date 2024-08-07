# Ethereum Browser App

Application for browsing ledger state stored in a database by the Cacti Ethereum Persistence Plugin.

## Features
- Browse ledger blocks and transactions.
- View account transaction history.
- See ERC20 and ERC721 tokens owned by a specified account.

## Setup

### Persistence Plugin

#### Supabase

The persistence plugin requires a Supabase instance to save ledger data. You can use the same Supabase instance as for the GUI (but in a separate schema), or create a separate instance specifically for this plugin.

To set up the GUI app, you'll need a `Supabase URL`, `API key`, and the `Schema` under which the data resides in the database.

Additionally, you'll need a `PostgreSQL connection string` to start the persistence plugin.

#### Ethereum Ledger (Optional)

This step is optional as you can use any running Ethereum ledger. However, for testing purposes, you may use our [geth-all-in-one](../../../../tools/docker/geth-all-in-one/README.md). To start it, execute the following commands from the root of your project:

```shell
# Build
docker build ./tools/docker/geth-all-in-one/ -t cactus_geth_all_in_one

# Run
docker run --rm --name geth_aio_testnet --detach -p 8545:8545 -p 8546:8546 cactus_geth_all_in_one
```

### Persistence Plugin

Follow the instructions in the [plugin README file](../../../../packages/cactus-plugin-persistence-ethereum/README.md).

To quickly set up the plugin for your Ethereum ledger, run the sample setup script:

```shell
# Replace the environment variables with JSON-RPC WS url to your ledger and postgresql connection string to your database instance.
ETHEREUM_RPC_WS_HOST=ws://127.0.0.1:8546 SUPABASE_CONNECTION_STRING=postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres npm run sample-setup
```

## Configuration
- `supabaseUrl`: URL of your Supabase instance.
- `supabaseKey`: Supabase API key.
- `supabaseSchema`: Database schema under which Ethereum persistence tables were created.

### Sample Configuration

Uses a localhost `supabase-all-in-one` instance with data stored in the `ethereum` schema.

```json
{
  supabaseUrl: "http://localhost:8000",
  supabaseKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
  supabaseSchema: "ethereum",
}
```

## Test Data Setup

For GUI development, you don't need to start the persistence plugin. Instead, follow these steps to fill the database with sample data.

### Create database schema tables
- Copy the content of `packages/cactus-plugin-persistence-ethereum/src/main/sql/schema.sql` into `SQL Editor` of supabase and run the query.
- Alternatively, use `psql`:

``` shell
psql "postgresql://__CONNECTION_STRING_TO_DB__" -f packages/cactus-plugin-persistence-ethereum/src/test/sql/insert-test-data.sql
```

### Insert sample data
- Copy the content of `packages/cactus-plugin-persistence-ethereum/src/test/sql/insert-test-data.sql` into `SQL Editor` of supabase and run the query.
- Alternatively, use `psql`:

``` shell
psql "postgresql://__CONNECTION_STRING_TO_DB__" -f packages/cactus-plugin-persistence-ethereum/src/test/sql/insert-test-data.sql
```
