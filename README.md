# DEPRECATED

This repository has been deprecated and the code now lives in the [clarinet repository](https://github.com/hirosystems/clarinet).
- [Clarity LSP](https://github.com/hirosystems/clarinet/tree/develop/components/clarity-lsp)
- [Clarity VSCode extension](https://github.com/hirosystems/clarinet/tree/develop/components/clarity-vscode)

---

## Clarity for Visual Studio Code

Clarity is a **decidable** smart contract language that optimizes for predictability and security, designed by Blockstack. Smart contracts allow developers to encode essential business logic on a blockchain.

A programming language is decidable if you can know, with certainty, from the code itself what the program will do. Clarity is intentionally Turing incomplete as it avoids `Turing complexity`. This allows for complete static analysis of the entire call graph of a given smart contract. Further, our support for types and type checker can eliminate whole classes of bugs like unintended casts, reentrancy bugs, and reads of uninitialized values.

The Language Server Protocol (LSP) defines the protocol used between an editor or IDE and a language server that provides language features like auto complete, go to definition, find all references etc.

This project aims at leveraging the decidability quality of Clarity and the LSP for providing some great insights about your code, without publishing your smart contracts to a blockchain.

## Quick Start
### Dependencies

This extension relies on a local installation of Clarinet, at or above version 0.22.0. To install Clarinet, please follow the instructions [here](https://github.com/hirosystems/clarinet#installation).

### VSCode

You can install the latest release of the plugin from the [marketplace](https://marketplace.visualstudio.com/items?itemName=hirosystems.clarity-lsp).
## Initial feature set

- [x] Auto-complete native functions
- [x] Check contract on save, and display errors inline.
- [x] VS-Code support

## Additional desired features (not exhaustive, not prioritized)

- [x] Auto-complete user defined functions
- [x] Resolve contract-call targeting local contracts
- [x] Support for traits
- [x] Support for multiple errors
- [ ] Inline documentation
- [ ] Return and display cost analysis
- [ ] Resolve contract-call targeting deployed contracts
