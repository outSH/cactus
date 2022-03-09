import { LoggerProvider } from "@hyperledger/cactus-common";
import { Socket as SocketIoSocket } from "socket.io";
import Web3 from "web3";

const level = "debug";
const label = "send-requests-endpoint";
const logger = LoggerProvider.getOrCreate({ level, label });

export class ValidatorRequest {
  constructor(private readonly web3: Web3) {}

  onRequest(socket: SocketIoSocket, data: any) {
    const methodType = data.method.type;
    // const args = data.args;
    const args: any = {};
    args["contract"] = data.contract;
    args["method"] = data.method;
    args["args"] = data.args;
    if (data.reqID !== undefined) {
      logger.info(`##add reqID: ${data.reqID}`);
      args["reqID"] = data.reqID;
    }

    console.log("##[HL-BC] Invoke smart contract to transfer asset(D1)");
    logger.info("*** REQUEST ***");
    logger.info("Client ID :" + socket.id);
    logger.info("Data  :" + JSON.stringify(data));

    // Check for the existence of the specified function and call it if it exists.
    if (methodType === "web3Eth") {
      // Can be called with Server plugin function name.
      this.web3Eth(args)
        .then((respObj) => {
          logger.info("*** RESPONSE ***");
          logger.info("Client ID :" + socket.id);
          logger.info("Response  :" + JSON.stringify(respObj));
          socket.emit("response", respObj);
        })
        .catch((errObj) => {
          logger.error("*** ERROR ***");
          logger.error("Client ID :" + socket.id);
          logger.error("Detail    :" + JSON.stringify(errObj));
          socket.emit("connector_error", errObj);
        });
    } else {
      // No such function
      const error_msg = "method.type " + methodType + " not found!";
      logger.error(error_msg);
      const retObj = {
        status: 504,
        errorDetail: error_msg,
      };
      socket.emit("connector_error", retObj);
    }
  }

  /*
   * web3Eth
   *
   * @param {Object} args JSON Object
   * {
   *      "method":<method information>,
   *      "args":<argument information>,
   *      "reqID":<request ID> (option)
   * }
   * @return {Object} JSON object
   */
  web3Eth(args: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      logger.info("web3Eth start");

      let retObj: any = {};
      const sendFunction = args.method.command;
      const sendArgs = args.args.args[0];
      const reqID = args["reqID"];

      logger.info("send_func  :" + sendFunction);
      logger.info("sendArgs  :" + JSON.stringify(sendArgs));

      // Handle the exception once to absorb the difference of interest.
      try {
        let result: any = null;
        if (sendArgs !== undefined) {
          // TODO - all web3.eth returns promise-like object?
          result = await (this.web3.eth as any)[sendFunction](sendArgs);
        } else {
          result = await (this.web3.eth as any)[sendFunction]();
        }
        // TODO - compare returns
        retObj = {
          resObj: {
            status: 200,
            data: { result: result },
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);
        return resolve(retObj);
      } catch (e) {
        retObj = {
          resObj: {
            status: 504,
            errorDetail: "Something happened",
          },
        };
        logger.error(e);

        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);

        return reject(retObj);
      }
    });
  }
}
