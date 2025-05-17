FROM rust:bullseye AS build

WORKDIR /src

RUN apt-get update && \
    apt-get install -y \
    wget && \
    wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - && \
    echo "deb http://apt.llvm.org/bullseye/ llvm-toolchain-bullseye-18 main" >> /etc/apt/sources.list.d/llvm.list && \
    gnupg \
    ca-certificates \
    pkg-config \
    libssl-dev \
    libunwind-dev \
    libunwind8 \
    curl \
    libsnappy-dev \
    libgflags-dev \
    zlib1g-dev \
    libbz2-dev \
    liblz4-dev \
    libzstd-dev \
    clang-18 \
    libclang-18-dev \
    llvm-18-dev
RUN rustup update 1.85 && rustup default 1.85

RUN mkdir /out
COPY ./Cargo.toml /src/Cargo.toml
COPY ./Cargo.lock /src/Cargo.lock
COPY ./components /src/components
COPY ./migrations /src/migrations

RUN cargo build --features release --release
RUN cp /src/target/release/bitcoin-indexer /out

FROM debian:bullseye-slim

# Install runtime dependencies for LLVM/Clang 18 and other necessary libs
RUN apt-get update && \
    apt-get install -y \
    wget && \
    wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - && \
    echo "deb http://apt.llvm.org/bullseye/ llvm-toolchain-bullseye-18 main" >> /etc/apt/sources.list.d/llvm.list && \
    gnupg \
    ca-certificates \
    pkg-config \
    libssl-dev \
    libunwind-dev \
    libunwind8 \
    libsnappy-dev \
    libgflags-dev \
    zlib1g-dev \
    libbz2-dev \
    liblz4-dev \
    libzstd-dev \
    clang-18 \
    libclang-18-dev \
    llvm-18-dev

COPY --from=build /out/bitcoin-indexer /bin/bitcoin-indexer

WORKDIR /workspace

ENTRYPOINT ["bitcoin-indexer"]
