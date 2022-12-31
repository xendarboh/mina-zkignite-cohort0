import { Field } from 'snarkyjs';

import { payloadToBase58 } from './util.js';

export { BioAuthOracle };

export type { BioAuthOracleMeta };

/**
 * The returned object from {@link BioAuthOracle.fetchMeta}.
 */
interface BioAuthOracleMeta {
  /** The BioAuth Oracle's Mina publicKey (in base58 format). */
  publicKey: string;
}

/**
 * BioAuthOracle; a client utility for interacting with a BioAuth Oracle server
 * to abstract+establish its API.
 * @class BioAuthOracle
 */
class BioAuthOracle {
  protected url: string;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * From the given payload, returns a signed BioAuth and its id from the
   * oracle server.
   *
   * The id is always returned so an auth link may be requested.
   *
   * The signed data is null if it does not exist.
   *
   * @return {*}  {[string, null | string]}
   * @memberof BioAuthOracle
   */
  // public async fetchBioAuth(payload: Field): Promise<null | string> {
  public async fetchBioAuth(payload: Field): Promise<[string, null | string]> {
    const id = payloadToBase58(payload);
    const response = await fetch(`${this.url}/${id}`);

    if (response.status == 404) return [id, null];

    const data = await response.json();
    return [id, JSON.stringify(data)];
  }

  /**
   * Fetch meta information from the BioAuth Oracle.
   *
   * @returns The BioAuthoracle's meta info or null upon error.
   */
  public async fetchMeta(): Promise<null | BioAuthOracleMeta> {
    const response = await fetch(`${this.url}/meta`);
    if (response.status !== 200) return null;
    const data = (await response.json()) as BioAuthOracleMeta;
    return data;
  }

  /**
   * Get a URL (for a user to follow) for bioauth for the given payload (base58
   * string).
   *
   * @return {*}  {string}
   * @memberof BioAuthOracle
   */
  public getBioAuthLink(id: string): string {
    return `${this.url}/auth/${id}`;
  }
}
