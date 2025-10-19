#!/bin/bash

set -e

echo "🔍 Verifying deployment..."

NAMESPACE="todo-app"

# Check namespace
echo "📁 Checking namespace..."
kubectl get namespace $NAMESPACE

# Check pods
echo "🐳 Checking pods..."
kubectl get pods -n $NAMESPACE -o wide

# Check services
echo "🔌 Checking services..."
kubectl get services -n $NAMESPACE

# Check ingress
echo "🌐 Checking ingress..."
kubectl get ingress -n $NAMESPACE

# Check PVC
echo "💾 Checking persistent volume claims..."
kubectl get pvc -n $NAMESPACE

# Check deployments
echo "🔄 Checking deployments..."
kubectl get deployments -n $NAMESPACE

# Check pod status in detail
echo "📋 Detailed pod status:"
kubectl describe pods -n $NAMESPACE -l app=todo-app || true
kubectl describe pods -n $NAMESPACE -l app=mysql || true

# Check application logs
echo "📝 Checking application logs..."
TODO_POD=$(kubectl get pods -n $NAMESPACE -l app=todo-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$TODO_POD" ]; then
    echo "Application pod: $TODO_POD"
    kubectl logs $TODO_POD -n $NAMESPACE --tail=50 || true
else
    echo "No todo-app pods found"
fi

# Check MySQL logs
MYSQL_POD=$(kubectl get pods -n $NAMESPACE -l app=mysql -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$MYSQL_POD" ]; then
    echo "MySQL pod: $MYSQL_POD"
    kubectl logs $MYSQL_POD -n $NAMESPACE --tail=50 || true
else
    echo "No MySQL pods found"
fi

# Health check
echo "❤️  Performing health check..."
ALB_URL=$(kubectl get ingress -n $NAMESPACE todo-app-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -n "$ALB_URL" ]; then
    echo "ALB URL: http://$ALB_URL"
    echo "Health check endpoint: http://$ALB_URL/health"
    curl -f http://$ALB_URL/health || echo "Health check failed"
else
    echo "ALB not ready yet"
fi

echo "✅ Verification completed!"