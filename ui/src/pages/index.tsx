import { useEffect, useState } from "react";
import ZkappWorkerClient from "./zkAppWorkerClient";
import { Field, PublicKey, PrivateKey, Signature, MerkleTree } from "o1js";
import {
  HumanIDWitness,
  Signatures,
} from "../../../contracts/build/src/Airdrop.js";
import { id1, sigs, witness } from "./zkAppWorker"
import './reactCOIServiceWorker';

let transactionFee = 0.1;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


export default function Home() {
  const [state, setState] = useState({
    zkAppWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentTreeRoot: null as null | Field,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  const [displayText, setDisplayText] = useState("");
  const [transactionlink, setTransactionLink] = useState("");

  useEffect(() => {
    (async () => {
      const { Airdrop } = await import(
        "../../../contracts/build/src/Airdrop.js"
      );
      const { PublicKey, Field } = await import("o1js");

      console.log("Loading Web Worker...");
      const zkAppWorkerClient = new ZkappWorkerClient();
      await sleep(5000);
      console.log("Web Worker loaded.");
      await zkAppWorkerClient.setActiveInstanceToDevnet();

      const mina = (window as any).mina;

      if (mina == null) {
        setState({ ...state, hasWallet: false });
        return;
      }

      const publicKeyBase58: string = (await mina.requestAccounts())[0];
      const publicKey = PublicKey.fromBase58(publicKeyBase58);

      console.log(`Using key:${publicKey.toBase58()}`);

      console.log("Checking if fee payer account exists...");

      const res = await zkAppWorkerClient.fetchAccount({
        publicKey: publicKey!,
      });
      const accountExists = res.error == null;

      console.log("Loading contract...");
      await zkAppWorkerClient.loadContract();
      console.log("Contract loaded.");

      console.log("Compiling contract...");
      await zkAppWorkerClient.compileContract();
      console.log("Contract compiled.");

      const zkAppAddress = "B62qrzBYPHRZ6FsQpZCw5FbgvRbFh2jFHY2DT35pWjJc9K5Mbq2zppH";

      console.log("Initializing zkApp instance...");
      await zkAppWorkerClient.initZkappInstance(
        PublicKey.fromBase58(zkAppAddress)
      );
      console.log("zkApp instance initialized.");

      console.log("Fetching account...");
      await zkAppWorkerClient.fetchAccount({
        publicKey: PublicKey.fromBase58(zkAppAddress),
      });
      console.log("Account fetched.");

      console.log("Fetching tree root...");
      const treeRoot = await zkAppWorkerClient.getTreeRoot();
      console.log("Tree root fetched.");
      console.log("Tree root: ", treeRoot);

      setState({
        ...state,
        zkAppWorkerClient,
        hasWallet: true,
        hasBeenSetup: true,
        publicKey,
        zkappPublicKey: PublicKey.fromBase58(zkAppAddress),
        accountExists,
        currentTreeRoot: treeRoot,
      });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (;;) {
          setDisplayText("Checking if fee payer account exists...");
          console.log("Checking if fee payer account exists...");
          const res = await state.zkAppWorkerClient!.fetchAccount({
            publicKey: state.publicKey!,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  const onSendTransaction = async () => {
    setState({ ...state, creatingTransaction: true });

    setDisplayText("Creating a transaction...");
    console.log("Creating a transaction...");

    await state.zkAppWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    await state.zkAppWorkerClient!.createClaimTransaction(state.publicKey!);

    setDisplayText("Creating proof...");
    console.log("Creating proof...");
    await state.zkAppWorkerClient!.proveUpdateTransaction();

    console.log("Requesting send transaction...");
    setDisplayText("Requesting send transaction...");
    const transactionJSON = await state.zkAppWorkerClient!.getTransactionJSON();

    setDisplayText("Getting transaction JSON...");
    console.log("Getting transaction JSON...");
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
    });

    const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
  };

  return (
    <>
      <main>{displayText}</main>
      <button onClick={async () => await onSendTransaction()}>Send</button>
    </>
  );
}
