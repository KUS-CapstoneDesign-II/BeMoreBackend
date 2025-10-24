# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
ENV NODE_ENV=production \
    PORT=8000

EXPOSE 8000
CMD ["npm","start"]


