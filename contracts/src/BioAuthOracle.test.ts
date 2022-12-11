import { BioAuthOracle, BIOAUTH_TTL } from './BioAuthOracle';

import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Signature,
  Poseidon,
  UInt64,
} from 'snarkyjs';

import { jest } from '@jest/globals';

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu';

const ORACLE_URL = 'http://localhost:3000';

// fix "fail not defined"
// https://github.com/facebook/jest/issues/11698#issuecomment-1332760625
function fail(message = '') {
  let failMessage = '';
  failMessage += '\n';
  failMessage += 'FAIL FUNCTION TRIGGERED\n';
  failMessage += 'The fail function has been triggered';
  failMessage += message ? ' with message:' : '';

  expect(message).toEqual(failMessage);
}

const proofsEnabled = false;

async function localDeploy(
  zkAppInstance: BioAuthOracle,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.init(zkAppPrivatekey);
  });
  await txn.prove();
  txn.sign([zkAppPrivatekey]);
  await txn.send();
}

describe('BioAuthOracle', () => {
  jest.setTimeout(1000 * 100);

  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;
  let userAccount: PrivateKey;
  let userAccountHardcoded: PrivateKey;
  let Local: any;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) BioAuthOracle.compile();
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

  it('generates and deploys the `BioAuthOracle` smart contract', async () => {
    const zkAppInstance = new BioAuthOracle(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    const oraclePublicKey = zkAppInstance.oraclePublicKey.get();
    expect(oraclePublicKey).toEqual(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
  });

  describe('actual API requests', () => {
    it('emits an event if the account bioauthorization is valid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      // sign the public key to create the payload to bioauthenticate
      const userPublicKey = userAccount.toPublicKey();
      const userSig = Signature.create(userAccount, userPublicKey.toFields());
      const sigHash = Poseidon.hash(userSig.toFields()).toString();

      const response = await fetch(`${ORACLE_URL}/${sigHash}`);
      const data = await response.json();

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      // !! set the local blockchain time to be current
      Local.setTimestamp(UInt64.from(Date.now()));

      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.verifyAccount(
          userPublicKey,
          userSig,
          payload,
          timestamp,
          bioAuthId,
          signature ?? fail('something is wrong with the signature')
        );
      });
      await txn.prove();
      await txn.send();

      const events = await zkAppInstance.fetchEvents();

      expect('bioAuthorizedAccount').toEqual(events[0].type);
      const eventValue0 = events[0].event;
      expect(eventValue0).toEqual(userPublicKey);

      expect('bioAuthorizedMessage').toEqual(events[1].type);
      const eventValue1 = events[1].event.toFields(null)[0];
      expect(eventValue1).toEqual(payload);
    });

    it('throws an error if the timestamp on the oracle response has expired even if the signatures are valid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      // sign the public key to create the payload to bioauthenticate
      const userPublicKey = userAccount.toPublicKey();
      const userSig = Signature.create(userAccount, userPublicKey.toFields());
      const sigHash = Poseidon.hash(userSig.toFields()).toString();

      const response = await fetch(`${ORACLE_URL}/${sigHash}`);
      const data = await response.json();

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      // !! set the local blockchain time to be into the future
      Local.setTimestamp(UInt64.from(Date.now() + BIOAUTH_TTL + 1000));

      expect(async () => {
        await Mina.transaction(deployerAccount, () => {
          zkAppInstance.verifyAccount(
            userPublicKey,
            userSig,
            payload,
            timestamp,
            bioAuthId,
            signature ?? fail('something is wrong with the signature')
          );
        });
      }).rejects;
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

    const userSigHardcoded = {
      r: '10744180574211337418213540647277974882972320698735506825745737987658991327393',
      s: '18597266674018403770243070821948188759787123939357049409611567205466187887166',
    };

    it('emits an event if the account bioauthorization is valid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      const userPublicKey = userAccountHardcoded.toPublicKey();
      const userSignature = Signature.fromJSON(userSigHardcoded);

      // !! set the local blockchain time to that of the hardcoded timestamp
      Local.setTimestamp(UInt64.from(data.data.timestamp));

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.verifyAccount(
          userPublicKey,
          userSignature,
          payload,
          timestamp,
          bioAuthId,
          signature ?? fail('something is wrong with the signature')
        );
      });
      await txn.prove();
      await txn.send();

      const events = await zkAppInstance.fetchEvents();

      expect('bioAuthorizedAccount').toEqual(events[0].type);
      const eventValue0 = events[0].event;
      expect(eventValue0).toEqual(userPublicKey);

      expect('bioAuthorizedMessage').toEqual(events[1].type);
      const eventValue1 = events[1].event.toFields(null)[0];
      expect(eventValue1).toEqual(payload);
    });

    it('throws an error if the timestamp on the oracle response has expired', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      // !! set the local blockchain time to be in the future
      Local.setTimestamp(UInt64.from(Date.now() + BIOAUTH_TTL + 1000));

      expect(async () => {
        await Mina.transaction(deployerAccount, () => {
          zkAppInstance.verifyMessage(
            payload,
            timestamp,
            bioAuthId,
            signature ?? fail('something is wrong with the signature')
          );
        });
      }).rejects;
    });

    it('throws an error if the oracle signature is invalid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      const data = {
        data: {
          payload: '1',
          timestamp: '1670467803093',
          bioAuthId:
            '1391777418574392779706621352966998843662998262631589378793598464749407397987',
        },
        signature: {
          r: '3944738628665209662363613258118115619702760042099078922610298516769343672850', // << wrong
          s: '21126437327761612007332534776266668885298517943731782631680322180607779695605',
        },
        publicKey: 'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu',
      };

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      expect(async () => {
        await Mina.transaction(deployerAccount, () => {
          zkAppInstance.verifyMessage(
            payload,
            timestamp,
            bioAuthId,
            signature ?? fail('something is wrong with the signature')
          );
        });
      }).rejects;
    });
  });
});
