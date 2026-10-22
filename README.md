## Quick setup

Minimal commands to get started:

1) Install dev tooling (uv, sops, age, hadolint, pre-commit hooks)
```bash
make install-dev-tooling
```
/!\ Important : This step only install the tools a developper / user of the repo needs. For secret decryption the SOPS key is required, thus, a manual addition of the sops key in ~/.config/sops/age/keys.txt.

2) Install project dependencies
- Single project:
```bash
make install <project>
```

- Only modified projects:
```bash
make install-modified-projects
```
- Projects can be listed using
```bash
make list-projects    
```

- All projects:
```bash
make install
```

## Project commands

These commands operate on a specific project:

- Sync `pyproject.toml` and `uv.lock`
```bash
make sync <project>
```

- Run tests for a project
```bash
make tests <project>
```

- Run tests for all projects (one by one)
```bash
make tests-all
```

- Run tests only for modified projects:
```bash
make test-modified-projects
```

- Run code quality hooks for a project:
```bash
make code-quality <project>
```

- Run only one code quality hook for a project:
```bash
make code-quality-format <project>
make code-quality-lint <project>
make code-quality-type <project>
make code-quality-dockerfile <project>
make code-quality-test-files <project>
```

- Run code quality hooks only for modified projects:
```bash
make code-quality-modified-projects
```

- Open a shell with the project venv activated
```bash
make shell <project>
```

- Build the project Docker image
```bash
make build <project>
```

## Notebooks

All notebooks must live inside the `notebook/` folder of each project.
Do not create notebooks at the repository root.

## Docker images

There is a shared base image at the repository root. When you build a project image, the base image is built first, then the project image is built on top of it.

- Build a single project image (base image is built first):
```bash
make build <project>
```

- Build a project image with a specific tag:
```bash
make build <project> t=<tag>
```

- Build and push a project image to registry:
```bash
make build-and-push <project> t=<tag>
```

- Push an existing image to registry (without `_local` suffix):
```bash
make docker-push IMAGE_NAME=<project> TAG_VERSION=<tag>
```

- Build all project images (base image first, then each project):
```bash
make build-all-images
```

- Build and push all project images with the same tag:
```bash
make build-and-push-all t=<tag>
```

- List modified projects compared to the base branch:
```bash
make list-modified-projects
```

You can override the comparison base branch if needed:
```bash
make list-modified-projects TARGET_BASE_BRANCH=origin/main
```

The same base branch override can be used for modified-project helpers:
```bash
make install-modified-projects TARGET_BASE_BRANCH=origin/main
make test-modified-projects TARGET_BASE_BRANCH=origin/main
make code-quality-modified-projects TARGET_BASE_BRANCH=origin/main
```

## Secrets

- Decrypt encrypted build secrets into `build_secrets_decrypted/`:
```bash
make sops-decrypt-all
```

- Encrypt local decrypted secrets back into `build_secrets/`:
```bash
make sops-encrypt-all
```
