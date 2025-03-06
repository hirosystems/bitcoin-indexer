FROM node:20-alpine

WORKDIR /app
COPY ./api/runes /app
COPY .git /.git

RUN apk add --no-cache --virtual .build-deps git
RUN npm ci --no-audit && \
    npm run build && \
    npm run generate:git-info && \
    npm prune --production
RUN apk del .build-deps

CMD ["node", "./dist/src/index.js"]
