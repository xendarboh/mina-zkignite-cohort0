import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  UInt64,
  Poseidon,
} from 'snarkyjs';

////////////////////////////////////////////////////////////////////////
// 2022-12-13 workaround: Because of snarky w0nk with some imports...
// AND eslint b0rk on symlinks, use this to deploy:
// $ ln -s ../lib/snarky-bioauth/src lib/snarky-bioauth
// import {
//   BioAuthorizedMessage,
//   ProvableBioAuth,
// } from '../lib/snarky-bioauth/bioauth.js';

// OR use this to test
import { BioAuthorizedMessage, ProvableBioAuth } from 'snarky-bioauth';
////////////////////////////////////////////////////////////////////////

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qpxcmAq7DFDFk1wGrishcNTEVgwZaVbtsTFEc8CiARFt31oauHsu';

// The amount of time (in milliseconds) that the timestamped oracle-signed
// bio-authorization is valid
export const BIOAUTH_TTL = 1000 * 60 * 10; // 10 minutes

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class Add extends SmartContract {
  @state(Field) num = State<Field>();
  @state(Field) numBioAuthed = State<Field>();
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  @state(UInt64) bioAuthTTL = State<UInt64>();

  init() {
    super.init();
    this.num.set(Field(1));
    this.numBioAuthed.set(Field(1));
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    this.bioAuthTTL.set(UInt64.from(BIOAUTH_TTL));
  }

  @method update() {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(2);
    this.num.set(newState);
  }

  @method updateBioAuthed(oracleMsg: BioAuthorizedMessage) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);

    // Check that the message is bioauthenticated
    ProvableBioAuth.checkMessage(oraclePublicKey, oracleMsg).assertTrue();

    /* timestamps... seem to have issues on berkeley testnet
    // get the bioauth time-to-live from the contract state
    const bioAuthTTL = this.bioAuthTTL.get();
    this.bioAuthTTL.assertEquals(bioAuthTTL);

    const currentTime = this.network.timestamp.get();
    this.network.timestamp.assertEquals(currentTime);

    const expireTime = UInt64.from(oracleMsg.timestamp).add(bioAuthTTL);

    ProvableBioAuth.checkTTL(oracleMsg, currentTime, expireTime).assertTrue();
    */

    const currentState = this.numBioAuthed.get();
    this.numBioAuthed.assertEquals(currentState);

    // Check that the bioauthenticated payload matches the current number
    oracleMsg.payload.assertEquals(Poseidon.hash(currentState.toFields()));

    const newState = currentState.add(2);
    this.numBioAuthed.set(newState);
  }
}
