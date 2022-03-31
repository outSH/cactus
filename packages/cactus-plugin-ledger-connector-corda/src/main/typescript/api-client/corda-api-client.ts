import { Observable, ReplaySubject } from "rxjs";
import { finalize, share } from "rxjs/operators";
import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";
import { ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  GetMonitorTransactionsV1ResponseTx,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

const DEFAULT_POOL_RATE_MS = 5000;

type CordaBlock = GetMonitorTransactionsV1ResponseTx;

export type watchBlocksV1Options = {
  readonly stateFullClassName: string;
  readonly pollRate?: number;
};

export class CordaApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
}

export class CordaApiClient
  extends DefaultApi
  implements ISocketApiClient<CordaBlock> {
  public static readonly CLASS_NAME = "CordaApiClient";

  private readonly log: Logger;

  public get className(): string {
    return CordaApiClient.CLASS_NAME;
  }

  constructor(public readonly options: CordaApiClientOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.log.debug(`Created ${this.className} OK.`);
    this.log.debug(`basePath=${this.options.basePath}`);
  }

  private sendStartMonitorRequest(
    subject: ReplaySubject<GetMonitorTransactionsV1ResponseTx>,
    stateName: string,
  ) {
    const reportError = (err: any) => {
      this.log.warn("Error in startMonitorV1:", err);
      subject.error(`startMonitorV1 for '${stateName}' transactions failed`);
    };

    this.startMonitorV1({
      stateFullClassName: stateName,
    })
      .then((startMonRes) => {
        if (startMonRes.status != 200 || !startMonRes.data.success) {
          reportError(
            `Wrong response: status ${startMonRes.status}, success ${startMonRes.data.success}`,
          );
        } else {
          this.log.info(`Monitoring for ${stateName} transactions started.`);
        }
      })
      .catch((err) => {
        reportError(err);
      });
  }

  private async poolTransactionsLogin(
    subject: ReplaySubject<GetMonitorTransactionsV1ResponseTx>,
    stateName: string,
  ) {
    try {
      const response = await this.getMonitorTransactionsV1({
        stateFullClassName: stateName,
      });

      response.data.tx.forEach((tx) => subject.next(tx));

      const readTxIdx = response.data.tx.map((tx) => tx.index);
      await this.clearMonitorTransactionsV1({
        stateFullClassName: stateName,
        txIndexes: readTxIdx.filter(Boolean) as string[],
      });
    } catch (err) {
      this.log.warn("Monitor pool error for state", stateName);
      subject.error(err);
    }
  }

  private finalizeMonitoring(
    monitor: ReturnType<typeof setTimeout>,
    stateName: string,
  ) {
    this.log.info("Unsubscribe from the monitoring...");

    clearInterval(monitor);

    this.stopMonitorV1({
      stateFullClassName: stateName,
    })
      .then((stopMonRes) => {
        if (stopMonRes.status != 200 || !stopMonRes.data.success) {
          this.log.warn("Error response from stopMonitorV1:", stopMonRes.data);
        } else {
          this.log.info(`Monitoring for ${stateName} transactions stopped.`);
        }
      })
      .catch((err) => {
        this.log.warn("Error when calling stopMonitorV1:", err);
      });
  }

  public watchBlocksV1(options: watchBlocksV1Options): Observable<CordaBlock> {
    Checks.truthy(options, "watchBlocksV1 missing options");
    Checks.nonBlankString(
      options.stateFullClassName,
      "watchBlocksV1 stateFullClassName empty",
    );
    const pollRate = options.pollRate ?? DEFAULT_POOL_RATE_MS;
    this.log.debug("Using monitoring poll rate:", pollRate);

    const subject = new ReplaySubject<CordaBlock>(0);

    // Start monitoring
    this.sendStartMonitorRequest(subject, options.stateFullClassName);

    // Periodically pool
    const monitoringInterval = setInterval(
      () => this.poolTransactionsLogin(subject, options.stateFullClassName),
      pollRate,
    );

    // Share and finalize monitoring when not listened to anymore
    return subject.pipe(
      finalize(() =>
        this.finalizeMonitoring(monitoringInterval, options.stateFullClassName),
      ),
      share(),
    );
  }
}
