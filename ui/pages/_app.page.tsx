import { useEffect, useState } from "react";
import { PublicKey, Field, Poseidon } from "snarkyjs";

import "../styles/globals.css";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";

const transactionFee = 0.1;

const BIOAUTH_ORACLE_URL = "http://localhost:3000";

export default function App() {
  let [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null as null | Field,
    currentNumBioAuthed: null as null | Field,
    errorMsg: null as null | string,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    (async () => {
      if (!state.hasBeenSetup) {
        const zkappWorkerClient = new ZkappWorkerClient();

        console.log("Loading SnarkyJS...");
        await zkappWorkerClient.loadSnarkyJS();
        console.log("done");

        await zkappWorkerClient.setActiveInstanceToBerkeley();

        const mina = (window as any).mina;

        if (mina == null) {
          setState((s) => ({ ...s, hasWallet: false }));
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log("using key", publicKey.toBase58());

        console.log("checking if account exists...");
        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!,
        });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();

        console.log("compiling zkApp");
        await zkappWorkerClient.compileContract();
        console.log("zkApp compiled");

        const zkappPublicKey = PublicKey.fromBase58(
          "B62qoc3ADEaKWKoHxpzzREiiadqZCf5XG3H9fi3r2SibJFSTb1tmu21"
        );

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log("getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const currentNum = await zkappWorkerClient.getNum();
        const currentNumBioAuthed = await zkappWorkerClient.getNumBioAuthed();
        console.log(
          "current state:",
          JSON.stringify({ currentNum, currentNumBioAuthed })
        );

        setState((s) => ({
          ...s,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentNum,
          currentNumBioAuthed,
          errorMsg: null,
        }));
      }
    })();
  }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (;;) {
          console.log("checking if account exists...");
          const res = await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.publicKey!,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState((s) => ({ ...s, accountExists: true }));
      }
    })();
  }, [
    state.accountExists,
    state.hasBeenSetup,
    state.publicKey,
    state.zkappWorkerClient,
  ]);

  // -------------------------------------------------------
  // Send a transaction

  const onSendTransaction = async () => {
    setState({ ...state, creatingTransaction: true });
    console.log("sending a transaction...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    await state.zkappWorkerClient!.createUpdateTransaction();

    console.log("creating proof...");
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log("getting Transaction JSON...");
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    console.log("requesting send transaction...");
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });

    console.log(
      "See transaction at https://berkeley.minaexplorer.com/transaction/" + hash
    );

    setState({ ...state, creatingTransaction: false });
  };

  const onSendTransactionBioAuthed = async () => {
    setState({ ...state, creatingTransaction: true, errorMsg: null });
    console.log("sending a transaction...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    // use the curent number as the payload to bioauthenticate
    const currentNumBioAuthed =
      await state.zkappWorkerClient!.getNumBioAuthed();
    const payload = Poseidon.hash(currentNumBioAuthed.toFields());

    // retrieve data from bioauth oracle
    // if payload has been authed by user, returns the signed data
    // if payload has not yet been authed, returns msg indicating TODO
    const response = await fetch(`${BIOAUTH_ORACLE_URL}/${payload}`);
    const data = await response.json();
    console.log("!! bioauth oracle response", JSON.stringify(data));

    const errorMsg =
      await state.zkappWorkerClient!.createUpdateBioAuthedTransaction(
        JSON.stringify(data)
      );
    if (errorMsg) {
      setState({ ...state, errorMsg });
      return;
    }

    console.log("creating proof...");
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log("getting Transaction JSON...");
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    console.log("requesting send transaction...");
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });

    console.log(
      "See transaction at https://berkeley.minaexplorer.com/transaction/" + hash
    );

    setState({ ...state, creatingTransaction: false });
  };

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshCurrentState = async () => {
    console.log("getting zkApp state...");
    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!,
    });
    const currentNum = await state.zkappWorkerClient!.getNum();
    const currentNumBioAuthed =
      await state.zkappWorkerClient!.getNumBioAuthed();

    console.log(
      "current state:",
      JSON.stringify({ currentNum, currentNumBioAuthed })
    );

    setState({ ...state, currentNum, currentNumBioAuthed });
  };

  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = "https://www.aurowallet.com/";
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        {" "}
        [Link]{" "}
      </a>
    );
    hasWallet = (
      <div>
        {" "}
        Could not find a wallet. Install Auro wallet here: {auroLinkElem}
      </div>
    );
  }

  let setupText = state.hasBeenSetup
    ? "SnarkyJS Ready"
    : "Setting up SnarkyJS...";
  let setup = (
    <div>
      {" "}
      {setupText} {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink =
      "https://faucet.minaprotocol.com/?address=" + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div>
        Account does not exist. Please visit the faucet to fund this account
        <a href={faucetLink} target="_blank" rel="noreferrer">
          {" "}
          [Link]{" "}
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <div>
        <button
          onClick={onSendTransaction}
          disabled={state.creatingTransaction}
        >
          Send Transaction
        </button>
        <div> Current Number in zkApp: {state.currentNum!.toString()} </div>
        <hr />
        <button
          onClick={onSendTransactionBioAuthed}
          disabled={state.creatingTransaction}
        >
          Send Transaction BioAuthed
        </button>
        <div>
          Current Bio-Authed Number in zkApp:{" "}
          {state.currentNumBioAuthed?.toString()}
        </div>
        <button onClick={onRefreshCurrentState}> Get Latest State </button>
      </div>
    );
  }

  return (
    <div>
      {setup}
      {accountDoesNotExist}
      {mainContent}
      {state.errorMsg && (
        <div>
          <hr />
          {state.errorMsg}
        </div>
      )}
    </div>
  );
}
