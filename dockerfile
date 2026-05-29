FROM node:24-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
USER node
CMD ["node", "server.js"]
