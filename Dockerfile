ARG UBUNTU_IMAGE=docker.io/ubuntu:noble-20260210.1

# -------------- UBUNTU BASE IMAGE ---------------
FROM ${UBUNTU_IMAGE} AS docker_base_image
ENV USERNAME=app
ENV GROUPNAME=app
SHELL ["/bin/bash", "--login", "-o", "pipefail", "-c"]
RUN apt-get update && \
    apt-get install -y build-essential=12.10ubuntu1 --no-install-recommends && \
    apt-get install -y ca-certificates=20260816ubuntu0.24.04.2 --no-install-recommends && \
    apt-get install -y wget=1.21.4-1ubuntu4.5 --no-install-recommends && \
    apt-get install -y curl=8.5.0-2ubuntu10.16 --no-install-recommends && \
    apt-get install -y git=1:2.43.0-1ubuntu7.4 --no-install-recommends && \
    apt-get install -y openssh-client=1:9.6p1-3ubuntu13.20 --no-install-recommends && \
    apt-get install -y linux-libc-dev=6.8.0-151.151 --no-install-recommends --allow-downgrades && \
    apt-get install -y --only-upgrade gpgv=2.4.4-2ubuntu17.6  --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN userdel --remove ubuntu && \
    groupadd --system --gid 1000 "${GROUPNAME}" && \
    useradd --system --uid 1000 --gid 1000 "${USERNAME}"
USER ${USERNAME}
WORKDIR /home/${USERNAME}

ENV BINDIR=/home/${USERNAME}/.local/bin
ENV PATH="${BINDIR}:${PATH}"

# -------------- PYTHON BUILDER ---------------
FROM docker_base_image AS python_builder
SHELL ["/bin/bash", "--login", "-o", "pipefail", "-c"]

USER ${USERNAME}
ARG PROJECT_NAME=NO_PROJECT_PROVIDED
ENV PROJECT_NAME=${PROJECT_NAME}
ENV APP_SOURCES=/home/${USERNAME}/app_source
ENV UV_CACHE_DIR=/home/${USERNAME}/.cache/uv

RUN wget -Lq -O - https://astral.sh/uv/0.10.4/install.sh | sh && \
    wget -Lq -O "${BINDIR}/sops" https://github.com/getsops/sops/releases/download/v3.12.1/sops-v3.12.1.linux.amd64 && chmod +x "${BINDIR}/sops"

COPY --chown=1000:1000 ./Makefile ${APP_SOURCES}/Makefile
COPY --chown=1000:1000 ./build_secrets ${APP_SOURCES}/build_secrets
COPY --chown=1000:1000 ./projects ${APP_SOURCES}/projects

WORKDIR ${APP_SOURCES}

RUN --mount=type=secret,id="age_key",uid="1000",gid="1000",target="/tmp/age.key" \
    --mount=type=cache,target="/home/${USERNAME}/.cache/uv",uid="1000",gid="1000" \
    mkdir -p "/home/${USERNAME}/.ssh" && \
    ssh-keyscan github.com >> "/home/${USERNAME}/.ssh/known_hosts" 2>/dev/null && \
    SOPS_AGE_KEY_FILE=/tmp/age.key sops --decrypt build_secrets/github_ssh_key \
        > "/home/${USERNAME}/.ssh/id_ed25519" && \
    chmod 600 "/home/${USERNAME}/.ssh/id_ed25519" && \
    ssh-keygen -l -f "/home/${USERNAME}/.ssh/id_ed25519" && \
    SOPS_AGE_KEY_FILE=/tmp/age.key make install-tooling && \
    DOCKER_BUILD=1 \
    GIT_SSH_COMMAND="ssh -i /home/${USERNAME}/.ssh/id_ed25519 -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/home/${USERNAME}/.ssh/known_hosts -o IdentitiesOnly=yes" \
    SOPS_AGE_KEY_FILE=/tmp/age.key make install ${PROJECT_NAME}
