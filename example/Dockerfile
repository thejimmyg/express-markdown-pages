FROM node:alpine as base

FROM base as builder
RUN mkdir /app
WORKDIR /app
COPY package.json.docker /app/package.json
COPY package-lock.json /app
COPY express-markdown-pages /app/express-markdown-pages
RUN npm install --only=prod

FROM base

COPY --from=builder /app /app
COPY server.js /app
# You can mount your real `/app/root` volume when running docker
RUN mkdir -p /app/root/
WORKDIR /app
EXPOSE 80
ENV ROOT_DIR=/app/root
ENV NODE_PATH=/app/node_modules
ENV NODE_ENV=production
ENV PORT=80
ENV PATH="${PATH}:/app/node_modules/.bin"
CMD ["node", "server.js"]
