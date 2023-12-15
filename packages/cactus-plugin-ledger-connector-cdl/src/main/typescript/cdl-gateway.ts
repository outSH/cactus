import { getAuthorizationHeaders } from "./type-defs";
import axios from "axios";
import https from "https";
import { readFileSync } from "fs";
import { AuthInfoV1, GatewayConfigurationV1 } from "./public-api";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

const DEFAULT_USER_AGENT = "CactiCDLConnector";

export class CDLGateway {
  private readonly log: Logger;
  private readonly baseURL: string;
  private readonly userAgent: string;
  private readonly httpsAgent: https.Agent;

  public get className(): string {
    return "CDLGateway";
  }

  constructor(
    gatewayConfig: GatewayConfigurationV1,
    logLevel: LogLevelDesc = "INFO",
  ) {
    Checks.truthy(gatewayConfig, `${this.className} arg gatewayConfig`);
    Checks.truthy(gatewayConfig.url, `${this.className} arg gatewayConfig.url`);
    const { skipCertCheck, caPath, serverName } = gatewayConfig;
    this.baseURL = gatewayConfig.url;
    this.userAgent = gatewayConfig.userAgent ?? DEFAULT_USER_AGENT;

    this.log = LoggerProvider.getOrCreate({
      level: logLevel,
      label: this.className,
    });

    const agentOptions: https.AgentOptions = {};

    if (skipCertCheck && typeof skipCertCheck === "boolean") {
      this.log.info(
        `Allowing self signed CDL API GW certificates (skipCertCheck=${skipCertCheck})`,
      );
      agentOptions.rejectUnauthorized = false;
    }

    if (caPath && typeof caPath === "string") {
      this.log.info(`Using CDL API GW CA ${caPath}`);
      const gatewayCAString = readFileSync(caPath, "ascii");
      this.log.debug("CDL Gateway certificate read:", gatewayCAString);
      agentOptions.ca = gatewayCAString;
    }

    if (serverName && typeof serverName === "string") {
      this.log.info(`Overwrite CDL API GW server name with '${serverName}'`);
      agentOptions.servername = serverName;
    }

    this.httpsAgent = new https.Agent(agentOptions);
  }

  public async request(
    url: string,
    authInfo: AuthInfoV1,
    queryParams?: Record<string, string>,
    dataPayload?: Record<string, string>,
  ): Promise<any> {
    const { httpsAgent, baseURL, userAgent } = this;

    let httpMethod = "get";
    if (dataPayload) {
      httpMethod = "post";
    }
    const authHeaders = getAuthorizationHeaders(authInfo);

    this.log.debug(`cdl request ${httpMethod} ${url} executed`);

    try {
      const requestResponse = await axios({
        httpsAgent,
        method: httpMethod,
        baseURL,
        url,
        responseType: "json",
        headers: {
          "User-Agent": userAgent,
          "Content-Type": "application/json;charset=UTF-8",
          ...authHeaders,
        },
        params: queryParams,
        data: dataPayload,
      });

      return requestResponse.data;
    } catch (error) {
      if ("toJSON" in error) {
        this.log.error("CDL API request failed:", error.toJSON());
      }

      throw error;
    }
  }
}
