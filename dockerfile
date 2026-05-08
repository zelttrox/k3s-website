# Pull Node.js image
FROM node:18

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3030
CMD ["node", "server.js"]