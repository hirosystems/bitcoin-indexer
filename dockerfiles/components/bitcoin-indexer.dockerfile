FROM rust:bullseye AS build

WORKDIR /src

RUN apt-get update && apt-get install -y ca-certificates pkg-config libssl-dev libclang-11-dev libunwind-dev libunwind8 curl gnupg
RUN rustup update 1.81 && rustup default 1.81

RUN mkdir /out
COPY ./Cargo.toml /src/Cargo.toml
COPY ./Cargo.lock /src/Cargo.lock
COPY ./components /src/components
COPY ./migrations /src/migrations

RUN cargo build --features release --release
RUN cp /src/target/release/bitcoin-indexer /out

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y ca-certificates libssl-dev libclang-11-dev libunwind-dev libunwind8
COPY --from=build /out/bitcoin-indexer /bin/bitcoin-indexer

WORKDIR /workspace

ENTRYPOINT ["bitcoin-indexer"]
