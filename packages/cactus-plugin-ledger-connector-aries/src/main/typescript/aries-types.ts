///////
import { AskarModule } from "@aries-framework/askar";
import {
  Agent,
  InitConfig,
  HttpOutboundTransport,
  ConnectionsModule,
  DidsModule,
  TypedArrayEncoder,
  KeyType,
  CredentialsModule,
  V2CredentialProtocol,
  ProofsModule,
  AutoAcceptProof,
  V2ProofProtocol,
  AutoAcceptCredential,
  Query,
  ConnectionRecord,
  DidExchangeState,
  DidExchangeRole,
} from "@aries-framework/core";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrPoolConfig,
} from "@aries-framework/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  AnonCredsRequestedAttribute,
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import {
  AgentConnectionsFilterV1,
  CactiAcceptPolicyV1,
  CactiProofRequestAttributeV1,
} from "./public-api";
///////////

/**
 * Aries JS Agent with Anoncreds/Indy/Askar modules configured.
 * This is exact Agent type returned by factories used in this module.
 */
export type AnoncredAgent = Agent<{
  readonly connections: ConnectionsModule;
  readonly credentials: CredentialsModule<
    V2CredentialProtocol<AnonCredsCredentialFormatService[]>[]
  >;
  readonly proofs: ProofsModule<
    V2ProofProtocol<AnonCredsProofFormatService[]>[]
  >;
  readonly anoncreds: AnonCredsModule;
  readonly anoncredsRs: AnonCredsRsModule;
  readonly indyVdr: IndyVdrModule;
  readonly dids: DidsModule;
  readonly askar: AskarModule;
}>;

export function cactiAcceptPolicyToAutoAcceptProof(
  policy: CactiAcceptPolicyV1,
): AutoAcceptProof {
  switch (policy) {
    case CactiAcceptPolicyV1.Always:
      return AutoAcceptProof.Always;
    case CactiAcceptPolicyV1.ContentApproved:
      return AutoAcceptProof.ContentApproved;
    case CactiAcceptPolicyV1.Never:
      return AutoAcceptProof.Never;
    default:
      const _unknownPolicy: never = policy;
      throw new Error(`Unknown CactiAcceptPolicyV1: ${_unknownPolicy}`);
  }
}

export function cactiAcceptPolicyToAutoAcceptCredential(
  policy: CactiAcceptPolicyV1,
): AutoAcceptCredential {
  switch (policy) {
    case CactiAcceptPolicyV1.Always:
      return AutoAcceptCredential.Always;
    case CactiAcceptPolicyV1.ContentApproved:
      return AutoAcceptCredential.ContentApproved;
    case CactiAcceptPolicyV1.Never:
      return AutoAcceptCredential.Never;
    default:
      const _unknownPolicy: never = policy;
      throw new Error(`Unknown CactiAcceptPolicyV1: ${_unknownPolicy}`);
  }
}

export function safeStringToEnum<T extends Record<string, string>>(
  enumType: T,
  value?: string,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  const enumValue = (enumType as any)[value];
  if (enumValue === undefined) {
    throw new Error(`Unknown ${enumType.name}: ${value}`);
  }

  return enumValue;
}

export function validateEnumValue<T extends Record<string, string>>(
  enumType: T,
  value?: string,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  if (!(value in enumType)) {
    throw new Error(`Invalid enum value: ${value}`);
  }

  return value as unknown as T[keyof T];
}

export function validateEnumValue2<T extends Record<string, string>>(
  enumType: T,
  value?: string,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  if (!Object.values(enumType).includes(value)) {
    throw new Error(`Invalid aries enum value: ${value}`);
  }

  return value as unknown as T[keyof T];
}

export function cactiAgentConnectionsFilterToQuery(
  filter: AgentConnectionsFilterV1,
): Query<ConnectionRecord> {
  return {
    ...filter,
    state: validateEnumValue2(DidExchangeState, filter.state),
    role: validateEnumValue2(DidExchangeRole, filter.role),
  };
}

export async function cactiAttributesToAnonCredsRequestedAttributes(
  proofAttributes: CactiProofRequestAttributeV1[],
): Promise<Record<string, AnonCredsRequestedAttribute>> {
  const attributesArray = proofAttributes.map((attr) => {
    return [
      attr.name,
      {
        name: attr.name,
        restrictions: [
          {
            [`attr::${attr.name}::value`]: attr.isValueEqual,
            cred_def_id: attr.isCredentialDefinitionIdEqual,
          },
        ],
      },
    ];
  });

  return Object.fromEntries(attributesArray);
}
