FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
RUN mkdir -p /app/uploads && chown node:node /app/uploads
ENV NODE_ENV=production PORT=3001
USER node
EXPOSE 3001
CMD ["node", "server.js"]
