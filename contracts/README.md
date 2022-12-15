---
label: Contracts
order: 400
---

# zkBioAuth Mina Smart Contracts

## Contracts

- [BioAuthLibrary.ts](https://github.com/xendarboh/mina-zkignite-cohort0/blob/main/contracts/src/BioAuthLibrary.ts)
  BioAuth proof validation using the `snarky-bioauth` library
- [BioAuthOracle.ts](https://github.com/xendarboh/mina-zkignite-cohort0/blob/main/contracts/src/BioAuthOracle.ts)
  BioAuth proof validation without using the `snarky-bioauth` library
- [Add.ts](https://github.com/xendarboh/mina-zkignite-cohort0/blob/main/contracts/src/Add.ts)
  smart contract update requiring a valid BioAuth proof

Check the
[tests](https://github.com/xendarboh/mina-zkignite-cohort0/tree/main/contracts/src)
for more usage of the `snarky-bioauth` library.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
