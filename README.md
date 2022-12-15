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
