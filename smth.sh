# Build the image targeting the build stage
docker build --no-cache -t test-bitcoin-indexer -f dockerfiles/components/bitcoin-indexer.dockerfile .

# Run the tests
docker run -it --rm \
  -v $(pwd):/src \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --network host \
  bitcoin-indexer \
  cargo test --workspace
