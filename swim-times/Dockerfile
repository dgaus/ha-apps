# Pin the base directly. This app needs Node, and Home Assistant's default base
# image doesn't ship it; node:24-alpine is multi-arch (amd64/arm64/armv7).
# ARG BUILD_FROM is declared only to consume the build-arg HA passes.
ARG BUILD_FROM
FROM node:24-alpine

# Build application
WORKDIR /app
COPY . .

RUN \
    npm ci && \
    npm run build && \
    npm ci --production

RUN chmod a+x /app/run.sh

LABEL \
    io.hass.name="Swim Times" \
    io.hass.description="Track pool occupancy and best times." \
    io.hass.arch="aarch64|amd64|armv7" \
    io.hass.type="addon" \
    io.hass.version="0.1.0"

CMD [ "./run.sh" ]
