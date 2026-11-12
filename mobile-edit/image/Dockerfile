# ONLYOFFICE Document Server with mobile web editing enabled (Community Edition).
#
# Replaces only the three mobile editor bundles. Everything else (server, desktop editors,
# configuration, volumes, environment variables) is the stock image, so this is a drop-in
# replacement for onlyoffice/documentserver at the same version.
#
# Build through ../image.sh, which fills the build args from ../VERSION.
ARG BASE=onlyoffice/documentserver:10.0.0.1
FROM ${BASE}

# The patched bundles are built from one specific upstream tag. A different server build can
# have a different editor engine, so refuse to build on anything else.
ARG EXPECTED_VERSION=10.0.0-169
RUN dpkg -s onlyoffice-documentserver | grep -qx "Version: ${EXPECTED_VERSION}" \
 || { echo "Base image is not Document Server ${EXPECTED_VERSION}; rebuild the patch for that version." >&2; exit 1; }

ARG APPS=/var/www/onlyoffice/documentserver/web-apps/apps
COPY --chown=ds:ds --chmod=444 ctx/documenteditor.js     ${APPS}/documenteditor/mobile/dist/js/app.js
COPY --chown=ds:ds --chmod=444 ctx/spreadsheeteditor.js  ${APPS}/spreadsheeteditor/mobile/dist/js/app.js
COPY --chown=ds:ds --chmod=444 ctx/presentationeditor.js ${APPS}/presentationeditor/mobile/dist/js/app.js

ARG BASE
LABEL org.opencontainers.image.title="onlyoffice-documentserver-mobile-edit" \
      org.opencontainers.image.description="ONLYOFFICE Document Server ${EXPECTED_VERSION} with mobile editing patched in" \
      org.opencontainers.image.base.name="${BASE}"
