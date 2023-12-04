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
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import { CactiAcceptPolicyV1 } from "./public-api";
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
