# Rebuild docker image and import in containerd
sudo docker build -t website:latest .
sudo docker save website:latest | sudo k3s ctr -n k8s.io images import -
sudo docker image rm website:latest
cd resume && sudo docker build -t resume:latest .
sudo docker save resume:latest | sudo k3s ctr -n k8s.io images import - && cd ..
sudo docker image rm resume:latest
sudo docker builder prune -af

# Deploy k3s pods and service
sudo kubectl apply -f kubernetes/deployment.yaml
sudo kubectl apply -f kubernetes/service.yaml
sudo kubectl rollout status deployment/cert-manager-webhook -n cert-manager --timeout=120s
sudo kubectl apply -f kubernetes/networking.yaml

# End
echo "Deployment completed successfully"
sudo kubectl get pods