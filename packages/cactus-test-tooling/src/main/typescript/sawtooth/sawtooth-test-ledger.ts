/**
 * Helper utils for setting up and starting Sawtooth ledger for testing.
 */

import { EventEmitter } from "events";
import Docker, { Container, ContainerCreateOptions } from "dockerode";
import {
  Bools,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";
import { v4 as internalIpV4 } from "internal-ip";

/**
 * Type of input parameters to `SawtoothTestLedger` constructor.
 */
export interface ISawtoothTestLedgerOptions {
  readonly containerImageName?: string;
  readonly containerImageVersion?: string;
  readonly ledgerApiPort?: number;
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: string[];
  // For test development, attach to ledger that is already running, don't spin up new one
  readonly useRunningLedger?: boolean;
}

/**
 * Default options for Sawtooth test ledger.
 */
const DEFAULTS = Object.freeze({
  // @todo Replace with hyperledger ghcr link when available
  containerImageName: "ghcr.io/outsh/cactus-sawtooth-all-in-one",
  containerImageVersion: "dev1",
  ledgerApiPort: 8008,
  logLevel: "info" as LogLevelDesc,
  emitContainerLogs: false,
  envVars: [],
  useRunningLedger: false,
});
export const SAWTOOTH_LEDGER_DEFAULT_OPTIONS = DEFAULTS;

/**
 * Class for running a test sawtooth ledger in a container.
 */
export class SawtoothTestLedger implements ITestLedger {
  public readonly containerImageName: string;
  public readonly containerImageVersion: string;
  private readonly ledgerApiPort: number;
  private readonly logLevel: LogLevelDesc;
  private readonly emitContainerLogs: boolean;
  private readonly useRunningLedger: boolean;
  private readonly envVars: string[];

  private readonly log: Logger;
  public container: Container | undefined;
  public containerId: string | undefined;

  constructor(public readonly options: ISawtoothTestLedgerOptions) {
    this.containerImageName =
      options?.containerImageName || DEFAULTS.containerImageName;

    this.containerImageVersion =
      options?.containerImageVersion || DEFAULTS.containerImageVersion;

    this.ledgerApiPort = options?.ledgerApiPort || DEFAULTS.ledgerApiPort;

    this.logLevel = options?.logLevel || DEFAULTS.logLevel;

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : DEFAULTS.emitContainerLogs;

    this.useRunningLedger = Bools.isBooleanStrict(options.useRunningLedger)
      ? (options.useRunningLedger as boolean)
      : DEFAULTS.useRunningLedger;

    this.envVars = options?.envVars || DEFAULTS.envVars;

    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: "sawtooth-test-ledger",
    });
  }

  /**
   * Sawtooth ledger image name and tag
   */
  public get fullContainerImageName(): string {
    return [this.containerImageName, this.containerImageVersion].join(":");
  }

  /**
   * Start a test sawtooth ledger.
   *
   * @param omitPull Don't pull docker image from upstream if true.
   * @returns Promise<Container>
   */
  public async start(omitPull = false): Promise<Container> {
    if (this.useRunningLedger) {
      this.log.info(
        "Search for already running Sawtooth Test Ledger because 'useRunningLedger' flag is enabled.",
      );
      this.log.info(
        "Search criteria - image name: ",
        this.fullContainerImageName,
        ", state: running",
      );
      const containerInfo = await Containers.getByPredicate(
        (ci) =>
          ci.Image === this.fullContainerImageName && ci.State === "running",
      );
      const docker = new Docker();
      this.containerId = containerInfo.Id;
      this.container = docker.getContainer(this.containerId);
      return this.container;
    }

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
      this.container = undefined;
      this.containerId = undefined;
    }

    if (!omitPull) {
      await Containers.pullImage(
        this.fullContainerImageName,
        {},
        this.logLevel,
      );
    }

    const createOptions: ContainerCreateOptions = {
      ExposedPorts: {
        "8008/tcp": {}, // Rest API
      },
      Env: this.envVars,
      HostConfig: {
        PublishAllPorts: true,
        Privileged: true,
      },
    };

    return new Promise<Container>((resolve, reject) => {
      const docker = new Docker();
      const eventEmitter: EventEmitter = docker.run(
        this.fullContainerImageName,
        [],
        [],
        createOptions,
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.fullContainerImageName}]`;
          await Containers.streamLogs({
            container: this.container,
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await Containers.waitForHealthCheck(this.containerId);
          resolve(container);
        } catch (ex) {
          this.log.error(ex);
          reject(ex);
        }
      });
    });
  }

  /**
   * Stop a test sawtooth ledger.
   *
   * @returns Stop operation results.
   */
  public stop(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info("Ignore stop request because useRunningLedger is enabled.");
      return Promise.resolve();
    } else if (this.container) {
      return Containers.stop(this.container);
    } else {
      return Promise.reject(
        new Error(
          `SawtoothTestLedger#destroy() Container was never created, nothing to stop.`,
        ),
      );
    }
  }

  /**
   * Destroy a test sawtooth ledger.
   *
   * @returns Destroy operation results.
   */
  public destroy(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info(
        "Ignore destroy request because useRunningLedger is enabled.",
      );
      return Promise.resolve();
    } else if (this.container) {
      return this.container.remove();
    } else {
      return Promise.reject(
        new Error(
          `SawtoothTestLedger#destroy() Container was never created, nothing to destroy.`,
        ),
      );
    }
  }

  /**
   * Get localhost port that can be used to access ledger rest API in the container.
   *
   * @returns port
   */
  private async getRestApiPort() {
    if (this.containerId) {
      const cInfo = await Containers.getById(this.containerId);
      return Containers.getPublicPort(this.ledgerApiPort, cInfo);
    } else {
      throw new Error(
        "getRestApiPort(): Container ID not set. Did you call start()?",
      );
    }
  }

  /**
   * Get localhost URL that can be used to access ledger rest API in the container.
   *
   * @returns Sawtooth Rest API URL.
   */
  public async getRestApiHost() {
    const port = this.getRestApiPort();
    const lanAddress = (await internalIpV4()) ?? "127.0.0.1";
    return `http://${lanAddress}:${port}`;
  }
}
