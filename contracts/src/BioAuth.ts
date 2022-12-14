import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  UInt64,
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

export class BioAuth extends SmartContract {
  @state(Field) numBioAuthed = State<Field>();
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  @state(UInt64) bioAuthTTL = State<UInt64>();

  events = {
    bioAuthedAccount: PublicKey,
  };

  init() {
    super.init();
    this.numBioAuthed.set(Field(1));
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    this.bioAuthTTL.set(UInt64.from(BIOAUTH_TTL));
  }

  @method bioAuthorizeAccount(
    oracleMsg: BioAuthorizedMessage,
    user: PublicKey
  ) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);

    // Get the current bioauth counter
    const currentState = this.numBioAuthed.get();
    this.numBioAuthed.assertEquals(currentState);

    // Check that the message is bioauthenticated
    ProvableBioAuth.checkMessage(oraclePublicKey, oracleMsg).assertTrue();

    // Increment the bioauth counter
    const newState = currentState.add(1);
    this.numBioAuthed.set(newState);

    // Emit an event containing the verified account
    this.emitEvent('bioAuthedAccount', user);
  }
}
