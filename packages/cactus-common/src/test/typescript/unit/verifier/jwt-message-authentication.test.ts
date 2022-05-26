/**
 * Base File: packages/cactus-common/src/main/typescript/verifier/jwt-message-authentication.ts
 */

const testLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

import "jest-extended";

// Unit Test logger setup
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "../../../../main/typescript/public-api";
const log: Logger = LoggerProvider.getOrCreate({
  label: "jwt-message-authentication.test",
  level: testLogLevel,
});

// Generate private / public keys for test purposes
import { generateKeyPairSync } from "crypto";
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const publicKeyString = publicKey.export({
  type: "spki",
  format: "pem",
}) as string;

import { sign, JwtPayload } from "jsonwebtoken";
import {
  signValidatorMessageJwt,
  verifyValidatorMessageJwt,
} from "../../../../main/typescript/verifier/jwt-message-authentication";

//////////////////////////////////
// Tests
//////////////////////////////////

describe("jwt-message-authentication tests", () => {
  const message = {
    message: "Hello",
    from: "Someone",
  };
  let signedMessage = "";

  beforeAll(() => {
    log.debug("input message:", message);

    // Encrypt the message (from validator)
    signedMessage = sign(
      message,
      privateKey.export({ type: "sec1", format: "pem" }),
      {
        algorithm: "ES256",
        expiresIn: "1 day",
      },
    );
    expect(signedMessage).toBeTruthy();
    log.debug("signedMessage:", signedMessage);
  }, setupTimeout);

  test("Decrypts the payload from the validator using it's public key", async () => {
    // Verify (decrypt)
    const decryptedMessage = await verifyValidatorMessageJwt(
      publicKeyString,
      signedMessage,
    );

    // Assert decrypted message
    log.debug("decryptedMessage:", decryptedMessage);
    expect(decryptedMessage).toMatchObject(message);
    const decryptedJwt = decryptedMessage as JwtPayload;
    expect(decryptedJwt.iat).toBeNumber();
    expect(decryptedJwt.exp).toBeNumber();
  });

  test("Rejects malicious message", () => {
    // Reverse original message to produce wrong input
    const maliciousMessage = signedMessage.split("").reverse().join("");
    log.debug("maliciousMessage", maliciousMessage);

    // Verify (decrypt)
    return expect(
      verifyValidatorMessageJwt(publicKeyString, maliciousMessage),
    ).toReject();
  });

  test("Rejects expired message", (done) => {
    // Encrypt the message (from validator) with short expiration time
    signedMessage = sign(
      message,
      privateKey.export({ type: "sec1", format: "pem" }),
      {
        algorithm: "ES256",
        expiresIn: "1",
      },
    );
    expect(signedMessage).toBeTruthy();

    setTimeout(async () => {
      // Verify after short timeout
      await expect(
        verifyValidatorMessageJwt(publicKeyString, signedMessage),
      ).toReject();
      done();
    }, 1000);
  });

  test("Verifies message signed with the same module", async () => {
    // Sign (encrypt)
    const signed = signValidatorMessageJwt(
      privateKey.export({ type: "sec1", format: "pem" }),
      message,
    );
    expect(signed).toBeTruthy();

    // Verify (decrypt)
    const decryptedMessage = await verifyValidatorMessageJwt(
      publicKeyString,
      signed,
    );

    // Assert decrypted message
    log.debug("decryptedMessage:", decryptedMessage);
    expect(decryptedMessage).toMatchObject(message);
    const decryptedJwt = decryptedMessage as JwtPayload;
    expect(decryptedJwt.iat).toBeNumber();
    expect(decryptedJwt.exp).toBeNumber();
  });
});
