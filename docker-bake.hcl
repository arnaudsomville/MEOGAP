variable "TAG_VERSION" {
  default = "latest"
}

variable "BUILD_VARIANT" {
  default = "production"
}

variable "SOPS_KEY" {
  default = ""
}

group "default" {
  targets = [
    "gateway",
    "contract",
    "scientific_processing",
    "catalog",
    "meogap_worker",
    "meogap_ui",
  ]
}

# ---------------------------------------------------------------------------
# docker_base_image – system deps (type=cacheonly → no Docker image, no dangling)
# ---------------------------------------------------------------------------
target "docker_base_image" {
  dockerfile = "Dockerfile"
  target = "docker_base_image"
  output = ["type=cacheonly"]
}

# ---------------------------------------------------------------------------
# Python builder per project – each installs its own .venv
# ---------------------------------------------------------------------------
target "_python_builder" {
  dockerfile = "Dockerfile"
  target = "python_builder"
  output = ["type=cacheonly"]
  secret = [
    {
      type = "file"
      id = "age_key"
      src = "${SOPS_KEY}"
    }
  ]
}

target "python_builder_gateway" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "gateway" }
}

target "python_builder_contract" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "contract" }
}

target "python_builder_scientific_processing" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "scientific_processing" }
}

target "python_builder_catalog" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "catalog" }
}

target "python_builder_meogap_worker" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "meogap_worker" }
}

# ---------------------------------------------------------------------------
# Per-project final images
# ---------------------------------------------------------------------------
target "_image" {
  args = {
    BUILD_VARIANT = "${BUILD_VARIANT}"
    TAG_VERSION   = "${TAG_VERSION}"
  }
  contexts = {
    docker_base_image = "target:docker_base_image"
  }
  output = ["type=docker"]
}

target "gateway" {
  inherits = ["_image"]
  dockerfile = "projects/gateway/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_gateway"
  }
  tags = ["gateway_local:${TAG_VERSION}"]
}

target "contract" {
  inherits = ["_image"]
  dockerfile = "projects/contract/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_contract"
  }
  tags = ["contract_local:${TAG_VERSION}"]
}

target "scientific_processing" {
  inherits = ["_image"]
  dockerfile = "projects/scientific_processing/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_scientific_processing"
  }
  tags = ["scientific_processing_local:${TAG_VERSION}"]
}

target "catalog" {
  inherits = ["_image"]
  dockerfile = "projects/catalog/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_catalog"
  }
  tags = ["catalog_local:${TAG_VERSION}"]
}

target "meogap_worker" {
  inherits = ["_image"]
  dockerfile = "projects/meogap_worker/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_meogap_worker"
  }
  tags = ["meogap_worker_local:${TAG_VERSION}"]
}

target "meogap_ui" {
  context = "projects/meogap_ui"
  dockerfile = "Dockerfile"
  output = ["type=docker"]
  tags = ["meogap_ui_local:${TAG_VERSION}"]
}
