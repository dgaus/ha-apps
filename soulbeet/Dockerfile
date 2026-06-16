FROM docccccc/soulbeet:0.6.0-full

ARG BUILD_ARCH
ARG BUILD_VERSION
LABEL \
    io.hass.version="${BUILD_VERSION}" \
    io.hass.type="addon" \
    io.hass.arch="${BUILD_ARCH}"

# The upstream image is distroless (gcr.io/distroless/python3-debian12): no shell,
# no apt, no jq. So the bash-wrapper pattern used by the other apps will not work.
# Instead the startup wrapper is plain Python (the interpreter ships at
# /usr/bin/python3); it reads /data/options.json, sets a few environment
# variables, then exec()s the upstream server binary.
COPY run.py /run.py
ENTRYPOINT ["/usr/bin/python3", "/run.py"]
