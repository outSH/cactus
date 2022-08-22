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

  public registerAsset(
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

    const description = `RegisterAsset '${assetName}#${domainName}', type: ${valueType}, mintable: ${mintable}`;
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
