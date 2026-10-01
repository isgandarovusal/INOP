FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3001
CMD ["node", "server.js"]
