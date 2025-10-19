#!/bin/bash

echo "🧪 Running tests..."

# Run Python tests
echo "Running Python tests..."
python -m pytest tests/ -v

# Check if Docker is running
echo "Checking Docker..."
docker --version

# Check if kubectl is configured
echo "Checking kubectl..."
kubectl version --client

# Check AWS CLI
echo "Checking AWS CLI..."
aws --version

echo "✅ Tests completed!"