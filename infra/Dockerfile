# Stage 1: Backend
FROM node:20 AS backend

WORKDIR /app

COPY backend/package*.json ./backend/
COPY backend/ ./backend/

RUN cd backend && npm ci --omit=dev

EXPOSE 5000

CMD ["node", "backend/server.js"]

# Stage 2: Frontend
FROM node:20 AS frontend

WORKDIR /app

COPY frontend/package*.json ./
COPY frontend/ ./

RUN npm ci && npm run build

EXPOSE 3000

CMD ["npm", "start"]
