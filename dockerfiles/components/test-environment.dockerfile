FROM rust:bullseye as build

WORKDIR /src

# Install librocksdb and all dependencies including clang explicitly
RUN apt-get update && apt-get install -y \
    # build-essential \
    librocksdb-dev \
    ca-certificates \
    pkg-config \
    libssl-dev \
    libunwind-dev \
    libunwind8 \
    curl \
    gnupg \
    libsnappy-dev
RUN rustup update 1.85 && rustup default 1.85

# Install Docker CLI and Docker Compose
# RUN apt-get update && apt-get install -y \
#     apt-transport-https \
#     software-properties-common \
#     lsb-release && \
#     mkdir -p /etc/apt/keyrings && \
#     curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
#     echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
#     $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
#     apt-get update && \
#     apt-get install -y docker-ce-cli docker-compose-plugin

CMD ["bash"] 
