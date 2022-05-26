/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";

const DEFAULT_EXPIRATION_TIME = 60 * 15; // 15 minutes
type PayloadType = Parameters<typeof jwt.sign>[0];

const supportedJwtAlgos: jwt.Algorithm[] = [
  "ES256",
  "ES384",
  "ES512",
  "RS256",
  "RS384",
  "RS512",
];

/**
 * Sign a message to be sent from socketio connector (validator) to a client.
 *
 * @param privateKey - Validator private key. Only ECDSA and RSA keys are supported.
 * @param payload - Message to be encoded.
 * @param jwtAlgo - JWT algorithm to use. Must match key used (ES*** or RS***)
 * @param expirationTime - JWT expiration time
 * @returns JWT signed message that can be sent over the wire.
 */
export function signValidatorMessageJwt(
  privateKey: jwt.Secret,
  payload: PayloadType,
  jwtAlgo: jwt.Algorithm = "ES256",
  expirationTime: number = DEFAULT_EXPIRATION_TIME,
): string {
  if (!supportedJwtAlgos.includes(jwtAlgo)) {
    throw new Error(
      `Wrong JWT Algorithm. Supported algos: ${supportedJwtAlgos.toString()}`,
    );
  }

  // Check if key supported and JWT algorithm matches the provided key type
  const keyType = crypto.createPrivateKey(privateKey).asymmetricKeyType;
  if (
    !(
      (keyType === "rsa" && jwtAlgo.startsWith("RS")) ||
      (keyType === "ec" && jwtAlgo.startsWith("ES"))
    )
  ) {
    throw new Error(`Not supported combination ${keyType}/${jwtAlgo}.`);
  }

  const option: jwt.SignOptions = {
    algorithm: jwtAlgo,
    expiresIn: expirationTime,
  };

  return jwt.sign(payload, privateKey, option);
}

/**
 * Validate response from socketio connector (validator).
 * Input message must be JWT signed with validator private key,
 * that match public key (cert) from input.
 *
 * @param publicKey - Validator public key. Only ECDSA and RSA keys are supported.
 * @param targetData - Signed JWT message to be decoded.
 * @returns Promise resolving to decoded jwt.JwtPayload.
 */
export function verifyValidatorMessageJwt(
  publicKey: jwt.Secret,
  targetData: string,
): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      targetData,
      publicKey,
      {
        algorithms: supportedJwtAlgos,
      },
      (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | undefined) => {
        if (err) {
          reject(err);
        } else if (decoded === undefined) {
          reject(Error("Decoded message is undefined"));
        } else {
          resolve(decoded);
        }
      },
    );
  });
}
