import { PublicKey, Struct, UInt64 } from 'snarkyjs';

export { BioAuthorizedIdentity };

/**
 * A bio-authorized identity. It exists as a Mina PublicKey association with a
 * BioAuthId (unique per living human) that is registered with the Oracle. This
 * is different from a BioAuthorizedAccount in that there is a guarantee that
 * the BioAuthId is uniquely associated with the PublicKey (one and only one
 * association) to facilitate Sybil-Resistant Accounts, thus provable unique
 * "Identity".
 *
 * @class BioAuthorizedIdentity
 */
class BioAuthorizedIdentity extends Struct({
  publicKey: PublicKey,
  ttl: UInt64,
}) {
  /**
   * Increment the BioAuthorizedIdentity TTL (validity time).
   * Note: Experimental.
   *
   * @param {number} microseconds
   * @return {*} BioAuthorizedIdentity
   */
  incrementTTL(microseconds: number): BioAuthorizedIdentity {
    return new BioAuthorizedIdentity({
      publicKey: this.publicKey,
      ttl: this.ttl.add(microseconds),
    });
  }
}
