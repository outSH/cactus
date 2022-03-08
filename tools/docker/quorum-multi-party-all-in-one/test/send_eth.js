// const path = require("path");
// const fs = require("fs-extra");
import Web3 from "web3";
import { quorum } from "./keys.js";

const web3 = new Web3("http://localhost:8545");
//const web3 = new Web3(quorum.member1.url);

const myAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
const myKey =
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3";
const targetAddress = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";

// GET ACCOUNT A BALANCE
var accountABalance = web3.utils.fromWei(await web3.eth.getBalance(myAddress));
console.log("Account A has balance of: " + accountABalance);

// GET ACCOUNT B BALANCE
var accountBBalance = web3.utils.fromWei(
  await web3.eth.getBalance(targetAddress),
);
console.log("Account B has balance of: " + accountBBalance);

const nonce = await web3.eth.getTransactionCount(myAddress, "latest"); // nonce starts counting from 0
console.log("myAddress nonce:", nonce);

const transaction = {
  nonce: nonce,
  from: myAddress,
  to: targetAddress,
  value: 100,
  gas: 1000000,
  gasPrice: 0, //ETH per unit of gas
};

const signedTx = await web3.eth.accounts.signTransaction(transaction, myKey);

web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (error, hash) {
  if (!error) {
    console.log("OK - The hash of your transaction is: ", hash);
  } else {
    console.log(
      "Something went wrong while submitting your transaction:",
      error,
    );
  }
});

// //After the transaction there should be some ETH transferred
// accountABalance = web3.utils.fromWei(
//   await web3.eth.getBalance(accountA.address),
// );
// console.log("Account A has an updated balance of: " + accountABalance);
// accountBBalance = web3.utils.fromWei(
//   await web3.eth.getBalance(quorum.member2.accountAddress),
// );
// console.log("Account B has an updatedbalance of: " + accountBBalance);

// PRIV TX SAMPLE
// const contractInstance = new web3.eth.Contract(contractAbi);
// const ci = await contractInstance
//   .deploy({ data: "0x" + contractByteCode, arguments: [contractInit] })
//   .send({
//     from: quorum.member1.accountAddress,
//     privateFor: [tessera.member3.publicKey],
//     gasLimit: "0x24A22",
//   })
//   .on("transactionHash", function (hash) {
//     console.log("The transaction hash is: " + hash);
//   });
