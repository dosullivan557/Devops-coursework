FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl docker.io git \
    && rm -rf /var/lib/apt/lists/*

ARG RUNNER_NAME
COPY .harness-runner/${RUNNER_NAME} /usr/local/bin/harness-docker-runner
RUN chmod 755 /usr/local/bin/harness-docker-runner

ENTRYPOINT ["/usr/local/bin/harness-docker-runner"]
CMD ["server"]
