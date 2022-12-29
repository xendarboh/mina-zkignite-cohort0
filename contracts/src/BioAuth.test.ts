import {
  isReady,
  shutdown,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Signature,
  Poseidon,
  UInt64,
} from 'snarkyjs';
import { jest } from '@jest/globals';
import { BioAuthorizedMessage, payloadToBase58 } from 'snarky-bioauth';

import { BioAuth } from './BioAuth';

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu';

const ORACLE_URL = 'http://localhost:3000';

const proofsEnabled = false;

async function localDeploy(
  zkAppInstance: BioAuth,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy();
  });
  await txn.prove();
  txn.sign([zkAppPrivatekey]);
  await txn.send();
}

describe('BioAuth', () => {
  jest.setTimeout(1000 * 100);

  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;
  let userAccount: PrivateKey;
  let userAccountHardcoded: PrivateKey;
  let Local: any;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) BioAuth.compile();
  });

  beforeEach(async () => {
    // create Local Blockchain
    Local = Mina.LocalBlockchain({ proofsEnabled });
    Local.setTimestamp(UInt64.from(Date.now()));
    Mina.setActiveInstance(Local);

    deployerAccount = Local.testAccounts[0].privateKey;
    userAccount = Local.testAccounts[1].privateKey;

    // create static user account for hardcoded test data
    userAccountHardcoded = PrivateKey.fromBase58(
      'EKEzzQL6u4jYSdeG8cscdF1JQVomNhSwrgD7kg8pJjo8cywZmV2j'
    );

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  afterAll(async () => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  it('generates and deploys the `BioAuth` smart contract', async () => {
    const zkAppInstance = new BioAuth(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    const oraclePublicKey = zkAppInstance.oraclePublicKey.get();
    expect(oraclePublicKey).toEqual(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
  });

  describe('actual API requests', () => {
    it('emits an event if the account bioauthorization is valid', async () => {
      const zkAppInstance = new BioAuth(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      // sign the public key to create the payload to bioauthenticate
      const userPublicKey = userAccount.toPublicKey();
      const userSig = Signature.create(userAccount, userPublicKey.toFields());
      const hash = Poseidon.hash(userSig.toFields());
      const id = payloadToBase58(hash);

      const response = await fetch(`${ORACLE_URL}/${id}`);
      const data = await response.json();
      const message = BioAuthorizedMessage.fromJSON(data);

      // !! set the local blockchain time to be current
      Local.setTimestamp(UInt64.from(Date.now()));

      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.bioAuthorizeAccount(message, userPublicKey);
      });
      await txn.prove();
      await txn.send();

      const events = await zkAppInstance.fetchEvents();

      expect('bioAuthedAccount').toEqual(events[0].type);
      const eventValue = events[0].event;
      expect(eventValue).toEqual(userPublicKey);
    });
  });

  describe('hardcoded values', () => {
    const data = {
      data: {
        payload:
          '9463723088028901422622954290088021275746921125924921944639876245349531952574',
        timestamp: '1670531198833',
        bioAuthId:
          '65591567760697855413872479292939884995690881938601679068441699369357107356',
      },
      signature: {
        r: '5974458154920421429081339679489539053975303392515799769652316188578534302697',
        s: '19169473380222321108339024884634984568843674738140808377861051670127064719775',
      },
      publicKey: 'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu',
    };

    // const userSigHardcoded = {
    //   r: '10744180574211337418213540647277974882972320698735506825745737987658991327393',
    //   s: '18597266674018403770243070821948188759787123939357049409611567205466187887166',
    // };

    it('emits an event if the account bioauthorization is valid', async () => {
      const zkAppInstance = new BioAuth(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      const userPublicKey = userAccountHardcoded.toPublicKey();
      // const userSignature = Signature.fromJSON(userSigHardcoded);

      const message = BioAuthorizedMessage.fromJSON(data);

      // !! set the local blockchain time to that of the hardcoded timestamp
      Local.setTimestamp(UInt64.from(data.data.timestamp));

      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.bioAuthorizeAccount(message, userPublicKey);
      });
      await txn.prove();
      await txn.send();

      const events = await zkAppInstance.fetchEvents();

      expect('bioAuthedAccount').toEqual(events[0].type);
      const eventValue = events[0].event;
      expect(eventValue).toEqual(userPublicKey);
    });
  });
});
