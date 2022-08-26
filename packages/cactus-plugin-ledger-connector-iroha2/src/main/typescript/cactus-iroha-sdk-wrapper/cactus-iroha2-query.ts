import safeStringify from "fast-safe-stringify";

import { Client } from "@iroha2/client";

import {
  DomainId,
  Expression,
  QueryBox,
  Value,
  FindDomainById,
  EvaluatesToDomainId,
  IdBox,
  AssetId,
  AccountId,
  AssetDefinitionId,
  FindAssetById,
  EvaluatesToAssetId,
  FindAssetDefinitionById,
  EvaluatesToAssetDefinitionId,
  FindAccountById,
  EvaluatesToAccountId,
  FindTransactionByHash,
  EvaluatesToHash,
} from "@iroha2/data-model";

import { Checks, Logger } from "@hyperledger/cactus-common";
import { hexToBytes } from "hada";

// TODO - pagination once supported by upstream
export class CactusIrohaV2QueryClient {
  constructor(
    private readonly irohaClient: Client,
    private readonly log: Logger,
  ) {
    this.log.debug("CactusIrohaV2QueryClient created.");
  }

  // Domains
  public async findAllDomains(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllDomains", null),
    );

    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`findAllDomains query error: ${safeStringify(error)}`);
      },
    });
    const domains = vectorResult.map((i) => i.as("Identifiable").as("Domain"));

    this.log.debug("findAllDomains:", domains);
    return domains;
  }

  public async findDomainById(domainName: string): Promise<unknown> {
    Checks.truthy(domainName, "findDomainById arg domainName");

    const result = await this.irohaClient.request(
      QueryBox(
        "FindDomainById",
        FindDomainById({
          id: EvaluatesToDomainId({
            expression: Expression(
              "Raw",
              Value(
                "Id",
                IdBox(
                  "DomainId",
                  DomainId({
                    name: domainName,
                  }),
                ),
              ),
            ),
          }),
        }),
      ),
    );

    const domain = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Domain"),
      Err: (error) => {
        throw new Error(
          `findDomainById query error: ${safeStringify(error.toJSON())}`,
        );
      },
    });

    this.log.debug("findDomainById:", domain);
    return domain;
  }

  // Assets
  public async findAssetDefinitionById(
    name: string,
    domainName: string,
  ): Promise<unknown> {
    Checks.truthy(name, "findAssetDefinitionById arg name");
    Checks.truthy(domainName, "findAssetDefinitionById arg domainName");

    const assetDefId = AssetDefinitionId({
      name: name,
      domain_id: DomainId({ name: domainName }),
    });

    const result = await this.irohaClient.request(
      QueryBox(
        "FindAssetDefinitionById",
        FindAssetDefinitionById({
          id: EvaluatesToAssetDefinitionId({
            expression: Expression(
              "Raw",
              Value("Id", IdBox("AssetDefinitionId", assetDefId)),
            ),
          }),
        }),
      ),
    );

    const assetDef = result.match({
      Ok: (res) => res.result.as("Identifiable").as("AssetDefinition"),
      Err: (error) => {
        throw new Error(
          `findAssetDefinitionById query error: ${safeStringify(error)}`,
        );
      },
    });

    this.log.debug("findAssetDefinitionById:", assetDef);
    return assetDef;
  }

  public async findAllAssetsDefinitions(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllAssetsDefinitions", null),
    );

    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(
          `findAllAssetsDefinitions query error: ${safeStringify(error)}`,
        );
      },
    });
    const assetDefs = vectorResult.map((d) =>
      d.as("Identifiable").as("AssetDefinition"),
    );

    this.log.debug("findAllAssetsDefinitions:", assetDefs);
    return assetDefs;
  }

  public async findAssetById(
    assetName: string,
    assetDomainName: string,
    accountName: string,
    accountDomainName: string,
  ): Promise<unknown> {
    Checks.truthy(assetName, "findAssetById arg assetName");
    Checks.truthy(assetDomainName, "findAssetById arg assetDomainName");
    Checks.truthy(accountName, "findAssetById arg accountName");
    Checks.truthy(accountDomainName, "findAssetById arg accountDomainName");

    const assetId = AssetId({
      account_id: AccountId({
        name: accountName,
        domain_id: DomainId({
          name: accountDomainName,
        }),
      }),
      definition_id: AssetDefinitionId({
        name: assetName,
        domain_id: DomainId({ name: assetDomainName }),
      }),
    });

    const result = await this.irohaClient.request(
      QueryBox(
        "FindAssetById",
        FindAssetById({
          id: EvaluatesToAssetId({
            expression: Expression(
              "Raw",
              Value("Id", IdBox("AssetId", assetId)),
            ),
          }),
        }),
      ),
    );

    const asset = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Asset"),
      Err: (error) => {
        throw new Error(`findAssetById query error: ${safeStringify(error)}`);
      },
    });

    this.log.debug("findAssetById:", asset);
    return asset;
  }

  public async findAllAssets(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllAssets", null),
    );

    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`findAllAssets query error: ${safeStringify(error)}`);
      },
    });
    const assets = vectorResult.map((i) => i.as("Identifiable").as("Asset"));

    this.log.debug("findAllAssets:", assets);
    return assets;
  }

  // Account
  public async findAccountById(
    name: string,
    domainName: string,
  ): Promise<unknown> {
    Checks.truthy(name, "findAccountById arg name");
    Checks.truthy(domainName, "findAccountById arg domainName");

    const accountId = AccountId({
      name: name,
      domain_id: DomainId({
        name: domainName,
      }),
    });

    const result = await this.irohaClient.request(
      QueryBox(
        "FindAccountById",
        FindAccountById({
          id: EvaluatesToAccountId({
            expression: Expression(
              "Raw",
              Value("Id", IdBox("AccountId", accountId)),
            ),
          }),
        }),
      ),
    );

    const account = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Account"),
      Err: (error) => {
        throw new Error(`findAccountById query error: ${safeStringify(error)}`);
      },
    });

    this.log.debug("findAccountById:", account);
    return account;
  }

  public async findAllAccounts(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllAccounts", null),
    );

    // todo: getVectorResult() helper func
    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`findAllAccounts query error: ${safeStringify(error)}`);
      },
    });
    const accounts = vectorResult.map((i) =>
      i.as("Identifiable").as("Account"),
    );

    this.log.debug("findAllAccounts:", accounts);
    return accounts;
  }

  // Transactions
  public async findAllTransactions(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllTransactions", null),
    );

    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(
          `findAllTransactions query error: ${safeStringify(error)}`,
        );
      },
    });
    const transactions = vectorResult.map((i) => i.as("TransactionValue"));

    this.log.debug("findAllTransactions:", transactions);
    return transactions;
  }

  public async findTransactionByHash(
    hash: string | Uint8Array,
  ): Promise<unknown> {
    Checks.truthy(hash, "findTransactionByHash arg hash");

    this.log.debug("findTransactionByHash - search for", hash);
    let hashBytes: Uint8Array;
    if (typeof hash === "string") {
      hashBytes = Uint8Array.from(hexToBytes(hash));
    } else {
      hashBytes = hash;
    }

    const result = await this.irohaClient.request(
      QueryBox(
        "FindTransactionByHash",
        FindTransactionByHash({
          hash: EvaluatesToHash({
            expression: Expression("Raw", Value("Hash", hashBytes)),
          }),
        }),
      ),
    );

    const transaction = result.match({
      Ok: (res) => res.result.as("TransactionValue"),
      Err: (error) => {
        throw new Error(
          `findTransactionByHash query error: ${safeStringify(error)}`,
        );
      },
    });

    this.log.debug("findTransactionByHash:", transaction);
    return transaction;
  }

  // Other
  public async findAllPeers(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllPeers", null),
    );

    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`findAllPeers query error: ${safeStringify(error)}`);
      },
    });
    const peers = vectorResult.map((i) => i.as("Identifiable").as("Peer"));

    this.log.debug("findAllPeers:", peers);
    return peers;
  }

  public async findAllBlocks(): Promise<unknown> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllBlocks", null),
    );

    const vectorResult = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`findAllBlocks query error: ${safeStringify(error)}`);
      },
    });
    const blocks = vectorResult.map((i) => i.as("Block"));

    this.log.debug(`findAllBlocks: Total ${blocks.length}`);
    return blocks;
  }
}
