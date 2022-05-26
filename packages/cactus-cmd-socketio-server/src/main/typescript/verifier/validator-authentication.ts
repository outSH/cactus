/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import jwt from "jsonwebtoken";
import { configRead } from "../util/config";
import { signValidatorMessageJwt } from "@hyperledger/cactus-common"

// Will keep the private key once it's succesfully read
let privateKey: string;

/**
 * Validator-side function to sign message to be sent to the client.
 * Will read the private key either as value in validator config `sslParam.keyValue`,
 * or read from filesystem under path `sslParam.key`.
 *
 * @param payload - Message to sign
 * @returns Signed message
 */
export function signMessageJwt(payload: object): string {
  if (!privateKey) {
    try {
      privateKey = configRead<string>('sslParam.keyValue');
    } catch {
      privateKey = fs.readFileSync(configRead('sslParam.key'), "ascii");
    }
  }
  const jwtAlgo = configRead<jwt.Algorithm>('sslParam.jwtAlgo', 'ES256');
  return signValidatorMessageJwt(privateKey, payload, jwtAlgo);
}
