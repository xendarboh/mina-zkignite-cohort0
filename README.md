# zkBioAuth

## Mina x Humanode

Bridging Humanode with Mina zkApps to facilitate Zero-Knowledge proofs of
unique, living, biometric identity without revealing any personally identifying
information.

## Features & Facilitations

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

## Project Components

### zkApp

#### UI & Smart Contracts

- ✅ bioauthorize generic data using the Mina x Humanode ZK Oracle
- 🚧 register a Mina account as a bio-authorized account belonging to a unique
  living human

### Libraries

#### snarky-bioauth

Provides utilities for interacting with a zkBioAuth Oracle and working with
bioAuth ZK proofs within Mina Smart Contracts.

### Oracle

A Mina _Oracle_ and _Offline Storage Server_ that enables users to use Humanode
crypto-biometric identifiers to bioauthorize signed and timestamped proofs.

#### Oracle Test

Used to mock behavior of the deployed zkBioAuth Oracle for local development and
tests.

## Build

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
