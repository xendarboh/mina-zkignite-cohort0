import { Mina, isReady, PublicKey, fetchAccount, Field } from "snarkyjs";

import { BioAuthorizedMessage, BioAuthOracle } from "snarky-bioauth";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { Add } from "../../contracts/src/Add";

const BIOAUTH_ORACLE_URL = "http://localhost:3000/mina";

const state = {
  Add: null as null | typeof Add,
  zkapp: null as null | Add,
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
    const { Add } = await import("../../contracts/build/src/Add.js");
    state.Add = Add;
  },
  compileContract: async (args: {}) => {
    await state.Add!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Add!(publicKey);
  },
  getNum: async (args: {}) => {
    const currentNum = await state.zkapp!.num.get();
    return JSON.stringify(currentNum.toJSON());
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
  createUpdateTransaction: async (args: {}) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.update();
    });
    state.transaction = transaction;
  },
  createUpdateBioAuthedTransaction: async (args: { data: string }) => {
    const data = JSON.parse(args.data);
    const oracleMsg = BioAuthorizedMessage.fromJSON(data);

    try {
      const transaction = await Mina.transaction(() => {
        state.zkapp!.updateBioAuthed(oracleMsg);
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
