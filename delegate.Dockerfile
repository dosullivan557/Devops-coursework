ARG BUILDX_VERSION=0.19.3

FROM docker/buildx-bin:${BUILDX_VERSION} AS buildx

FROM us-docker.pkg.dev/gar-prod-setup/harness-public/harness/delegate:26.07.89703

USER root

ARG DOCKER_VERSION=27.5.1

COPY --from=buildx /buildx /usr/local/lib/docker/cli-plugins/docker-buildx

RUN case "$(uname -m)" in \
      x86_64) DOCKER_ARCH=x86_64 ;; \
      arm64|aarch64) DOCKER_ARCH=aarch64 ;; \
      *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;; \
    esac \
    && curl --fail --location --silent --show-error \
      "https://download.docker.com/linux/static/stable/${DOCKER_ARCH}/docker-${DOCKER_VERSION}.tgz" \
      | tar --extract --gzip --strip-components=1 --directory=/usr/local/bin docker/docker \
    && chmod 755 /usr/local/bin/docker /usr/local/lib/docker/cli-plugins/docker-buildx \
    && docker buildx version

USER 1001
