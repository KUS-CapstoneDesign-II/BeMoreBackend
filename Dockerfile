# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
# Use npm ci when lockfile is valid; fallback to install when out of sync
RUN npm ci --omit=dev || npm install --omit=dev --no-audit --no-fund

COPY . .
ENV NODE_ENV=production \
    PORT=8000

EXPOSE 8000
CMD ["npm","start"]


