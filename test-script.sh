#!/bin/bash
set -e

# Start PostgreSQL container
echo "Starting PostgreSQL environment..."
docker compose -f dockerfiles/docker-compose.dev.postgres.yml up -d
echo "PostgreSQL containers started"

# Build the image targeting the build stage
echo "Building Bitcoin Indexer image..."
docker build --no-cache -t test-bitcoin-indexer -f dockerfiles/components/bitcoin-indexer.dockerfile .

# Run the tests
echo "Running tests..."
docker run -it --rm \
  -v $(pwd):/src \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --network host \
  test-bitcoin-indexer \
  bash -c "cd /src && RUST_BACKTRACE=1 cargo test --workspace --color=always --no-fail-fast -- --nocapture --show-output"

# Clean up
echo "Cleaning up containers..."
docker compose -f dockerfiles/docker-compose.dev.postgres.yml down -v -t 0
echo "Test environment cleanup complete"
