#!/bin/bash

# Update system and install required packages
sudo apt update -y && apt upgrade -y
sudo apt install ufw docker docker-compose git curl -y
curl -sfL https://get.k3s.io | sh -

# Setup ufw firewall
echo "Firewall setup.."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw reload

# Build docker image and import in Kubernetes
echo "Docker image setup.."
sudo docker build -t website:latest .
sudo docker save website:latest | sudo k3s ctr -n k8s.io images import -
sudo docker image rm website:latest

# Deploy k3s pods and service
echo "Kubernetes setup.."
sudo kubectl apply -f kubernetes/deployment.yaml
sudo kubectl apply -f kubernetes/service.yaml
sudo kubectl apply -f kubernetes/networking.yaml

# TLS certificate Kubernetes
sudo kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml


# End
echo "Setup complete"