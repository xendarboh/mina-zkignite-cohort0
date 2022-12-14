import { Add } from './Add';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Poseidon,
  UInt64,
} from 'snarkyjs';

import { jest } from '@jest/globals';

import { BioAuthorizedMessage, payloadToBase58 } from 'snarky-bioauth';

const BIOAUTH_ORACLE_URL = 'http://localhost:3000';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  jest.setTimeout(1000 * 100);

  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Add;
  let Local: any;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) Add.compile();
  });

  beforeEach(() => {
    Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    deployerAccount = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Add(zkAppAddress);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(1));
  });

  it('correctly updates the num state on the `Add` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.update();
    });
    await txn.prove();
    await txn.send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(3));
  });

  it('correctly updates the numBioAuthed state on the `Add` smart contract', async () => {
    await localDeploy();

    // use the curent number as the payload to bioauthenticate
    const currentNumBioAuthed = zkApp.numBioAuthed.get();
    const payload = Poseidon.hash(currentNumBioAuthed.toFields());

    // retrieve data from bioauth oracle
    const id = payloadToBase58(payload);
    const response = await fetch(`${BIOAUTH_ORACLE_URL}/${id}`);
    const data = await response.json();
    const message = BioAuthorizedMessage.fromJSON(data);

    // !! set the local blockchain time to be current
    Local.setTimestamp(UInt64.from(Date.now()));

    // update transaction
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.updateBioAuthed(message);
    });
    await txn.prove();
    await txn.send();

    const updatedNumBioAuthed = zkApp.numBioAuthed.get();
    expect(updatedNumBioAuthed).toEqual(Field(3));
  });
});
