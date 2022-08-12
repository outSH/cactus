import { crypto } from "@iroha2/crypto-target-node";
import safeStringify from "fast-safe-stringify";

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
  FindDomainById,
  EvaluatesToDomainId,
  IdBox,
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

interface NamedIrohaV2Instruction {
  name: string;
  instruction: Instruction;
}

// TODO - pagination
// TODO - enum.is ?
// TODO - separate file
export class CactusIrohaV2QueryClient {
  constructor(
    private readonly irohaClient: Client,
    private readonly log: Logger,
  ) {
    this.log.debug("CactusIrohaV2QueryClient created.");
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

  public async registerDomain(domainName: string): Promise<this> {
    Checks.truthy(domainName, "findDomainById arg domainName");

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

    await this.irohaClient.submit(
      Executable("Instructions", VecInstruction(irohaInstructions)),
    );

    return this;
  }

  public async free(): Promise<void> {
    this.log.debug("Free CactusIrohaV2Client key pair");
    this.irohaClient.keyPair?.free();
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

// All possible operations:
// Transactions:
//   register_peer
//   unregister_peer
//   register_domain
//   unregister_domain
//   register_token
//   register_role
//   unregister_role
//   unregister_permission_token
//   register_asset
//   unregister_asset
//   mint_account_pubkey
//   burn_account_pubkey
//   mint_account_signature_check_condition
//   set_key_value_account_string_value
//   remove_account_key_value
//   grant_account_permission_token
//   revoke_account_permission_token
//   grant_account_role
//   revoke_account_role
//   asset_set_key_value
//   asset_remove_key_value
//   asset_mint
//   asset_burn
//   asset_transfer
//   register_account
//   unregister_account
//   register_asset_def
//   unregister_asset_def
//   set_key_value_asset_def
//   remove_key_value_asset_def
//   set_key_value_domain
//   remove_key_value_domain
//   register_trigger
//   unregister_trigger
//   mint_trigger_repetitions
//   burn_trigger_repetitions
//   execute_trigger

// Queries
//   find_all_roles
//   find_all_role_ids
//   find_role_by_role_id
//   find_all_peers
//   find_all_token_ids
//   find_roles_by_account_id
//   find_permission_tokens_by_account_id
//   find_all_accounts
//   find_account_by_id
//   find_account_by_name
//   find_accounts_by_domain_id
//   find_account_key_value_by_id_and_key
//   find_accounts_with_asset
//   find_all_assets
//   find_all_asset_definitions
//   find_asset_by_id
//   find_asset_defintion_by_id
//   find_assets_by_name
//   find_assets_by_account_id
//   find_assets_by_asset_definition_id
//   find_assets_by_domain_id
//   find_assets_by_domain_id_and_asset_definition_id
//   find_asset_quantity_by_id
//   find_asset_key_value_by_id_and_key
//   find_all_blocks
//   find_all_block_headers
//   find_block_header
//   find_all_domains
//   find_domain_by_id
//   find_domain_key_value_by_id_and_key
//   find_asset_definition_key_value_by_id_and_key
//   find_all_active_triggers
//   find_trigger_by_id
//   find_trigger_key_value_by_id_and_key
//   find_triggers_by_domain_id
//   find_all_transactions
//   find_transactions_by_account_id
//   find_transaction_by_hash
