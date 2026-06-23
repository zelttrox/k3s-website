#!/bin/bash

set -e

echo -e "\033[1;33mSTARTING DEPLOYMENT SCRIPT\033[0m"

# Pull latest changes
sudo git pull

# Remove old k3s pods and docker images
sudo kubectl delete pods -l app=website
sudo kubectl delete -f kubernetes/deployment.yaml
sudo kubectl delete -f kubernetes/service.yaml
sudo kubectl delete -f kubernetes/networking.yaml
sudo docker system prune -a -f

# Rebuild docker image and import in containerd
sudo docker build -t website:latest .
sudo docker save website:latest | sudo k3s ctr -n k8s.io images import -
sudo docker image rm website:latest
cd resume && sudo docker build -t resume:latest .
sudo docker save resume:latest | sudo k3s ctr -n k8s.io images import - && cd ..
sudo docker image rm resume:latest
sudo docker builder prune -af

# Deploy k3s pods and service
sudo kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
sudo kubectl apply -f kubernetes/deployment.yaml
sudo kubectl apply -f kubernetes/service.yaml

echo "Waiting for cert-manager webhook..."
sudo kubectl rollout status deployment/cert-manager-webhook -n cert-manager --timeout=120s
sudo kubectl apply -f kubernetes/networking.yaml

# End
echo "Deployment completed successfully"
sudo kubectl get pods