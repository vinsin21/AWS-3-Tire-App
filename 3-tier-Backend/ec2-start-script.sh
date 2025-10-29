#!/bin/bash
set -e
set -x

# Log everything to a file for debugging
exec > >(tee -a /var/log/user-data.log)
exec 2>&1

echo "=== Starting User Data Script ==="
date

# Update system packages
apt-get update -y

# Install Docker
apt-get install -y docker.io
systemctl start docker
systemctl enable docker

# Allow the 'ubuntu' user to run Docker commands (good practice)
usermod -aG docker ubuntu

# --- IMPORTANT ---
# Replace 'your-username/your-app-image:latest' with your
# actual Docker image path (e.g., from Docker Hub or AWS ECR)
DOCKER_IMAGE="winsin/visitor-log-backend"

# Pull the latest version of your application image
docker pull $DOCKER_IMAGE

# Run the container
# Notice there are NO -e flags for secrets!
# The app will get them from SSM by itself.
echo "=== Starting application container ==="
docker run -d --restart=always \
  -p 8080:8080 \
  --name "visitor-logbackend-app" \
  $DOCKER_IMAGE
  
echo "=== Deployment complete! Container started. ==="
date
