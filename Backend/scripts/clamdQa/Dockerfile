FROM node:24-bookworm-slim
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d && chmod 755 /usr/sbin/policy-rc.d \
    && apt-get update && apt-get install -y --no-install-recommends clamav-daemon clamav-freshclam clamav ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /qa/db /qa/run /qa/tmp && chown -R node:node /qa
WORKDIR /app
COPY Backend/package.json Backend/package-lock.json ./Backend/
RUN npm ci --prefix Backend --ignore-scripts --no-audit --no-fund
COPY Backend/services ./Backend/services
COPY Backend/controllers/cv.controller.js ./Backend/controllers/cv.controller.js
COPY Backend/scripts ./Backend/scripts
COPY Backend/tests ./Backend/tests
USER node
# Do not inherit runner authentication, proxy credentials or application secrets.
ENTRYPOINT ["/usr/bin/env","-i","PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin","LANG=C","LC_ALL=C","TZ=UTC","HOME=/qa","node","Backend/scripts/verifyPersistentClamav.cjs","--synthetic-only"]
