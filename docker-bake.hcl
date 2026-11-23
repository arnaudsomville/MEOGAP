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
    "meogap_gat",
    "meogap_con",
    "meogap_sci",
    "meogap_cat",
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

target "python_builder_meogap_gat" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "meogap_gat" }
}

target "python_builder_meogap_con" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "meogap_con" }
}

target "python_builder_meogap_sci" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "meogap_sci" }
}

target "python_builder_meogap_cat" {
  inherits = ["_python_builder"]
  args = { PROJECT_NAME = "meogap_cat" }
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

target "meogap_gat" {
  inherits = ["_image"]
  dockerfile = "projects/meogap_gat/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_meogap_gat"
  }
  tags = ["meogap_gat_local:${TAG_VERSION}"]
}

target "meogap_con" {
  inherits = ["_image"]
  dockerfile = "projects/meogap_con/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_meogap_con"
  }
  tags = ["meogap_con_local:${TAG_VERSION}"]
}

target "meogap_sci" {
  inherits = ["_image"]
  dockerfile = "projects/meogap_sci/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_meogap_sci"
  }
  tags = ["meogap_sci_local:${TAG_VERSION}"]
}

target "meogap_cat" {
  inherits = ["_image"]
  dockerfile = "projects/meogap_cat/Dockerfile"
  contexts = {
    python_builder = "target:python_builder_meogap_cat"
  }
  tags = ["meogap_cat_local:${TAG_VERSION}"]
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
