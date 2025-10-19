#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Check environment variables
if [ -z "$AWS_REGION" ] || [ -z "$EKS_CLUSTER_NAME" ]; then
    echo "❌ Error: AWS_REGION and EKS_CLUSTER_NAME must be set"
    exit 1
fi

echo "📍 Region: $AWS_REGION"
echo "🏗️  Cluster: $EKS_CLUSTER_NAME"

# Update kubeconfig
echo "🔧 Configuring kubectl..."
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME

# Verify cluster access
echo "🔍 Verifying cluster access..."
kubectl cluster-info

# Create namespace
echo "📁 Creating namespace..."
kubectl apply -f kubernetes/namespace.yaml

# Deploy MySQL
echo "🗄️  Deploying MySQL..."
kubectl apply -f kubernetes/mysql/ -n todo-app

# Wait for MySQL
echo "⏳ Waiting for MySQL to be ready..."
kubectl wait --for=condition=ready pod -l app=mysql -n todo-app --timeout=600s

# Deploy Todo App
echo "📦 Deploying Todo App..."
kubectl apply -f kubernetes/todo-app/ -n todo-app

# Wait for deployment
echo "⏳ Waiting for Todo App to be ready..."
kubectl rollout status deployment/todo-app-deployment -n todo-app --timeout=300s

echo "✅ Deployment completed successfully!"

# Display resources
echo "📊 Deployment summary:"
kubectl get all -n todo-app