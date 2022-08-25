import { crypto } from "@iroha2/crypto-target-node";
// import safeStringify from "fast-safe-stringify";

import { Client, setCrypto, UserConfig } from "@iroha2/client";

import {
  AssetDefinitionId,
  AssetValueType,
  DomainId,
  EvaluatesToRegistrableBox,
  Executable,
  Expression,
  IdentifiableBox,
  Instruction,
  MapNameValue,
  Metadata,
  Mintable,
  Name as IrohaName,
  Value as IrohaValue,
  NewAssetDefinition,
  NewDomain,
  OptionIpfsPath,
  RegisterBox,
  VecInstruction,
  Asset,
  AssetId,
  AccountId,
  AssetValue,
  MintBox,
  EvaluatesToValue,
  EvaluatesToIdBox,
  IdBox,
  BurnBox,
  PublicKey,
  NewAccount,
  VecPublicKey,
  TransferBox,
} from "@iroha2/data-model";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { Key, KeyPair } from "@iroha2/crypto-core";
import { hexToBytes } from "hada";

setCrypto(crypto);

import { CactusIrohaV2QueryClient } from "./cactus-iroha2-query";

export function generateIrohaV2KeyPair(
  publicKeyMultihash: string,
  privateKeyJson: Key,
): KeyPair {
  const freeableKeys: { free(): void }[] = [];

  try {
    const multihashBytes = Uint8Array.from(hexToBytes(publicKeyMultihash));

    const multihash = crypto.createMultihashFromBytes(multihashBytes);
    freeableKeys.push(multihash);
    const publicKey = crypto.createPublicKeyFromMultihash(multihash);
    freeableKeys.push(publicKey);
    const privateKey = crypto.createPrivateKeyFromJsKey(privateKeyJson);
    freeableKeys.push(privateKey);

    const keyPair = crypto.createKeyPairFromKeys(publicKey, privateKey);

    return keyPair;
  } finally {
    freeableKeys.forEach((x) => x.free());
  }
}

interface NamedIrohaV2Instruction {
  name: string;
  instruction: Instruction;
}

// Cactus wrapper around Iroha V2 Client SDK
export class CactusIrohaV2Client {
  private readonly log: Logger;
  private readonly transactions: Array<NamedIrohaV2Instruction> = [];
  public readonly irohaClient: Client;
  public readonly query: CactusIrohaV2QueryClient;

  constructor(
    public readonly options: UserConfig,
    private readonly logLevel: LogLevelDesc = "info",
  ) {
    this.irohaClient = new Client(options);

    const label = this.constructor.name;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.log.debug(`${label} created`);

    this.query = new CactusIrohaV2QueryClient(this.irohaClient, this.log);
  }

  public registerDomain(domainName: IrohaName): this {
    Checks.truthy(domainName, "registerDomain arg domainName");

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Identifiable",
            IdentifiableBox(
              "NewDomain",
              NewDomain({
                id: DomainId({
                  name: domainName,
                }),
                metadata: Metadata({ map: MapNameValue(new Map()) }),
                logo: OptionIpfsPath("None"),
              }),
            ),
          ),
        ),
      }),
    });

    const description = `RegisterDomain '${domainName}'`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public registerAssetDefinition(
    assetName: IrohaName,
    domainName: IrohaName,
    valueType: "Fixed" | "Quantity" | "BigQuantity" | "Store",
    mintable: "Infinitely" | "Once" | "Not",
    metadata: Map<IrohaName, IrohaValue> = new Map(),
  ): this {
    Checks.truthy(assetName, "registerAsset arg assetName");
    Checks.truthy(domainName, "registerAsset arg domainName");
    Checks.truthy(valueType, "registerAsset arg valueType");
    Checks.truthy(mintable, "registerAsset arg mintable");

    const assetDefinition = NewAssetDefinition({
      id: AssetDefinitionId({
        name: assetName,
        domain_id: DomainId({ name: domainName }),
      }),
      value_type: AssetValueType(valueType),
      metadata: Metadata({
        map: MapNameValue(metadata),
      }),
      mintable: Mintable(mintable),
    });

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Identifiable",
            IdentifiableBox("NewAssetDefinition", assetDefinition),
          ),
        ),
      }),
    });

    const description = `RegisterAssetDefinition '${assetName}#${domainName}', type: ${valueType}, mintable: ${mintable}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public registerAsset(
    assetName: IrohaName,
    domainName: IrohaName,
    accountName: IrohaName,
    accountDomainName: IrohaName,
    value: number | bigint | string | Metadata,
  ): this {
    Checks.truthy(assetName, "registerAsset arg assetName");
    Checks.truthy(domainName, "registerAsset arg domainName");
    Checks.truthy(accountName, "registerAsset arg accountName");
    Checks.truthy(accountDomainName, "registerAsset arg accountDomainName");

    let assetValue: AssetValue;
    switch (typeof value) {
      case "number":
        assetValue = AssetValue("Quantity", value);
        break;
      case "bigint":
        assetValue = AssetValue("BigQuantity", value);
        break;
      case "string":
        assetValue = AssetValue("Fixed", value);
        break;
      case "object":
        assetValue = AssetValue("Store", value);
      default:
        throw new Error(`Unknown AssetValue: ${value}, type: ${typeof value}`);
    }

    const assetDefinition = Asset({
      id: AssetId({
        account_id: AccountId({
          name: accountName,
          domain_id: DomainId({
            name: accountDomainName,
          }),
        }),
        definition_id: AssetDefinitionId({
          name: assetName,
          domain_id: DomainId({ name: domainName }),
        }),
      }),
      value: assetValue,
    });

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue("Identifiable", IdentifiableBox("Asset", assetDefinition)),
        ),
      }),
    });

    const description = `RegisterAsset '${assetName}#${domainName}', value: ${value}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public mintAsset(
    assetName: string,
    domainName: string,
    accountName: string,
    accountDomainName: string,
    value: number | bigint | string | Metadata,
  ): this {
    Checks.truthy(assetName, "mintAsset arg assetName");
    Checks.truthy(domainName, "mintAsset arg domainName");
    Checks.truthy(accountName, "mintAsset arg accountName");
    Checks.truthy(accountDomainName, "mintAsset arg accountDomainName");
    Checks.truthy(value, "mintAsset arg value");

    const assetId = AssetId({
      account_id: AccountId({
        name: accountName,
        domain_id: DomainId({
          name: accountDomainName,
        }),
      }),
      definition_id: AssetDefinitionId({
        name: assetName,
        domain_id: DomainId({ name: domainName }),
      }),
    });

    // todo - factory method
    let assetValue: IrohaValue;
    switch (typeof value) {
      case "number":
        assetValue = IrohaValue("U32", value);
        break;
      case "bigint":
        assetValue = IrohaValue("U128", value);
        break;
      case "string":
        assetValue = IrohaValue("Fixed", value);
        break;
      case "object":
        assetValue = IrohaValue("LimitedMetadata", value);
      default:
        throw new Error(`Unknown AssetValue: ${value}, type: ${typeof value}`);
    }

    const mintBox = MintBox({
      object: EvaluatesToValue({
        expression: Expression("Raw", assetValue),
      }),
      destination_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue("Id", IdBox("AssetId", assetId)),
        ),
      }),
    });

    const description = `MintAsset '${assetName}#${domainName}', value: ${value}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Mint", mintBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public burnAsset(
    assetName: string,
    domainName: string,
    accountName: string,
    accountDomainName: string,
    value: number | bigint | string | Metadata,
  ): this {
    Checks.truthy(assetName, "burnAsset arg assetName");
    Checks.truthy(domainName, "burnAsset arg domainName");
    Checks.truthy(accountName, "burnAsset arg accountName");
    Checks.truthy(accountDomainName, "burnAsset arg accountDomainName");
    Checks.truthy(value, "burnAsset arg value");

    const assetId = AssetId({
      account_id: AccountId({
        name: accountName,
        domain_id: DomainId({
          name: accountDomainName,
        }),
      }),
      definition_id: AssetDefinitionId({
        name: assetName,
        domain_id: DomainId({ name: domainName }),
      }),
    });

    // todo - factory method
    let assetValue: IrohaValue;
    switch (typeof value) {
      case "number":
        assetValue = IrohaValue("U32", value);
        break;
      case "bigint":
        assetValue = IrohaValue("U128", value);
        break;
      case "string":
        assetValue = IrohaValue("Fixed", value);
        break;
      case "object":
        assetValue = IrohaValue("LimitedMetadata", value);
      default:
        throw new Error(`Unknown AssetValue: ${value}, type: ${typeof value}`);
    }

    const burnBox = BurnBox({
      object: EvaluatesToValue({
        expression: Expression("Raw", assetValue),
      }),
      destination_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue("Id", IdBox("AssetId", assetId)),
        ),
      }),
    });

    const description = `BurnAsset '${assetName}#${domainName}', value: ${value}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Burn", burnBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public transferAsset(
    assetName: string,
    assetDomainName: string,
    sourceAccountName: string,
    sourceAccountDomain: string,
    targetAccountName: string,
    targetAccountDomain: string,
    valueToTransfer: number | bigint | string | Metadata,
  ): this {
    Checks.truthy(assetName, "transferAsset arg assetName");
    Checks.truthy(assetDomainName, "transferAsset arg assetDomainName");
    Checks.truthy(sourceAccountName, "transferAsset arg sourceAccountName");
    Checks.truthy(sourceAccountDomain, "transferAsset arg sourceAccountDomain");
    Checks.truthy(targetAccountName, "transferAsset arg targetAccountName");
    Checks.truthy(targetAccountDomain, "transferAsset arg targetAccountDomain");
    Checks.truthy(valueToTransfer, "transferAsset arg valueToTransfer");

    const assetDefinition = AssetDefinitionId({
      name: assetName,
      domain_id: DomainId({ name: assetDomainName }),
    });

    const sourceAssetId = AssetId({
      account_id: AccountId({
        name: sourceAccountName,
        domain_id: DomainId({
          name: sourceAccountDomain,
        }),
      }),
      definition_id: assetDefinition,
    });

    const targetAssetId = AssetId({
      account_id: AccountId({
        name: targetAccountName,
        domain_id: DomainId({
          name: targetAccountDomain,
        }),
      }),
      definition_id: assetDefinition,
    });

    // todo - factory method
    let transferValue: IrohaValue;
    switch (typeof valueToTransfer) {
      case "number":
        transferValue = IrohaValue("U32", valueToTransfer);
        break;
      case "bigint":
        transferValue = IrohaValue("U128", valueToTransfer);
        break;
      case "string":
        transferValue = IrohaValue("Fixed", valueToTransfer);
        break;
      case "object":
        transferValue = IrohaValue("LimitedMetadata", valueToTransfer);
      default:
        throw new Error(
          `Unknown AssetValue: ${valueToTransfer}, type: ${typeof valueToTransfer}`,
        );
    }

    const transferBox = TransferBox({
      source_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue("Id", IdBox("AssetId", sourceAssetId)),
        ),
      }),
      object: EvaluatesToValue({
        expression: Expression("Raw", transferValue),
      }),
      destination_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue("Id", IdBox("AssetId", targetAssetId)),
        ),
      }),
    });

    const description = `TransferAsset '${assetName}#${assetDomainName}',\
    from: ${sourceAccountName}@${sourceAccountDomain}\
    to ${targetAccountName}@${targetAccountDomain}`;

    this.transactions.push({
      name: description,
      instruction: Instruction("Transfer", transferBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public registerAccount(
    accountName: string,
    domainName: string,
    publicKeyPayload: string | Uint8Array,
    publicKeyDigestFunction = "ed25519",
    metadata: Map<IrohaName, IrohaValue> = new Map(),
  ): this {
    Checks.truthy(accountName, "registerAccount arg accountName");
    Checks.truthy(domainName, "registerAccount arg domainName");
    Checks.truthy(publicKeyPayload, "registerAccount arg publicKeyPayload");
    Checks.truthy(
      publicKeyDigestFunction,
      "registerAccount arg publicKeyDigestFunction",
    );

    const accountId = AccountId({
      name: accountName,
      domain_id: DomainId({
        name: domainName,
      }),
    });

    let publicKeyBytes: Uint8Array;
    if (typeof publicKeyPayload === "string") {
      publicKeyBytes = Uint8Array.from(hexToBytes(publicKeyPayload));
    } else {
      publicKeyBytes = publicKeyPayload;
    }

    const publicKey = PublicKey({
      payload: publicKeyBytes,
      digest_function: publicKeyDigestFunction,
    });

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Identifiable",
            IdentifiableBox(
              "NewAccount",
              NewAccount({
                id: accountId,
                signatories: VecPublicKey([publicKey]),
                metadata: Metadata({ map: MapNameValue(metadata) }),
              }),
            ),
          ),
        ),
      }),
    });

    const description = `RegisterAccount '${accountName}@${domainName}'`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  public clear(): this {
    this.transactions.length = 0;
    return this;
  }

  public getTransactionSummary(): string {
    const header = `Transaction Summary (total: ${this.transactions.length}):\n`;
    const instructions = this.transactions.map(
      (instruction, index) =>
        ` - Instruction #${index}: ` + instruction.name + "\n",
    );

    return header.concat(...instructions);
  }

  public async send(): Promise<this> {
    if (this.transactions.length === 0) {
      this.log.warn("send() ignored - no instructions to be sent!");
      return this;
    }

    const irohaInstructions = this.transactions.map(
      (entry) => entry.instruction,
    );
    this.log.info(
      `Send transaction with ${irohaInstructions.length} instructions to Iroha ledger`,
    );
    this.log.debug(this.getTransactionSummary());

    await this.irohaClient.submit(
      Executable("Instructions", VecInstruction(irohaInstructions)),
    );

    this.clear();

    return this;
  }

  public free(): void {
    this.log.debug("Free CactusIrohaV2Client key pair");
    this.irohaClient.keyPair?.free();
    this.clear();
  }
}
