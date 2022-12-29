import { Mina, isReady, PublicKey, fetchAccount, Field } from "snarkyjs";

import { BioAuthorizedMessage, BioAuthOracle } from "snarky-bioauth";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { BioAuth } from "../../contracts/src/BioAuth";

// Use a locally running oracle-test server
// const BIOAUTH_ORACLE_URL = "http://localhost:3000/mina";

// Or use the deployed oracle
const BIOAUTH_ORACLE_URL = "https://auth.zkhumans.io/mina";

const state = {
  BioAuth: null as null | typeof BioAuth,
  zkapp: null as null | BioAuth,
  transaction: null as null | Transaction,
  bioAuthOracle: null as null | BioAuthOracle,
};

// ---------------------------------------------------------------------------------------

const functions = {
  loadSnarkyJS: async (args: {}) => {
    await isReady;
    state.bioAuthOracle = new BioAuthOracle(BIOAUTH_ORACLE_URL);
  },
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.BerkeleyQANet(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { BioAuth } = await import("../../contracts/build/src/BioAuth.js");
    state.BioAuth = BioAuth;
  },
  compileContract: async (args: {}) => {
    await state.BioAuth!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.BioAuth!(publicKey);
  },
  getNumBioAuthed: async (args: {}) => {
    const currentNumBioAuthed = await state.zkapp!.numBioAuthed.get();
    return JSON.stringify(currentNumBioAuthed.toJSON());
  },
  fetchBioAuth: async (args: { payload: Field }) => {
    return await state.bioAuthOracle!.fetchBioAuth(args.payload);
  },
  getBioAuthLink: async (args: { bioAuthId: string }) => {
    return state.bioAuthOracle!.getBioAuthLink(args.bioAuthId);
  },
  createUpdateBioAuthedTransaction: async (args: {
    bioAuth: string;
    publicKey58: string;
  }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    const data = JSON.parse(args.bioAuth);
    const oracleMsg = BioAuthorizedMessage.fromJSON(data);

    try {
      const transaction = await Mina.transaction(() => {
        state.zkapp!.bioAuthorizeAccount(oracleMsg, publicKey);
      });
      state.transaction = transaction;
    } catch (e) {
      console.log("Error", e);
      return e instanceof Error ? e.message : String(e);
    }
    return null;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};
if (process.browser) {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}
