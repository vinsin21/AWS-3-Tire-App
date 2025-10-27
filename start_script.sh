#!/bin/bash
set -e  # Exit on any error
set -x  # Print commands (helpful for debugging in /var/log/cloud-init-output.log)

# Log everything to a file for debugging
exec > >(tee -a /var/log/user-data.log)
exec 2>&1

echo "=== Starting User Data Script ==="
date

# Update system packages
echo "=== Updating system packages ==="
apt-get update -y
apt-get upgrade -y

# Install dependencies
echo "=== Installing dependencies ==="
apt-get install -y git curl jq unzip

# Install AWS CLI v2 (if not already installed)
echo "=== Installing AWS CLI ==="
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
fi

# Install NVM as ubuntu user (NOT root)
echo "=== Installing NVM as ubuntu user ==="
su - ubuntu -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash'

# Install Node.js as ubuntu user
echo "=== Installing Node.js ==="
su - ubuntu -c '
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
'

# Install PM2 globally as ubuntu user
echo "=== Installing PM2 ==="
su - ubuntu -c '
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm install -g pm2
'

# Clone project as ubuntu user
echo "=== Cloning project ==="
su - ubuntu -c '
cd /home/ubuntu
if [ -d "AWS-3-Tire-App" ]; then
    rm -rf AWS-3-Tire-App
fi
git clone https://github.com/vinsin21/AWS-3-Tire-App.git
cd AWS-3-Tire-App
'

# Get AWS region dynamically
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Fetch environment variables from SSM Parameter Store
echo "=== Fetching secrets from SSM ==="
PGHOST=$(aws ssm get-parameter --name "/myapp/PGHOST" --region $REGION --with-decryption --query "Parameter.Value" --output text)
PGUSER=$(aws ssm get-parameter --name "/myapp/PGUSER" --region $REGION --with-decryption --query "Parameter.Value" --output text)
PGDATABASE=$(aws ssm get-parameter --name "/myapp/PGDATABASE" --region $REGION --with-decryption --query "Parameter.Value" --output text)
PGPASSWORD=$(aws ssm get-parameter --name "/myapp/PGPASSWORD" --region $REGION --with-decryption --query "Parameter.Value" --output text)
PGPORT=$(aws ssm get-parameter --name "/myapp/PGPORT" --region $REGION --with-decryption --query "Parameter.Value" --output text)


# Create .env file as ubuntu user
echo "=== Creating .env file ==="
cat <<EOT > /home/ubuntu/AWS-3-Tire-App/.env
PGHOST=$PGHOST
PGUSER=$PGUSER
PGDATABASE=$PGDATABASE
PGPASSWORD=$PGPASSWORD
PGPORT=$PGPORT
CORS_ORIGIN=<frontend-app-url>
EOT

# Set correct ownership
chown ubuntu:ubuntu /home/ubuntu/AWS-3-Tire-App/.env

# Install npm packages as ubuntu user
echo "=== Installing npm packages ==="
su - ubuntu -c '
cd /home/ubuntu/AWS-3-Tire-App
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm install
'

# Start application with PM2 as ubuntu user
echo "=== Starting application with PM2 ==="
su - ubuntu -c '
cd /home/ubuntu/AWS-3-Tire-App
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 start index.js --name "backend-app"
pm2 save
'

# Setup PM2 to start on boot (run as root, but for ubuntu user)
echo "=== Setting up PM2 startup ==="
su - ubuntu -c '
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 startup systemd -u ubuntu --hp /home/ubuntu
' | tail -n 1 | bash

echo "=== Backend setup complete! ==="
date