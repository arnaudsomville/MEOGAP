SHELL := /bin/bash

# Allow short 't' variable for TAG_VERSION
ifeq ($(origin t),command line)
  TAG_VERSION := $(t)
else
  TAG_VERSION ?= latest
endif

# Tooling
LOCAL_BIN ?= $(HOME)/.local/bin
REPO_ROOT ?= $(shell git rev-parse --show-toplevel 2>/dev/null || pwd)
PYTHON_VERSION ?= 3.11
UV_PYTHON_INSTALL_DIR ?= $(REPO_ROOT)/.python
UV_PROJECT_ENVIRONMENT ?= .venv
SOPS_KEY ?= $(HOME)/.config/sops/age/keys.txt
BUILD_SECRETS_DIR ?= $(REPO_ROOT)/build_secrets_decrypted
GIT_SSH_KEY ?= $(BUILD_SECRETS_DIR)/github_ssh_key
GIT_KNOWN_HOSTS ?= $(BUILD_SECRETS_DIR)/known_hosts

# Docker
BUILD_VARIANT ?= production
TAG_VERSION ?= latest
DOCKER_BUILD_CACHE_ARGS ?=
BUILDX ?= docker buildx
BUILDX_BUILDER ?= mc-builder
ifdef DOCKER_BUILD
GIT_SSH_CMD :=
else
GIT_SSH_CMD = GIT_SSH_COMMAND="$(shell $(MAKE) --no-print-directory -s ssh-command)"
endif

# Tests
MIN_TEST_COVERAGE=85

# Harbor
REGISTRY='invalid_registry'
TARGET_BASE_BRANCH ?= origin/main

# Projects
PROJECTS := $(shell ls -1 projects 2>/dev/null)
PYTHON_PROJECTS := $(shell for p in $(PROJECTS); do [ -f "projects/$$p/pyproject.toml" ] && echo "$$p"; done)
NODE_PROJECTS := $(shell for p in $(PROJECTS); do [ -f "projects/$$p/package.json" ] && echo "$$p"; done)
PROJECT ?= $(word 2,$(MAKECMDGOALS))
PROJECT_NAME := $(PROJECT)
PROJECT_TAG := $(shell echo $(PROJECT_NAME) | tr A-Z a-z)

.PHONY: help install install-python install-python-project install-js install-js-project install-modified-projects install-tooling install-dev-tooling ensure-node sync tests tests-all test-modified-projects code-quality code-quality-format code-quality-lint code-quality-type code-quality-dockerfile code-quality-test-files code-quality-modified-projects code-quality-all build build_and_analyse_cve build-all-images build-all build-and-push build-and-push-all docker-builder-create docker-builder-rm docker-clean docker-clean-ci clean clean-all clean-python-artifacts clean-node-artifacts shell docker-push sops-encrypt-all sops-decrypt-all run-meogap stop-meogap free-ports kill-meogap list-projects list-modified-projects ensure-target-base-branch ssh-command install-project ensure-project run-post-install

help:
	@echo "Usage:"
	@echo "  make install                       Install tooling, all Python and JS projects"
	@echo "  make install <proj>                Install one project"
	@echo "  make install-python                Install all Python projects"
	@echo "  make install-js                    Install all Node/React projects"
	@echo "  make install-modified-projects     Install only modified projects"
	@echo "  make sync <proj>                   Sync project lock (uv or npm)"
	@echo "  make tests <proj>                  Run tests for project"
	@echo "  make tests-all                     Run tests for all projects"
	@echo "  make test-modified-projects        Run tests only for modified projects"
	@echo "  make code-quality <proj>           Run code quality hooks for project"
	@echo "  make code-quality-format <proj>    Run formatter (ruff or prettier)"
	@echo "  make code-quality-lint <proj>      Run linter (ruff or eslint)"
	@echo "  make code-quality-type <proj>      Run mypy (Python) or tsc (Node) for project"
	@echo "  make code-quality-dockerfile <proj> Run hadolint for project"
	@echo "  make code-quality-test-files <proj> Check test file parity for project"
	@echo "  make code-quality-modified-projects Run code quality on modified projects"
	@echo "  make build <proj>                  Build Docker image <proj>_local:latest"
	@echo "  make build <proj> t=<tag>          Build Docker image <proj>_local:<tag>"
	@echo "  make build_and_analyse_cve <proj>  Build image then scan HIGH/CRITICAL CVEs"
	@echo "  make build-and-push <proj>         Build and push image to registry"
	@echo "  make build-and-push <proj> t=<tag> Build and push with specific tag"
	@echo "  make build-and-push-all t=<tag>    Build and push all images to registry"
	@echo "  make docker-push                   Push an existing image to registry"
	@echo "       IMAGE_NAME=<name> TAG_VERSION=<tag>"
	@echo "       Uses build_secrets_decrypted/env_variables for Harbor auth"
	@echo "  make build-all-images              Build Docker images for all projects"
	@echo "  make build-all                     Build Docker images for all projects"
	@echo "  make run-meogap                    Build all images and start the MEOGAP stack"
	@echo "  make stop-meogap                   Stop and remove the MEOGAP stack"
	@echo "  make free-ports                    Free MEOGAP ports (8000, 8080, 5173)"
	@echo "  make kill-meogap                   Stop stack, remove images/build cache, free ports"
	@echo "  make docker-clean                  Clean locally-built images (keeps BuildKit cache)"
	@echo "  make docker-clean-ci               CI full cleanup (images, BuildKit cache)"
	@echo "  make clean <proj>                  Remove project environments and caches"
	@echo "  make clean-all                     Remove shared Python runtime and clean all projects"
	@echo "  make list-modified-projects        List projects changed vs base branch"
	@echo "  make shell <proj>                  Open a shell with project venv"
	@echo "  make install-tooling               Install uv/sops/age into ~/.local/bin"
	@echo "  make install-dev-tooling           Install hadolint/trivy/pre-commit into ~/.local/bin"
	@echo "  make sops-encrypt-all              Encrypt build_secrets_decrypted -> build_secrets"
	@echo "  make sops-decrypt-all              Decrypt build_secrets -> build_secrets_decrypted"
	@echo "  make list-projects                 List all projects"
	@echo ""
	@echo "Env vars: PYTHON_VERSION, UV_PYTHON_INSTALL_DIR, UV_PROJECT_ENVIRONMENT, BUILD_VARIANT, TARGET_BASE_BRANCH"


# ---------------------------- Setup ----------------------------

# Project installation
install:
	@if [ -n "$(PROJECT_NAME)" ]; then \
		$(MAKE) install-project PROJECT=$(PROJECT_NAME); \
	else \
		$(MAKE) install-tooling && \
		$(MAKE) install-python && \
		$(MAKE) install-js; \
	fi

# Install every Python project (uv)
install-python:
	@set -e; for p in $(PYTHON_PROJECTS); do $(MAKE) install-python-project PROJECT=$$p || exit $$?; done

# Install every Node/React project (npm)
install-js:
	@$(MAKE) ensure-node
	@set -e; for p in $(NODE_PROJECTS); do $(MAKE) install-js-project PROJECT=$$p || exit $$?; done

# Install projects that have been modified compared to target branch
install-modified-projects:
	@modified_projects="$$( $(MAKE) -s list-modified-projects )"; \
	echo "Running install command for projects $$modified_projects"; \
	if [ -z "$$modified_projects" ]; then \
		echo "No modified projects found."; \
	else \
		set -e; \
		for p in $$modified_projects; do $(MAKE) install-project PROJECT=$$p || exit $$?; done; \
	fi

# Install basic tools necessary for the project (sops / uv / age)
install-tooling:
	@mkdir -p "$(LOCAL_BIN)"
	@command -v uv >/dev/null 2>&1 || (curl -LsSf https://astral.sh/uv/install.sh | sh)
	@command -v sops >/dev/null 2>&1 || (curl -LsSf -o "$(LOCAL_BIN)/sops" https://github.com/getsops/sops/releases/download/v3.12.1/sops-v3.12.1.linux.amd64 && chmod +x "$(LOCAL_BIN)/sops")
	@command -v age >/dev/null 2>&1 || (curl -LsSf -o "/tmp/age.tar.gz" https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz && tar -xzf "/tmp/age.tar.gz" -C "/tmp" && mv "/tmp/age/age" "$(LOCAL_BIN)/age" && mv "/tmp/age/age-keygen" "$(LOCAL_BIN)/age-keygen" && rm -rf "/tmp/age" "/tmp/age.tar.gz")

install-dev-tooling: install-tooling
	@mkdir -p "$(LOCAL_BIN)"
	@command -v hadolint >/dev/null 2>&1 || (curl -LsSf -o "$(LOCAL_BIN)/hadolint" https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 && chmod +x "$(LOCAL_BIN)/hadolint")
	@command -v trivy >/dev/null 2>&1 || (curl -LsSf -o "/tmp/trivy.tar.gz" https://github.com/aquasecurity/trivy/releases/download/v0.71.0/trivy_0.71.0_Linux-64bit.tar.gz && tar -xzf "/tmp/trivy.tar.gz" -C "/tmp" && mv "/tmp/trivy" "$(LOCAL_BIN)/trivy" && rm -f "/tmp/trivy.tar.gz")
	@command -v pre-commit >/dev/null 2>&1 || (uv tool install pre-commit)
	@pre-commit install


# ---------------------------- Secrets ----------------------------
sops-encrypt-all:
	@if [ ! -d "build_secrets_decrypted" ]; then \
		echo "Missing build_secrets_decrypted directory"; \
		exit 1; \
	fi
	@mkdir -p "build_secrets"
	@for f in build_secrets_decrypted/*; do \
		[ -f "$$f" ] || continue; \
		echo "Encrypt file $$f"; \
		sops --encrypt "$$f" > "build_secrets/$$(basename "$$f")"; \
	done

sops-decrypt-all:
	@if [ ! -d "build_secrets" ]; then \
		echo "Missing build_secrets directory"; \
		exit 1; \
	fi
	@if [ -d ".git" ] && ! grep -Fx "build_secrets_decrypted" ".gitignore" >/dev/null 2>&1; then \
		echo "build_secrets_decrypted must be added to .gitignore"; \
		exit 1; \
	fi
	@mkdir -p "build_secrets_decrypted"
	@for f in build_secrets/*; do \
		[ -f "$$f" ] || continue; \
		echo "Decrypt file $$f"; \
		SOPS_AGE_KEY_FILE="$(SOPS_KEY)" sops --decrypt "$$f" > "build_secrets_decrypted/$$(basename "$$f")"; \
		chmod --reference="$$f" "build_secrets_decrypted/$$(basename "$$f")"; \
	done
	@find build_secrets_decrypted/ -type f -exec chmod 600 {} \;

# ---------------------------- Docker build & push ----------------------------
build:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ ! -f "projects/$(PROJECT_NAME)/Dockerfile" ]; then \
		echo "No Dockerfile found in projects/$(PROJECT_NAME). Skipping image build."; \
	else \
		$(MAKE) docker-builder-create && \
		SOPS_KEY="$(SOPS_KEY)" \
		TAG_VERSION="$(TAG_VERSION)" \
		BUILD_VARIANT="$(BUILD_VARIANT)" \
		BUILDX_BAKE_ENTITLEMENTS_FS=0 \
		$(BUILDX) bake -f docker-bake.hcl --builder $(BUILDX_BUILDER) "$(PROJECT_TAG)"; \
	fi

build_and_analyse_cve:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ ! -f "projects/$(PROJECT_NAME)/Dockerfile" ]; then \
		echo "No Dockerfile found in projects/$(PROJECT_NAME). Skipping build and CVE analysis."; \
	else \
		$(MAKE) build PROJECT=$(PROJECT_NAME) && \
		trivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed --ignorefile .trivyignore "$(PROJECT_TAG)_local:$(TAG_VERSION)"; \
	fi

# Docker push command - tag and push an image to registry
# Usage: make docker-push IMAGE_NAME=my_image TAG_VERSION=v1.0
IMAGE_NAME ?=
docker-push:
	@if [ -z "$(IMAGE_NAME)" ] || [ -z "$(TAG_VERSION)" ]; then \
		echo "Usage: make docker-push IMAGE_NAME=<image_name> TAG_VERSION=<version>"; \
		echo "Example: make docker-push IMAGE_NAME=my_project_local TAG_VERSION=v1.0"; \
		exit 1; \
	fi
	@if [ -f "$(BUILD_SECRETS_DIR)/env_variables" ]; then \
		set -a; \
		. "$(BUILD_SECRETS_DIR)/env_variables"; \
		set +a; \
		if [ -n "$$REGISTRY_URL" ] && [ -n "$$HARBOR_PUSH_USERNAME" ] && [ -n "$$HARBOR_PUSH_PASSWORD" ]; then \
			REMOTE_IMAGE_NAME="$$REGISTRY_URL/$(IMAGE_NAME):$(TAG_VERSION)"; \
			printf '%s\n' "$$HARBOR_PUSH_PASSWORD" | docker login "$$REGISTRY_URL" --username "$$HARBOR_PUSH_USERNAME" --password-stdin && \
			docker tag $(IMAGE_NAME):$(TAG_VERSION) "$$REMOTE_IMAGE_NAME" && \
			docker push "$$REMOTE_IMAGE_NAME"; \
		else \
			docker tag $(IMAGE_NAME):$(TAG_VERSION) $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION) && \
			docker push $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION); \
		fi; \
	else \
		docker tag $(IMAGE_NAME):$(TAG_VERSION) $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION) && \
		docker push $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION); \
	fi

# Command to build and push an image to registry
build-and-push:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ "$(TAG_VERSION)" = 'latest' ]; then \
		echo "TAG_VERSION must be set to push to registry."; \
		echo "Usage: make build-and-push <proj> t=<version>"; \
		exit 1; \
	else \
		$(MAKE) build PROJECT=$(PROJECT_NAME) && \
		docker tag $(PROJECT_TAG)_local:$(TAG_VERSION) $(PROJECT_TAG):$(TAG_VERSION) && \
		$(MAKE) docker-push IMAGE_NAME=$(PROJECT_TAG) TAG_VERSION=$(TAG_VERSION); \
	fi

# Create a dedicated BuildKit builder (idempotent — no-op if exists)
docker-builder-create:
	@docker buildx inspect $(BUILDX_BUILDER) >/dev/null 2>&1 || \
		docker buildx create --name $(BUILDX_BUILDER) --driver docker-container --bootstrap

# Remove the dedicated builder (also destroys its isolated build cache)
docker-builder-rm:
	@docker buildx rm $(BUILDX_BUILDER) 2>/dev/null || true

# Clean locally-built images only (keeps BuildKit cache for fast local rebuilds)
docker-clean:
	@found=0; \
	for p in $(PROJECTS); do \
		images=$$(docker images --format '{{.Repository}}:{{.Tag}}' | grep "^$${p}_local:" || true); \
		if [ -n "$$images" ]; then \
			for img in $$images; do \
				echo "  Removing $$img"; \
				docker rmi -f "$$img" >/dev/null 2>&1 || true; \
			done; \
			found=1; \
		fi; \
	done; \
	if [ "$$found" -eq 0 ]; then \
		echo "No locally-built images to remove."; \
	fi

# CI cleanup — remove images + destroy dedicated builder (no system prune)
docker-clean-ci:
	@$(MAKE) stop-meogap 2>/dev/null || true
	@$(MAKE) docker-clean
	@$(MAKE) docker-builder-rm

# ---------------------------- Project Specific Commands ----------------------------

# Sync the project lock (uv for Python, npm for Node)
sync:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		cd "projects/$(PROJECT_NAME)" && \
			UV_PYTHON_INSTALL_DIR="$(UV_PYTHON_INSTALL_DIR)" uv python pin $(PYTHON_VERSION) && \
			$(GIT_SSH_CMD) UV_PYTHON_INSTALL_DIR="$(UV_PYTHON_INSTALL_DIR)" uv lock; \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		cd "projects/$(PROJECT_NAME)" && npm install --package-lock-only; \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

# Run project's tests
tests:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		cd "projects/$(PROJECT_NAME)" && \
			uv run pytest tests -v --durations=1 --cov=src --cov-report=xml --cov-fail-under $(MIN_TEST_COVERAGE); \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		cd "projects/$(PROJECT_NAME)" && npm run test; \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

# ---------------------------- Code Quality ----------------------------

code-quality-format:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		cd "projects/$(PROJECT_NAME)" && \
			uv run bash -lc 'ruff format --check --diff . || { rc=$$?; ruff format .; exit $$rc; }'; \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		cd "projects/$(PROJECT_NAME)" && npm run format:check; \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

code-quality-lint:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		cd "projects/$(PROJECT_NAME)" && \
			uv run bash -lc 'ruff check --fix --diff . || { rc=$$?; ruff check --fix .; exit $$rc; }'; \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		cd "projects/$(PROJECT_NAME)" && npm run lint; \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

code-quality-type:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		cd "projects/$(PROJECT_NAME)" && uv run mypy src; \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		cd "projects/$(PROJECT_NAME)" && npm run typecheck; \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

code-quality-dockerfile:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/Dockerfile" ]; then \
		cd "projects/$(PROJECT_NAME)" && hadolint Dockerfile --ignore DL3003 --ignore SC1091 --ignore DL3022 --ignore DL3006; \
	else \
		echo "No Dockerfile found in projects/$(PROJECT_NAME). Skipping hadolint."; \
	fi

code-quality-test-files:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/package.json" ] && [ ! -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		echo "No Python source files; skipping test parity."; \
	else \
		cd "projects/$(PROJECT_NAME)" && bash -lc 'set -euo pipefail; missing=0; while IFS= read -r file; do base="$$(basename "$$file")"; if ! find ./tests -type f -name "test_$$base" -print -quit | grep -q .; then printf "Warning: tests/**/test_%s not found. Is %s module tested?\n" "$$base" "$$base"; missing=1; fi; done < <(find ./src -type f -name "*.py" ! -name "__init__.py"); if (( missing )); then printf "\nWarning: some test files are missing (non-blocking).\n"; else printf "Test parity OK.\n"; fi'; \
	fi

code-quality:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@$(MAKE) code-quality-format PROJECT=$(PROJECT_NAME)
	@$(MAKE) code-quality-lint PROJECT=$(PROJECT_NAME)
	@$(MAKE) code-quality-type PROJECT=$(PROJECT_NAME)
	@$(MAKE) code-quality-dockerfile PROJECT=$(PROJECT_NAME)
	@$(MAKE) code-quality-test-files PROJECT=$(PROJECT_NAME)

# Run code quality on all projects
code-quality-all:
	@set -e; for p in $(PROJECTS); do $(MAKE) code-quality $$p || exit $$?; done

# Run a shell with project's venv activated
shell:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@cd "projects/$(PROJECT_NAME)" && \
		. .venv/bin/activate && \
		$$SHELL

# ---------------------------- Monorepo level command ----------------------------

# Run all tests
tests-all:
	@set -e; for p in $(PROJECTS); do $(MAKE) tests $$p || exit $$?; done

# Run tests for modified projects compared to target base branch
test-modified-projects:
	@modified_projects="$$( $(MAKE) -s list-modified-projects )"; \
	echo "Running test command for projects $$modified_projects"; \
	if [ -z "$$modified_projects" ]; then \
		echo "No modified projects found."; \
	else \
		set -e; \
		for p in $$modified_projects; do $(MAKE) tests $$p || exit $$?; done; \
	fi

# Run code quality for modified projects compared to target base branch
code-quality-modified-projects:
	@modified_projects="$$( $(MAKE) -s list-modified-projects )"; \
	echo "Running code quality command for projects $$modified_projects"; \
	if [ -z "$$modified_projects" ]; then \
		echo "No modified projects found."; \
	else \
		set -e; \
		for p in $$modified_projects; do $(MAKE) code-quality $$p || exit $$?; done; \
	fi

# Build all docker images via Bake (single call, no dangling intermediates)
# Only projects with a Dockerfile are passed as Bake targets.
build-all-images:
	@set -e; \
	targets=""; \
	for p in $(PROJECTS); do \
		if [ -f "projects/$$p/Dockerfile" ]; then \
			targets="$$targets $$p"; \
		fi; \
	done; \
	$(MAKE) docker-builder-create && \
	SOPS_KEY="$(SOPS_KEY)" TAG_VERSION="$(TAG_VERSION)" BUILD_VARIANT="$(BUILD_VARIANT)" \
		BUILDX_BAKE_ENTITLEMENTS_FS=0 \
		$(BUILDX) bake -f docker-bake.hcl --builder $(BUILDX_BUILDER) $$targets

# Alias for build all
build-all:
	@$(MAKE) build-all-images

# ---------------------------- Full stack ----------------------------

run-meogap: sops-decrypt-all
	@echo "Building all MEOGAP images..."
	@$(MAKE) build-all-images
	@echo "Starting the MEOGAP stack..."
	@TAG_VERSION="$(TAG_VERSION)" docker compose up -d --remove-orphans
	@echo ""
	@echo "MEOGAP stack is up. Services:"
	@echo "  API:               http://localhost:8000"
	@echo "  API documentation: http://localhost:8000/docs"
	@echo "  API health:        http://localhost:8000/api/v1/health"
	@echo "  UI:                http://localhost:8080"
	@echo "  UI health:         http://localhost:8080/healthz"
	@echo "  Worker logs:       docker compose logs -f worker"
	@echo ""
	@echo "Stack status: docker compose ps"

stop-meogap:
	@echo "Stopping the MEOGAP stack..."
	@TAG_VERSION="$(TAG_VERSION)" docker compose down -v --remove-orphans

# Free the host ports used by the stack and the Vite dev server.
free-ports:
	@echo "Freeing MEOGAP ports..."
	@for port in 8000 8080 5173; do \
		echo "  Port $$port"; \
		fuser -k $$port/tcp 2>/dev/null || true; \
	done
	@echo "Done."

# Kill the stack, local images, build cache and any remaining port listeners.
kill-meogap:
	@echo "Killing MEOGAP stack, images, build cache and ports..."
	@$(MAKE) stop-meogap 2>/dev/null || true
	@$(MAKE) docker-clean
	@docker buildx rm -f $(BUILDX_BUILDER) 2>/dev/null || true
	@$(MAKE) free-ports
	@echo "MEOGAP build and stack cleaned."

# Build and push all docker images
build-and-push-all:
	@if [ "$(TAG_VERSION)" = 'latest' ] || [ -z "$(TAG_VERSION)" ]; then \
		echo "Error: TAG_VERSION must be set to push to registry"; \
		echo "Usage: make build-and-push-all t=<tag>"; \
		exit 1; \
	fi
	@$(MAKE) sops-decrypt-all
	@set -e; for p in $(PROJECTS); do $(MAKE) build-and-push $$p || exit $$?; done

# ---------------------------- Clean ----------------------------

clean-python-artifacts:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@find "$(REPO_ROOT)/projects/$(PROJECT_NAME)" -type d \( -name ".venv" -o -name ".mypy_cache" -o -name ".pyrefly_cache" -o -name ".pytest_cache" -o -name ".ruff_cache" -o -name "__pycache__" \) -prune -exec rm -rf {} +
	@find "$(REPO_ROOT)/projects/$(PROJECT_NAME)" -type f \( -name ".coverage" -o -name "coverage.xml" -o -name ".python-version" \) -delete

clean-node-artifacts:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@rm -rf "$(REPO_ROOT)/projects/$(PROJECT_NAME)/node_modules" \
		"$(REPO_ROOT)/projects/$(PROJECT_NAME)/dist" \
		"$(REPO_ROOT)/projects/$(PROJECT_NAME)/coverage" \
		"$(REPO_ROOT)/projects/$(PROJECT_NAME)/.vite"
	@find "$(REPO_ROOT)/projects/$(PROJECT_NAME)" -type f -name "*.tsbuildinfo" -delete

clean:
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		$(MAKE) clean-python-artifacts PROJECT=$(PROJECT_NAME); \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		$(MAKE) clean-node-artifacts PROJECT=$(PROJECT_NAME); \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

clean-all:
	@rm -rf "$(REPO_ROOT)/.python" "$(REPO_ROOT)/.venv"
	@set -e; for p in $(PROJECTS); do $(MAKE) clean $$p || exit $$?; done

# ---------------------------- Internal helpers ----------------------------
list-projects:
	@echo "$(PROJECTS)"

ssh-command:
	@$(MAKE) --no-print-directory -s -C "$(REPO_ROOT)" sops-decrypt-all >/dev/null
	@chmod 600 "$(GIT_SSH_KEY)"
	@echo "ssh -i $(GIT_SSH_KEY) -o IdentitiesOnly=yes -o UserKnownHostsFile=$(GIT_KNOWN_HOSTS) -o StrictHostKeyChecking=yes"

install-project:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@if [ -f "projects/$(PROJECT_NAME)/pyproject.toml" ]; then \
		$(MAKE) install-python-project PROJECT=$(PROJECT_NAME); \
	elif [ -f "projects/$(PROJECT_NAME)/package.json" ]; then \
		$(MAKE) install-js-project PROJECT=$(PROJECT_NAME); \
	else \
		echo "No supported manifest found in projects/$(PROJECT_NAME)."; \
		exit 1; \
	fi

install-python-project:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@$(MAKE) sync $(PROJECT_NAME)
	@if [ "$(DOCKER_BUILD)" = "1" ]; then \
		cd "projects/$(PROJECT_NAME)" && \
			$(GIT_SSH_CMD) UV_PYTHON_INSTALL_DIR="$(UV_PYTHON_INSTALL_DIR)" uv sync --frozen --all-extras --no-editable; \
	else \
		cd "projects/$(PROJECT_NAME)" && \
			$(GIT_SSH_CMD) UV_PYTHON_INSTALL_DIR="$(UV_PYTHON_INSTALL_DIR)" uv sync --all-extras --group dev; \
	fi
	@$(MAKE) run-post-install PROJECT=$(PROJECT_NAME)

install-js-project:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@$(MAKE) ensure-node
	@cd "projects/$(PROJECT_NAME)" && \
		if [ -f package-lock.json ]; then npm ci; else npm install; fi

ensure-node:
	@command -v node >/dev/null 2>&1 || { echo "Node.js is required (>= 20). Install it before running make install-js."; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "npm is required. Install Node.js (>= 20)."; exit 1; }

run-post-install:
	@$(MAKE) ensure-project PROJECT=$(PROJECT_NAME)
	@cd "projects/$(PROJECT_NAME)" && \
		post_install_module="$$(find src -path '*/post_install.py' -print -quit | tr '/' '.' | sed 's/^src\.//; s/\.py$$//')"; \
		if [ -z "$$post_install_module" ]; then \
			echo "No post-install module found for $(PROJECT_NAME)."; \
		else \
			echo "Running post-install module $$post_install_module"; \
			$(GIT_SSH_CMD) UV_PYTHON_INSTALL_DIR="$(UV_PYTHON_INSTALL_DIR)" uv run python -m "$$post_install_module"; \
		fi

ensure-project:
	@if [ -z "$(PROJECT_NAME)" ]; then \
		echo "Missing project name. Example: make tests dummy_project"; \
		echo "Available projects: $(shell $(MAKE) -s list-projects)"; \
		exit 1; \
	fi
	@if [ ! -d "projects/$(PROJECT_NAME)" ]; then \
		echo "Unknown project: $(PROJECT_NAME)"; \
		echo "Available projects: $(shell $(MAKE) -s list-projects)"; \
		exit 1; \
	fi

ensure-target-base-branch:
	@base_ref="$(TARGET_BASE_BRANCH)"; \
	remote_ref="$${base_ref#origin/}"; \
	if [ "$$(git rev-parse --is-shallow-repository 2>/dev/null || echo false)" = "true" ]; then \
		git fetch --quiet --unshallow origin; \
	fi; \
	if git rev-parse --verify --quiet "$$base_ref" >/dev/null; then \
		:; \
	elif git rev-parse --verify --quiet "origin/$$remote_ref" >/dev/null; then \
		:; \
	else \
		git fetch --quiet origin "$$remote_ref:refs/remotes/origin/$$remote_ref"; \
	fi

# List projects modified compared to the target base branch
list-modified-projects:
	@$(MAKE) -s ensure-target-base-branch TARGET_BASE_BRANCH=$(TARGET_BASE_BRANCH)
	@{ \
		git diff --name-only "$(TARGET_BASE_BRANCH)...HEAD"; \
		git diff --name-only; \
		git diff --name-only --cached; \
		git ls-files --others --exclude-standard; \
	} | grep '^projects/' | cut -d/ -f2 | sort -u | while IFS= read -r project; do \
		if [ -d "projects/$$project" ]; then \
			echo "$$project"; \
		fi; \
	done

# Ignore trailing CLI args
%:
	@:
