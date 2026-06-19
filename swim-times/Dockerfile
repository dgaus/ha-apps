ARG BUILD_FROM
FROM $BUILD_FROM

# Base image (build.yaml -> node:*-alpine) already ships node + npm.

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
