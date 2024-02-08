export * from "./generated/openapi/typescript-axios/index.js";

export {
  IPluginOdapGatewayConstructorOptions,
  PluginOdapGateway,
  OdapMessageType,
  IOdapPluginKeyPair,
} from "./gateway/plugin-odap-gateway.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryFabricOdapGateway } from "./gateway/plugin-factory-fabric-odap-gateway.js";
import { PluginFactoryBesuOdapGateway } from "./gateway/plugin-factory-besu-odap-gateway.js";

export async function createFabricPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryFabricOdapGateway> {
  return new PluginFactoryFabricOdapGateway(pluginFactoryOptions);
}

export async function createBesuPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryBesuOdapGateway> {
  return new PluginFactoryBesuOdapGateway(pluginFactoryOptions);
}

export { ServerGatewayHelper } from "./gateway/server/server-helper.js";
export { ClientGatewayHelper } from "./gateway/client/client-helper.js";
