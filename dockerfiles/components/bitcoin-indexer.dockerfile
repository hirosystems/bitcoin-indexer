FROM rust:bullseye AS build

WORKDIR /src

RUN apt-get update && apt-get install -y --no-install-recommends wget gnupg ca-certificates && \
    wget https://apt.llvm.org/llvm.sh && \
    chmod +x llvm.sh && \
    ./llvm.sh 18 bullseye && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
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
RUN apt-get update && apt-get install -y --no-install-recommends wget gnupg ca-certificates && \
    wget https://apt.llvm.org/llvm.sh && \
    chmod +x llvm.sh && \
    ./llvm.sh 18 bullseye && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    libssl-dev \
    libunwind-dev \
    libunwind8 \
    libsnappy1v5 \
    libgflags2.2 \
    zlib1g \
    libbz2-1.0 \
    liblz4-1 \
    libzstd1 \
    libclang-18-dev # Or specific runtime libraries like libclang1-18, libllvm18
    # We might need more specific runtime libraries here instead of libclang-18-dev.
    # For now, let's include libclang-18-dev and see if it pulls the necessary .so files.
    # Alternatively, it might be libllvm18, libclang1-18 etc.
COPY --from=build /out/bitcoin-indexer /bin/bitcoin-indexer

WORKDIR /workspace

ENTRYPOINT ["bitcoin-indexer"]
