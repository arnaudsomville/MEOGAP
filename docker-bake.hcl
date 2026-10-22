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
    "dummy_project",
    "dummy_project_with_local_dependancy",
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

target "python_builder_dummy_project" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "dummy_project" }
}

target "python_builder_dummy_project_with_local_dependancy" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "dummy_project_with_local_dependancy" }
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

target "dummy_project" {
  inherits = ["_image"]
  dockerfile = "projects/dummy_project/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_dummy_project"
  }
  tags = ["dummy_project_local:${TAG_VERSION}"]
}

target "dummy_project_with_local_dependancy" {
  inherits = ["_image"]
  dockerfile = "projects/dummy_project_with_local_dependancy/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_dummy_project_with_local_dependancy"
  }
  tags = ["dummy_project_with_local_dependancy_local:${TAG_VERSION}"]
}
