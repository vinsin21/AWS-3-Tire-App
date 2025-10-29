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

# Install Docker and curl (needed to get region)
apt-get install -y docker.io curl
systemctl start docker
systemctl enable docker

# Allow the 'ubuntu' user to run Docker commands (good practice)
usermod -aG docker ubuntu

#  Get the instance's region
echo "=== Fetching EC2 Instance Region ==="
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
REGION=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/placement/region)


DOCKER_IMAGE="winsin/visitor-log-backend"

# Pull the latest version of your application image
docker pull $DOCKER_IMAGE

# Run the container
# Notice there are NO -e flags for secrets!
# The app will get them from SSM by itself.
# --- MODIFIED: Added -e AWS_REGION=$REGION ---
echo "=== Starting application container in region $REGION ==="
docker run -d --restart=always \
  -p 8080:8080 \
  -e AWS_REGION=$REGION \
  --name "backend-app" \
  $DOCKER_IMAGE
  
echo "=== Deployment complete! Container started. ==="
date

