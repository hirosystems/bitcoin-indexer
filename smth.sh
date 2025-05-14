# Build the image targeting the build stage
docker build --no-cache -t test-environment -f dockerfiles/components/bitcoin-indexer.dockerfile .

# Run the tests
docker run -it --rm \
  -v $(pwd):/src \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --network host \
  test-environment \
  cargo test --workspace
