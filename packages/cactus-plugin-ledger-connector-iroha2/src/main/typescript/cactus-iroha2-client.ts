import { crypto } from "@iroha2/crypto-target-node";

import { Client, setCrypto, UserConfig } from "@iroha2/client";

import {
  DomainId,
  EvaluatesToRegistrableBox,
  Executable,
  Expression,
  IdentifiableBox,
  Instruction,
  MapNameValue,
  Metadata,
  NewDomain,
  OptionIpfsPath,
  QueryBox,
  RegisterBox,
  Value,
  VecInstruction,
} from "@iroha2/data-model";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { Key, KeyPair } from "@iroha2/crypto-core";
import { hexToBytes } from "hada";

setCrypto(crypto);

interface NamedIrohaV2Instruction {
  name: string;
  instruction: Instruction;
}

// TODO - pagination
// TODO - enum.is ?
// TODO - separate file
export class CactusIrohaV2QueryClient {
  constructor(private readonly client: Client, private readonly log: Logger) {
    this.log.debug("CactusIrohaV2QueryClient created.");
  }

  public async findAllDomains(): Promise<any> {
    const result = await this.client.request(QueryBox("FindAllDomains", null));

    const domains = result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`Query error: ${error}`);
      },
    });
    this.log.debug("findAllDomains:", domains);

    const mapped = domains.map((d) => d.as("Identifiable").as("Domain"));
    this.log.warn("mapped:", mapped);
    return mapped;
  }
}

// Cactus wrapper around Iroha V2 Client SDK
export class CactusIrohaV2Client {
  private readonly client: Client;
  private readonly log: Logger;
  private readonly transactions: Array<NamedIrohaV2Instruction> = [];
  public readonly query: CactusIrohaV2QueryClient;

  constructor(
    public readonly options: UserConfig,
    private readonly logLevel: LogLevelDesc = "info",
  ) {
    this.client = new Client(options);

    const label = this.constructor.name;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.log.debug(`${label} created`);

    this.query = new CactusIrohaV2QueryClient(this.client, this.log);
  }

  public async registerDomain(domainName: string): Promise<this> {
    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          Value(
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

  public async clear(): Promise<this> {
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

    await this.client.submit(
      Executable("Instructions", VecInstruction(irohaInstructions)),
    );

    return this;
  }

  public async free(): Promise<void> {
    this.log.debug("Free CactusIrohaV2Client key pair");
    this.client.keyPair?.free();
  }
}

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
