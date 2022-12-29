import { useEffect, useState } from "react";
import { PublicKey, Field, Poseidon } from "snarkyjs";

import { Alert } from "../components/alert";
import { Navbar } from "../components/navbar";
import "../styles/globals.css";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";

const transactionFee = 0.1;

export default function App() {
  let [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    errorMsg: null as null | string,
    // statusMsg: null as null | string,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
    // BioAuth additions
    bioAuthLink: null as null | string,
    currentNumBioAuthed: null as null | Field,
    hasBioAuth: false,
    hasSnarky: false,
    hasZkApp: false, // compiled and account fetched from network
    txnHash: null as null | string,
  });

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    (async () => {
      if (!state.hasBeenSetup) {
        const zkappWorkerClient = new ZkappWorkerClient();

        console.log("Loading SnarkyJS...");
        // setState((s) => ({ ...s, statusMsg: "Loading SnarkyJS..." }));
        await zkappWorkerClient.loadSnarkyJS();
        console.log("done");
        setState((s) => ({
          ...s,
          hasSnarky: true,
          // statusMsg: "Loading SnarkyJS... done",
        }));

        await zkappWorkerClient.setActiveInstanceToBerkeley();

        const mina = (window as any).mina;

        if (mina == null) {
          setState((s) => ({ ...s, hasWallet: false }));
          return;
        }
        setState((s) => ({ ...s, hasWallet: true }));

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log("using key", publicKey.toBase58());

        console.log("checking if account exists...");
        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!,
        });
        const accountExists = res.error == null;
        console.log("checking if account exists... done");
        setState((s) => ({ ...s, accountExists }));

        await zkappWorkerClient.loadContract();

        console.log("compiling zkApp");
        await zkappWorkerClient.compileContract();
        console.log("zkApp compiled");
        setState((s) => ({ ...s, hasZkApp: true }));

        const zkappPublicKey = PublicKey.fromBase58(
          "B62qjGm9FqsQA4AKqGVr8MLPacqqGCFqfjjLa68X87m1en8T9vRWFdr"
        );

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log("getting zkApp state...");
        let errorMsg: null | string = null;
        let currentNumBioAuthed: null | Field = null;
        const acct = await zkappWorkerClient.fetchAccount({
          publicKey: zkappPublicKey,
        });
        if (acct.account === undefined) {
          errorMsg = acct.error.statusText;
          setState((s) => ({ ...s, hasZkApp: false }));
        } else {
          currentNumBioAuthed = await zkappWorkerClient.getNumBioAuthed();
          console.log(
            "current state:",
            JSON.stringify({ currentNumBioAuthed })
          );
        }

        setState((s) => ({
          ...s,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          hasBioAuth: false,
          bioAuthLink: null,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentNumBioAuthed,
          errorMsg,
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

  const onSendTransactionBioAuthed = async () => {
    setState((s) => ({
      ...s,
      creatingTransaction: true,
      errorMsg: null,
      txnHash: null,
    }));
    console.log("sending a transaction...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    // use the curent number as the payload to bioauthenticate
    const currentNumBioAuthed =
      await state.zkappWorkerClient!.getNumBioAuthed();
    const payload = Poseidon.hash(currentNumBioAuthed.toFields());

    // retrieve data from bioauth oracle
    const [id, bioAuth] = await state.zkappWorkerClient!.fetchBioAuth(payload);

    // if the payload has not been bioauthorized,
    // abort sending txn to request bioauth from the user
    if (!bioAuth) {
      console.log("bioauth needed...");
      const bioAuthLink = await state.zkappWorkerClient!.getBioAuthLink(id);
      setState({
        ...state,
        bioAuthLink,
        hasBioAuth: false,
        creatingTransaction: false,
      });
      return;
    }
    setState((s) => ({ ...s, hasBioAuth: true }));

    console.log("bioauth oracle response", bioAuth);

    const errorMsg =
      await state.zkappWorkerClient!.createUpdateBioAuthedTransaction(
        bioAuth,
        state.publicKey!
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

    setState({
      ...state,
      creatingTransaction: false,
      hasBioAuth: false,
      txnHash: hash,
    });
  };

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshCurrentState = async () => {
    console.log("getting zkApp state...");
    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!,
    });
    const currentNumBioAuthed =
      await state.zkappWorkerClient!.getNumBioAuthed();

    console.log("current state:", JSON.stringify({ currentNumBioAuthed }));

    setState({ ...state, currentNumBioAuthed });
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

  let setup = <div>{hasWallet}</div>;

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink =
      "https://faucet.minaprotocol.com/?address=" + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div className="w-2/4">
        <Alert mode="info">
          <div>
            Account does not exist. Please visit the faucet to fund this account
            <a href={faucetLink} target="_blank" rel="noreferrer">
              {" "}
              [Link]{" "}
            </a>
          </div>
        </Alert>
      </div>
    );
  }

  let txnNeedsBioAuth;
  if (
    state.hasBeenSetup &&
    !state.hasBioAuth &&
    state.bioAuthLink &&
    !state.txnHash
  ) {
    txnNeedsBioAuth = (
      <div className="w-2/4">
        <Alert mode="info">
          <div>
            The transaction needs authorization. Please visit the bio-authorizor
            to approve this transaction then re-send.&emsp;
            <a
              className="link"
              href={state.bioAuthLink}
              target="_blank"
              rel="noreferrer"
            >
              [BioAuth]
            </a>
          </div>
        </Alert>
      </div>
    );
  }

  let txnSuccess;
  if (state.hasBeenSetup && state.txnHash) {
    const txnLink = `https://berkeley.minaexplorer.com/transaction/${state.txnHash}`;
    txnSuccess = (
      <div className="w-2/4">
        <Alert mode="success">
          <div>
            See transaction at{" "}
            <a className="link" href={txnLink} target="_blank" rel="noreferrer">
              {txnLink}
            </a>
          </div>
        </Alert>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists && state.hasZkApp) {
    mainContent = (
      <div className="flex flex-col items-center space-y-8 mt-8">
        <button
          className="btn btn-primary normal-case"
          onClick={onSendTransactionBioAuthed}
          disabled={state.creatingTransaction}
        >
          Send BioAuthed Transaction
        </button>
        <div>
          BioAuthorized Transactions: {state.currentNumBioAuthed?.toString()}
        </div>
        <button
          className="btn btn-primary normal-case"
          onClick={onRefreshCurrentState}
        >
          Refresh State
        </button>
      </div>
    );
  }

  const collapse =
    state.hasSnarky && state.hasWallet && state.accountExists && state.hasZkApp;

  return (
    <div className="flex h-full flex-col">
      <Navbar loading={!state.hasBeenSetup} />

      <div
        tabIndex={0}
        className={`collapse ${
          collapse ? "collapse-close" : "collapse-open"
        } border-b`}
      >
        <div className="collapse-content">
          <div className="navbar justify-center">
            <div className="navbar-center">
              <ul className="steps steps-vertical lg:steps-horizontal">
                <li className={`step ${state.hasSnarky && "step-primary"}`}>
                  &emsp;SnarkyJS&emsp;
                </li>
                <li className={`step ${state.hasWallet && "step-primary"}`}>
                  &emsp;Wallet&emsp;
                </li>
                <li className={`step ${state.accountExists && "step-primary"}`}>
                  &emsp;Account&emsp;
                </li>
                <li className={`step ${state.hasZkApp && "step-primary"}`}>
                  &emsp;zkApp&emsp;
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="base-content flex flex-col h-full">
        {state.errorMsg && (
          <div className="mx-20 my-8">
            <Alert mode="error">
              <span>{state.errorMsg}</span>
            </Alert>
          </div>
        )}
        <div className="flex flex-col items-center space-y-8">
          {setup}
          {accountDoesNotExist}
          {txnNeedsBioAuth}
          {txnSuccess}
        </div>
        {mainContent}
      </div>
    </div>
  );
}
