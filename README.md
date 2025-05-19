       /     /   ▶ Bitcoin Indexer
      / --- /      Index Bitcoin meta-protocols like Ordinals, BRC-20, and Runes.
     /     /

- [Features](#features)
- [Quick Start](#quick-start)
  - [Installing](#installing)
  - [Running the Indexer](#running-the-indexer)
  - [Running an API](#running-an-api)
- [Configuration](#configuration)
- [System Requirements](#system-requirements)
  - [Postgres](#postgres)
- [Contribute](#contribute)
  - [Code of Conduct](#code-of-conduct)
  - [Contributing Guide](#contributing-guide)
- [Community](#community)

***

# Features

**Bitcoin Indexer** is a tool that continuously reads Bitcoin blocks from a connected Bitcoin
node in order to extract and index meta-protocol data contained within it. Once indexed, data is
stored in a Postgres DB and can be made available to clients or users via REST APIs.

# Quick Start

## Installing

```console
$ git clone https://github.com/hirosystems/bitcoin-indexer.git
$ cd bitcoin-indexer
$ cargo bitcoin-indexer-install
```

Docker images are also available at https://hub.docker.com/r/hirosystems/bitcoin-indexer

Note: You may need to install additional LLVM and Clang dependencies if they are not already available on your system.

## Running the Indexer

The following command will start indexing Ordinals activity and will continue to stream new blocks
once it reaches the Bitcoin chain tip.
```console
$ bitcoin-indexer ordinals service start --config-path <path>
```

A similar command exists for indexing Runes
```console
$ bitcoin-indexer runes service start --config-path <path>
```

A fully synced Bitcoin node is required for indexing to start.

## Running an API

Once the index starts advancing, you can deploy the Ordinals API or Runes API to read the same data
via REST endpoints.

# Configuration

Indexer configurations are set via a TOML file. To generate a new config file, run this command:
```console
$ bitcoin-indexer config new
```

Postgres database configurations are set like this. Each index will have its own database.
```toml
[ordinals.db]
database = "ordinals"
host = "localhost"
port = 5432
username = "postgres"
password = "postgres"
```

Ordinals meta-protocols like BRC-20 are also configured in this file
```toml
[ordinals.meta_protocols.brc20]
enabled = true
lru_cache_size = 10000

[ordinals.meta_protocols.brc20.db]
database = "brc20"
host = "localhost"
port = 5432
username = "postgres"
password = "postgres"
```

# System Requirements

The Bitcoin Indexer is resource-intensive, demanding significant CPU, memory and disk capabilities.
As we continue to refine and optimize, keep in mind the following system requirements and
recommendations to ensure optimal performance:

* CPU: The ordhook tool efficiently utilizes multiple cores when detected at runtime, parallelizing
tasks to boost performance.

* Memory: A minimum of 16GB RAM is recommended.

* Disk: To enhance I/O performance, SSD or NVMe storage is suggested.

* OS Requirements: Ensure your system allows for a minimum of 4096 open file descriptors.
Configuration may vary based on your operating system. On certain systems, this can be adjusted
using the `ulimit` command or the `launchctl limit` command.

## Postgres

To store indexed data, a Postgres database is required per index (ordinals, runes, etc.).
It is recommended to use Postgres 17+ for optimal performance.

## Bitcoin Node

To index data, a Bitcoin Node is required.
The indexer officially supports Bitcoin Core versions 0.24.x and 0.25.x.

# Contribute

Development of this product happens in the open on GitHub, and we are grateful
to the community for contributing bugfixes and improvements. Read below to learn
how you can take part in improving the product.

## Code of Conduct
Please read our [Code of conduct](../../../.github/blob/main/CODE_OF_CONDUCT.md)
since we expect project participants to adhere to it. 

## Contributing Guide
Read our [contributing guide](.github/CONTRIBUTING.md) to learn about our
development process, how to propose bugfixes and improvements, and how to build
and test your changes.

# Community

Join our community and stay connected with the latest updates and discussions:

- [Join our Discord community chat](https://discord.gg/ZQR6cyZC) to engage with
  other users, ask questions, and participate in discussions.

- [Visit hiro.so](https://www.hiro.so/) for updates and subcribing to the
  mailing list.

- Follow [Hiro on Twitter.](https://twitter.com/hirosystems)
