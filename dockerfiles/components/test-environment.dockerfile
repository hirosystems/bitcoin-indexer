FROM rust:bullseye

WORKDIR /app

# Install the same dependencies as in the bitcoin-indexer.dockerfile
RUN apt-get update && apt-get install -y ca-certificates pkg-config libssl-dev libclang-11-dev libunwind-dev libunwind8 curl gnupg libsnappy-dev libgflags-dev zlib1g-dev libbz2-dev liblz4-dev libzstd-dev

# Create a script to find and properly link libclang
RUN echo '#!/bin/bash\n\
set -e\n\
# Find all libclang.so files\n\
LIBCLANG_FILES=$(find /usr -name "libclang.so" -o -name "libclang-*.so*" | sort)\n\
if [ -z "$LIBCLANG_FILES" ]; then\n\
  echo "No libclang.so found, attempting to install it"\n\
  apt-get update && apt-get install -y --no-install-recommends libclang-dev\n\
  LIBCLANG_FILES=$(find /usr -name "libclang.so" -o -name "libclang-*.so*" | sort)\n\
fi\n\
\n\
# Get the first libclang library\n\
LIBCLANG_PATH=$(dirname $(echo "$LIBCLANG_FILES" | head -n 1))\n\
echo "Found libclang at: $LIBCLANG_PATH"\n\
\n\
# Ensure the symbolic links exist\n\
mkdir -p /usr/lib/llvm-11/lib/\n\
if [ ! -e /usr/lib/llvm-11/lib/libclang.so ]; then\n\
  ln -sf $LIBCLANG_PATH/$(basename $(echo "$LIBCLANG_FILES" | head -n 1)) /usr/lib/llvm-11/lib/libclang.so\n\
  echo "Created symlink /usr/lib/llvm-11/lib/libclang.so -> $LIBCLANG_PATH/$(basename $(echo "$LIBCLANG_FILES" | head -n 1))"\n\
fi\n\
\n\
if [ ! -e /usr/lib/libclang.so ]; then\n\
  ln -sf $LIBCLANG_PATH/$(basename $(echo "$LIBCLANG_FILES" | head -n 1)) /usr/lib/libclang.so\n\
  echo "Created symlink /usr/lib/libclang.so -> $LIBCLANG_PATH/$(basename $(echo "$LIBCLANG_FILES" | head -n 1))"\n\
fi\n\
\n\
# Export variables\n\
echo "export LIBCLANG_PATH=$LIBCLANG_PATH:/usr/lib/llvm-11/lib:/usr/lib" > /etc/profile.d/libclang.sh\n\
echo "export BINDGEN_EXTRA_CLANG_ARGS=\"-I/usr/lib/llvm-11/include\"" >> /etc/profile.d/libclang.sh\n\
\n\
# Print diagnostic information\n\
echo "LIBCLANG_PATH=$LIBCLANG_PATH:/usr/lib/llvm-11/lib:/usr/lib"\n\
ls -la $LIBCLANG_PATH/libclang*.so* /usr/lib/llvm-11/lib/ /usr/lib/libclang* 2>/dev/null || true\n\
' > /usr/local/bin/setup-libclang.sh && chmod +x /usr/local/bin/setup-libclang.sh

# Run the script during build
RUN /usr/local/bin/setup-libclang.sh

# Install Docker CLI and Docker Compose
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    software-properties-common \
    curl \
    gnupg \
    lsb-release && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin

# Set environment variables to help with libclang issues
ENV LIBCLANG_PATH=/usr/lib/llvm-11/lib:/usr/lib:/usr/lib/x86_64-linux-gnu
ENV RUST_BACKTRACE=FULL
ENV BINDGEN_EXTRA_CLANG_ARGS="-I/usr/lib/llvm-11/include"

# Additional environment variables for RocksDB build
ENV ROCKSDB_LIB_DIR=/usr/lib/x86_64-linux-gnu
ENV ROCKSDB_STATIC=1

# Updated Rust version to match
RUN rustup update 1.81 && rustup default 1.81

# Add a startup script that will always run the libclang setup
RUN echo '#!/bin/bash\n\
/usr/local/bin/setup-libclang.sh\n\
exec "$@"\n\
' > /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"] 
