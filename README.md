# AWS 3-Tier Application: Visitor Log

This is my project where I built a classic 3-tier web application from the ground up on AWS. It's a hands-on demonstration of how to build, secure, and deploy a real-world application using cloud-native services.

The app itself is a simple "Visitor Log" — users can submit their names, and the app saves and displays them from a database.

## My Project Architecture

I built the entire infrastructure inside a custom VPC, focusing on security and high availability right from the start.

### Architecture Diagram

Here's the high-level diagram showing how traffic flows from the user to the database, all within AWS.

<!-- 
Note: For this image to work, you must upload your diagram with the 
exact filename "Untitled Diagram.drawio (1).png" to your repo.
GitHub will automatically handle the URL encoding.
-->
![Image](https://github.com/user-attachments/assets/cd280967-4b4f-48a0-b2bf-22957fd7aa7e)


## VPC Resource Map

Here's a screenshot from my AWS console showing the actual VPC and its resources all wired up.

<!-- 
Note: For this image to work, you must upload your screenshot with the 
exact filename "Screenshot_19-10-2025_144722_ap-south-1.console.aws.amazon.com.jpeg" 
to your repo.
-->
![Image](https://github.com/user-attachments/assets/9e0a81d4-3eea-4d5a-a17c-3ee61b40c3da)

### Key Infrastructure Components
* **VPC (Virtual Private Cloud):** I started with a custom VPC (`visitor-log-vpc`) to create a secure, isolated network for the app.

* **Subnets:** I split the VPC into **6 subnets** across two Availability Zones (ap-south-1a and ap-south-1b) to make sure the app is highly available.

  * **2 Public Subnets:** These hold the Application Load Balancer (ALB) and the NAT Gateways.

  * **2 Private App Subnets:** This is where the backend EC2 instances run, safe from the public internet.

  * **2 Private DB Subnets:** The PostgreSQL RDS database is locked down in these subnets.

* **Networking:**

  * **Internet Gateway (IGW):** This allows traffic from the internet *into* the public subnets (for the ALB).

  * **NAT Gateways:** These allow the private EC2 instances to connect *out* to the internet (like pulling Docker images) without being exposed.

  * **Route Tables:** I set up custom route tables to control all the traffic. Public subnets route to the IGW, and private subnets route to their NAT Gateway.

* **Security:**

  * **Security Groups:** These are the key firewalls. I chained them together:

    * `ALB-SG` allows HTTP/HTTPS from anyone (0.0.0.0/0).

    * `App-SG` *only* allows traffic from the `ALB-SG` on port 8080.

    * `DB-SG` *only* allows traffic from the `App-SG` on port 5432.

  * **SSM Parameter Store:** I used SSM to securely store all the database credentials. The backend app fetches these at startup. This means no secrets are ever hard-coded or saved in `.env` files on the instances.

## The 3 Tiers

Here's the breakdown of the three tiers of the application.

### 1. Web Tier (Frontend)

* **Technology:** React + Vite

* **Service:** **AWS S3**

* **Details:** The `3-tier-frontend` folder holds the React app. I run `npm run build` to get the static files, then upload the `dist` folder to an S3 bucket configured for **Static Website Hosting**. It's serverless, cheap, and scales automatically.

### 2. Application Tier (Backend)

* **Technology:** Node.js + Express.js

* **Service:** **EC2 Auto Scaling Group (ASG) + Application Load Balancer (ALB)**

* **Details:** The `3-tier-Backend` folder has the Express.js API.

  * **Containerization:** I containerized the app with **Docker** so it runs the same way everywhere.

  * **Deployment:** An **EC2 Auto Scaling Group** launches and manages the backend instances. If one fails, the ASG automatically replaces it.

  * **Launch Template:** I created a Launch Template with a `user-data` script that runs on every new instance. This script:

    1. Installs Docker and the AWS CLI.

    2. Fetches the instance's own region.

    3. Pulls my latest Docker image from Docker Hub.

    4. Runs the container, passing in the `AWS_REGION` so the app knows where it is.

  * **Load Balancing:** The **Application Load Balancer (ALB)** is the public entry point. It takes all incoming traffic and balances it across my healthy EC2 instances in the private subnets.

### 3. Database Tier (Data)

* **Technology:** PostgreSQL

* **Service:** **Amazon RDS (Relational Database Service)**

* **Details:** I used Amazon RDS for the PostgreSQL database. It's placed in the private DB subnets, so it's impossible to access from the public internet. Only the backend app instances can talk to it, which keeps the data as secure as possible.

## Application API Endpoints

The backend provides these four REST API endpoints:

| Method | Endpoint | Description | 
 | ----- | ----- | ----- | 
| `GET` | `/` | A simple health check. The ALB pings this to see if the app is healthy. | 
| `GET` | `/visitors` | Grabs the full list of visitor names from the database. | 
| `POST` | `/visitors` | Saves a new visitor. It just needs a JSON body like `{ "name": "YourName" }`. | 
| `GET` | `/check-ip` | A small utility I added to test the NAT Gateway's outbound public IP. | 


## Future Plans

* **Terraform:** My next step is to create a `terraform/` directory and write the code to build this entire project automatically. Using Infrastructure as Code (IaC) will let me tear down and rebuild this whole environment in minutes.
