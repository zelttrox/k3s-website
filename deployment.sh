# Remove old k3s pods and docker images
sudo kubectl delete pods -l app=website
sudo kubectl delete -f kubernetes/deployment.yaml
sudo kubectl delete -f kubernetes/service.yaml
sudo kubectl delete -f kubernetes/networking.yaml
sudo docker system prune -a -f

# Pull latest changes
git pull

# Rebuild docker image and import in containerd
sudo docker build -t website:latest .
sudo docker save website:latest | sudo k3s ctr -n k8s.io images import -

# Deploy k3s pods and service
sudo kubectl apply -f kubernetes/deployment.yaml
sudo kubectl apply -f kubernetes/service.yaml
sudo kubectl apply -f kubernetes/networking.yaml

# End
echo "Deployment completed successfully"
sudo kubectl get pods