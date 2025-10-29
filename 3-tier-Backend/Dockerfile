# Use a lightweight Node.js image
FROM node:lts-slim

# working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies 
RUN npm install

# Copy application code 
COPY . .

# Exposing the port on which express.js server run 
EXPOSE 8080

# The command to run express.js application
CMD ["npm", "start"]
