import { Field } from 'snarkyjs';
import { payloadToBase58 } from './util';

export { BioAuthOracle };

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
   * Get a URL to retrieve the data for a bioauth'd payload.
   * The response status will have 404 if the payload has not yet been authed.
   *
   * @return {*}  {string}
   * @memberof BioAuthOracle
   */
  public async fetchBioAuth(payload: Field): Promise<Response> {
    const id = payloadToBase58(payload);
    return await fetch(`${this.url}/${id}`);
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
