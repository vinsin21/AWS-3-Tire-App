#!/bin/bash
set -e
set -x

# Log everything
exec > >(tee -a /var/log/user-data.log)
exec 2>&1

echo "=== Starting User Data Script ==="
date

# Update and install Docker
echo "=== Installing Docker ==="
apt-get update -y
# Install Docker and its dependencies
apt-get install -y docker.io apt-transport-https ca-certificates curl software-properties-common

systemctl start docker
systemctl enable docker

# Make sure 'ubuntu' user can run docker commands (optional, but good practice)
usermod -aG docker ubuntu

# Pull your application image from Docker Hub (or AWS ECR)
# Replace with your actual image name and tag
echo "=== Pulling container image ==="
docker pull your-username/your-app-image:latest

# Run the container
# No -e flags for secrets!
echo "=== Starting application container ==="
docker run -d --restart=always \
  -p 80:8080 \
  --name "backend-app" \
  your-username/your-app-image:latest
  
echo "=== Container started! ==="