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

  public async findAllDomains(): Promise<any> {
    const result = await this.irohaClient.request(
      QueryBox("FindAllDomains", null),
    );

    const domains = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`Query error: ${safeStringify(error)}`);
      },
    });
    this.log.debug("findAllDomains:", domains);

    const mapped = domains.map((d) => d.as("Identifiable").as("Domain"));
    this.log.warn("mapped:", mapped);
    return mapped;
  }

  public async findDomainById(domainName: string): Promise<any> {
    Checks.truthy(domainName, "findDomainById arg domainName");

    const result = await this.irohaClient.request(
      QueryBox(
        "FindDomainById",
        FindDomainById({
          // TODO - helpers for DomainId()
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
        throw new Error(`Query error: ${safeStringify(error)}`);
      },
    });
    this.log.debug("findDomainById:", domain);

    return domain;
  }

  public async findAssetById(
    assetName: string,
    assetDomainName: string,
    accountName: string,
    accountDomainName: string,
  ): Promise<any> {
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

    this.log.error("asset result:", result);

    // TODO - function?
    const asset = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Asset"),
      Err: (error) => {
        throw new Error(`Query error: ${safeStringify(error)}`);
      },
    });
    this.log.debug("findAssetById:", asset);

    return asset;
  }
}
