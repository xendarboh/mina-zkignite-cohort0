import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
  PrivateKey,
  UInt64,
} from 'snarkyjs';

import { BioAuthorizedMessage, ProvableBioAuth } from '../lib';

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu';

// The amount of time (in milliseconds) that the timestamped oracle-signed
// bio-authorization is valid
export const BIOAUTH_TTL = 1000 * 60 * 10; // 10 minutes

export class BioAuthLibrary extends SmartContract {
  // Define contract state
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  @state(UInt64) bioAuthTTL = State<UInt64>();

  // Define contract events
  events = {
    bioAuthorizedMessage: Field,
    bioAuthorizedAccount: PublicKey,
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init(zkappKey: PrivateKey) {
    super.init(zkappKey);

    // Initialize contract state
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    this.bioAuthTTL.set(UInt64.from(BIOAUTH_TTL));

    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
  }

  // Verify an oracle response for a generic payload
  @method verifyMessage(oracleMsg: BioAuthorizedMessage) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);

    ProvableBioAuth.checkMessage(oraclePublicKey, oracleMsg).assertTrue();

    {
      // get the bioauth time-to-live from the contract state
      const bioAuthTTL = this.bioAuthTTL.get();
      this.bioAuthTTL.assertEquals(bioAuthTTL);

      const currentTime = this.network.timestamp.get();
      this.network.timestamp.assertEquals(currentTime);

      const expireTime = UInt64.from(oracleMsg.timestamp).add(bioAuthTTL);

      ProvableBioAuth.checkTTL(oracleMsg, currentTime, expireTime).assertTrue();
    }

    // Emit an event containing the verified payload
    this.emitEvent('bioAuthorizedMessage', oracleMsg.payload);
  }

  // Verify an oracle response where payload is a hashed signature from a given
  // PublicKey. This is used to associate a Mina PublicKey with an
  // authenticated biometric identifier.
  @method verifyAccount(
    userKey: PublicKey,
    userSig: Signature,
    oracleMsg: BioAuthorizedMessage
  ) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);

    ProvableBioAuth.checkAccount(
      oraclePublicKey,
      oracleMsg,
      userKey,
      userSig
    ).assertTrue();

    {
      const bioAuthTTL = this.bioAuthTTL.get();
      this.bioAuthTTL.assertEquals(bioAuthTTL);

      const currentTime = this.network.timestamp.get();
      this.network.timestamp.assertEquals(currentTime);

      const expireTime = UInt64.from(oracleMsg.timestamp).add(bioAuthTTL);

      ProvableBioAuth.checkTTL(oracleMsg, currentTime, expireTime).assertTrue();
    }

    // Emit an event containing the verified account
    this.emitEvent('bioAuthorizedAccount', userKey);
  }
}
