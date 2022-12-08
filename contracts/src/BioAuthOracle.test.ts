import { BioAuthOracle } from './BioAuthOracle';

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

let proofsEnabled = false;
function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain({ proofsEnabled });
  Local.setTimestamp(UInt64.from(Date.now()));
  Mina.setActiveInstance(Local);

  const deployerAccount: PrivateKey = Local.testAccounts[0].privateKey;
  const userAccount: PrivateKey = Local.testAccounts[1].privateKey;
  return [deployerAccount, userAccount];
}

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

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) BioAuthOracle.compile();
  });

  beforeEach(async () => {
    [deployerAccount, userAccount] = createLocalBlockchain();
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
    it('emits an `verified` event containing the payload if the bioauth, timestamp, and signature are valid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      // sign the public key to create the payload to bioauthenticate
      const userPublicKey = userAccount.toPublicKey();
      const sig = Signature.create(userAccount, userPublicKey.toFields());
      const sigHash = Poseidon.hash(sig.toFields()).toString();

      const response = await fetch(`${ORACLE_URL}/${sigHash}`);
      const data = await response.json();

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.verifyAccount(
          userPublicKey,
          sig,
          payload,
          timestamp,
          bioAuthId,
          signature ?? fail('something is wrong with the signature')
        );
      });
      await txn.prove();
      await txn.send();

      const events = await zkAppInstance.fetchEvents();
      const verifiedEventValue = events[0].event.toFields(null)[0];
      expect(verifiedEventValue).toEqual(payload);
    });

    /*
    it('throws an error if the credit score is below 700 even if the provided signature is valid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      const response = await fetch(`${ORACLE_URL}/2`);
      const data = await response.json();

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      expect(async () => {
        await Mina.transaction(deployerAccount, () => {
          zkAppInstance.verify(
            payload,
            timestamp,
            bioAuthId,
            signature ?? fail('something is wrong with the signature')
          );
        });
      }).rejects;
    });
    */
  });

  describe('hardcoded values', () => {
    it('emits an `verified` event containing the payload if the bioauth, timestamp, and signature are valid', async () => {
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
          r: '3944738628665209662363613258118115619702760042099078922610298516769343672854',
          s: '21126437327761612007332534776266668885298517943731782631680322180607779695605',
        },
        publicKey: 'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu',
      };

      const payload = Field(data.data.payload);
      const timestamp = Field(data.data.timestamp);
      const bioAuthId = Field(data.data.bioAuthId);
      const signature = Signature.fromJSON(data.signature);

      const txn = await Mina.transaction(deployerAccount, () => {
        zkAppInstance.verify(
          payload,
          timestamp,
          bioAuthId,
          signature ?? fail('something is wrong with the signature')
        );
      });
      await txn.prove();
      await txn.send();

      const events = await zkAppInstance.fetchEvents();
      const verifiedEventValue = events[0].event.toFields(null)[0];
      expect(verifiedEventValue).toEqual(payload);
    });

    /*
    it('throws an error if the credit score is below 700 even if the provided signature is valid', async () => {
      const zkAppInstance = new BioAuthOracle(zkAppAddress);
      await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

      const payload = Field(2);
      const creditScore = Field(536);
      const signature = Signature.fromJSON({
        r: '2436106470933997614045177223040277450257259428240771442982388663010122787559',
        s: '758829175171518312245037419834983816096277581883909212570129668321294477673',
      });

      expect(async () => {
        await Mina.transaction(deployerAccount, () => {
          zkAppInstance.verify(
            payload,
            creditScore,
            signature ?? fail('something is wrong with the signature')
          );
        });
      }).rejects;
    });
    */

    it('throws an error if the provided signature is invalid', async () => {
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
          zkAppInstance.verify(
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
