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
} from "@iroha2/data-model";

import { Checks, Logger } from "@hyperledger/cactus-common";

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
    const domains = vectorResult.map((d) => d.as("Identifiable").as("Domain"));

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
    const assets = vectorResult.map((d) => d.as("Identifiable").as("Asset"));

    this.log.debug("findAllAssets:", assets);
    return assets;
  }
}
