# zkBioAuth

## Mina <•> Humanode

Bridging Humanode with Mina to facilitate Zero-Knowledge proofs of unique living
humans with biometric identity and authentication on Mina.

Docs: [https://mina-hmnd.zkhumans.io/](https://mina-hmnd.zkhumans.io/)

Production Oracle repo:
[mina-oracle-humanode](https://github.com/xendarboh/mina-oracle-humanode)

## Facilitations

- proof of living human (real human, no bots)
  - Mina zkApps may utilize Humanode's Proof-of-Liveness to restrict
    SmartContract functions to living humans
  - bioAuths are timestamped to restrict the timeframe of the authorization
- proof of unique human (Sybil-resistance)
  - Mina zkApps may utilize Humanode's Proof-of-Uniqueness to restrict
    SmartContract functions to unique humans
- biometric keys; Mina zkApps may use BioAuth proofs to;
  - perform on-chain functions using ZK proof of biometric ownership as a key
  - use biometrics as an authentication factor in addition to a Mina account
- self-sovereign identity on Mina Protocol with ZK-powered anonymous biometrics
  - strong definitive association of identifiers to individual humans with
    complete privacy and anonmity

## How it works

Mina Smart Contracts may require and utilize proof of bio-authorization
timestamped and signed by the zkBioAuth Oracle using a human's unique
crypto-biometric identifier as provided by Humanode.

General process and user interaction, a Mina zkApp:

- has or creates generic data to be bioAuthorized by a human
- requests the oracle for a signed bioAuthorization of the data (aka a
  "bioAuth") as identified by the hash of that data
- if bioAuth is not yet available or has expired, directs users to the
  interactive oracle where they "login" with their biometrics via Humanode OAuth
  and thus authorize the hash of the data
- when bioAuth is available, includes it in a Mina transaction for verification
  within a smart contract

## Deployments

- Oracle: [https://auth.zkhumans.io/](https://auth.zkhumans.io/)
- zkApp:
  [https://mina-hmnd.zkhumans.io/zkApp/](https://mina-hmnd.zkhumans.io/zkApp/)

## Project Components

### zkApp

- ✅ demonstrate bioauth of generic data using the Mina <•> Humanode ZK Oracle
- 🚧 register a Mina account as a bio-authorized account belonging to a unique
  living human

### Oracle

An interactive cross-chain Mina _Oracle_ and _Offline Storage Server_ that
enables users to use Humanode crypto-biometric identifiers to bioauthorize
signed and timestamped proofs.

### oracle-test

Used to mock behavior of the deployed zkBioAuth Oracle for local development and
tests.

### snarky-bioauth library

Utilities for interacting with a zkBioAuth Oracle and working with bioAuth ZK
proofs within Mina Smart Contracts and zkApps.

## Build

Refer to the
[Dockerfile](https://github.com/xendarboh/mina-zkignite-cohort0/blob/main/Dockerfile)
for order and details of a complete build of the components.

For the production oracle, refer to its project repo:
[mina-oracle-humanode](https://github.com/xendarboh/mina-oracle-humanode).

1. To support local development, `npm link` the `snarky-bioauth` library in each
   of the project components, manually or with the helper script:
   ```sh
   scripts/npm-link-libs.sh
   ```
1. Run the test oracle prior to running contract tests.
1. For UI, build contracts first.

## Deploy

See individual components for their specific-deployment options.

### Docker

The static HTML zkApp and documentation may be deployed with docker.

1. Copy the example config environment, then edit `.env`
   ```sh
   cp .env.example .env
   ```
1. Build and run the docker container (designed to run with
   [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) +
   [automated SSL](https://github.com/nginx-proxy/acme-companion))
   ```sh
   docker compose --profile production up
   ```

## Hackathon Submission

This project originated as a submission for Mina Protocol's Hackathon
[zkIgnite, Cohort 0 ](https://minaprotocol.com/blog/zkignite-cohort0).

- A demo zkApp of using the Oracle: [here](https://mina-hmnd.zkhumans.io/zkApp/)
- Instructions on how to launch the oracle server and where to find the server
  code:
  [mina-oracle-humanode](https://github.com/xendarboh/mina-oracle-humanode)
- Instructions on how to use the oracle from a zkApp:
  [How it works](https://github.com/xendarboh/mina-zkignite-cohort0#how-it-works)
- Explanation of where to find the demo code:
  [ui](https://github.com/xendarboh/mina-zkignite-cohort0/tree/main/ui),
  [contracts](https://github.com/xendarboh/mina-zkignite-cohort0/tree/main/contracts/src)
