FROM node:12

WORKDIR /usr/src/app

COPY . .

RUN ls -a

RUN npm init -y

RUN npm install

EXPOSE 80 443 22 
CMD [ "npm", "start" ]