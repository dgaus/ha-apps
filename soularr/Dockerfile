FROM mrusse08/soularr:v1.2.2

ARG BUILD_ARCH
ARG BUILD_VERSION
LABEL \
    io.hass.version="${BUILD_VERSION}" \
    io.hass.type="addon" \
    io.hass.arch="${BUILD_ARCH}"

COPY config.ini.example /config.ini.example
COPY run-ha.sh /run-ha.sh
RUN chmod a+x /run-ha.sh

ENTRYPOINT ["tini", "-g", "--", "/run-ha.sh"]
