import { Client, UserConfig } from "@iroha2/client";
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
  RegisterBox,
  Value,
  VecInstruction,
} from "@iroha2/data-model";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

interface NamedIrohaV2Instruction {
  name: string;
  instruction: Instruction;
}

// Cactus wrapper around Iroha V2 Client SDK
export class CactusIrohaV2Client {
  private readonly client: Client;
  private readonly log: Logger;
  private readonly transactions: Array<NamedIrohaV2Instruction> = [];

  constructor(
    public readonly options: UserConfig,
    private readonly logLevel: LogLevelDesc = "info",
  ) {
    this.client = new Client(options);

    const label = this.constructor.name;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.log.debug(`${label} created`);
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

  public async getTransactionSummary(): Promise<string> {
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

    await this.client.submit(
      Executable("Instructions", VecInstruction(irohaInstructions)),
    );

    return this;
  }
}
