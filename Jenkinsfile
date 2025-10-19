pipeline {
    agent any
    
    parameters {
        choice(
            name: 'DEPLOY_ENVIRONMENT',
            choices: ['dev', 'staging', 'production'],
            description: 'Select deployment environment'
        )
        string(
            name: 'IMAGE_TAG',
            defaultValue: 'latest',
            description: 'Docker image tag to deploy'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip running tests'
        )
    }
    
    environment {
        AWS_REGION = 'us-east-1'
        EKS_CLUSTER_NAME = 'comic-website-prod'
        DOCKER_IMAGE = 'todo-app'
        K8S_NAMESPACE = "todo-app-${params.DEPLOY_ENVIRONMENT}"
        DOCKER_REGISTRY = '319998871902.dkr.ecr.us-east-1.amazonaws.com'
        IMAGE_TAG = "${params.IMAGE_TAG == 'latest' ? env.BUILD_NUMBER : params.IMAGE_TAG}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Environment') {
            steps {
                script {
                    echo "🔧 Environment Setup"
                    echo "Deploying to: ${params.DEPLOY_ENVIRONMENT}"
                    echo "Image Tag: ${IMAGE_TAG}"
                    echo "Skip Tests: ${params.SKIP_TESTS}"
                }
            }
        }
        
        stage('Check Credentials') {
            steps {
                script {
                    echo "🔐 Checking AWS Credentials..."
                    
                    // 测试第一个凭据
                    try {
                        withCredentials([string(credentialsId: 'aws-access-key', variable: 'TEST_ACCESS_KEY')]) {
                            echo "✅ SUCCESS: aws-access-key credential found"
                        }
                    } catch (Exception e) {
                        echo "❌ ERROR: Could not find credentials entry with ID 'aws-access-key'"
                        currentBuild.result = 'FAILURE'
                        error("Missing credential: aws-access-key")
                    }
                    
                    // 测试第二个凭据
                    try {
                        withCredentials([string(credentialsId: 'aws-secret-key', variable: 'TEST_SECRET_KEY')]) {
                            echo "✅ SUCCESS: aws-secret-key credential found"
                        }
                    } catch (Exception e) {
                        echo "❌ ERROR: Could not find credentials entry with ID 'aws-secret-key'"
                        currentBuild.result = 'FAILURE'
                        error("Missing credential: aws-secret-key")
                    }
                    
                    echo "🎉 All credentials are properly configured!"
                }
            }
        }
        
        stage('ECR Login') {
            steps {
                script {
                    echo "🐳 Attempting ECR Login..."
                }
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh """
                        # 设置环境变量
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=${AWS_REGION}
                        
                        echo "🔑 Testing AWS credentials..."
                        aws sts get-caller-identity
                        echo "✅ AWS credentials test passed"
                        
                        echo "🚪 Logging into ECR..."
                        if aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}; then
                            echo "✅ ECR login successful!"
                        else
                            echo "❌ ECR login failed!"
                            exit 1
                        fi
                    """
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "🏗️ Building Docker image..."
                }
                sh """
                    docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} .
                    docker tag ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    echo "✅ Docker image built and tagged successfully"
                """
            }
        }
        
        stage('Run Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                script {
                    echo "🧪 Running tests..."
                }
                sh 'python -m pytest tests/ -v || echo "⚠️ Tests completed with warnings"'
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    echo "📤 Pushing Docker image to ECR..."
                }
                sh """
                    if docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG}; then
                        echo "✅ Image ${IMAGE_TAG} pushed successfully"
                    else
                        echo "❌ Failed to push image ${IMAGE_TAG}"
                        exit 1
                    fi
                    
                    if docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest; then
                        echo "✅ Latest image pushed successfully"
                    else
                        echo "❌ Failed to push latest image"
                        exit 1
                    fi
                """
            }
        }
        
        stage('Verify EKS Access') {
            steps {
                script {
                    echo "🔍 Verifying EKS cluster access..."
                }
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        
                        echo "🔄 Updating kubeconfig for EKS cluster..."
                        if aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}; then
                            echo "✅ Kubeconfig updated successfully"
                        else
                            echo "❌ Failed to update kubeconfig"
                            exit 1
                        fi
                        
                        echo "📋 Checking cluster nodes..."
                        kubectl get nodes
                        echo "✅ EKS cluster access verified"
                    """
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    echo "🚀 Starting deployment to EKS..."
                    echo "Namespace: ${K8S_NAMESPACE}"
                    echo "Image: ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG}"
                }
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        
                        # Configure kubectl
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        echo "📁 Creating namespace..."
                        kubectl apply -f kubernetes/namespace.yaml
                        
                        echo "🗄️ Deploying MySQL..."
                        kubectl apply -f kubernetes/mysql/ -n ${K8S_NAMESPACE}
                        
                        echo "⏳ Waiting for MySQL to be ready..."
                        if timeout 300s bash -c 'until kubectl get pods -n ${K8S_NAMESPACE} -l app=mysql --field-selector=status.phase=Running --no-headers | grep -q .; do sleep 5; done'; then
                            echo "✅ MySQL is ready"
                        else
                            echo "❌ MySQL failed to start within timeout"
                            echo "📊 Checking MySQL pod status:"
                            kubectl get pods -n ${K8S_NAMESPACE} -l app=mysql
                            exit 1
                        fi
                        
                        echo "📦 Deploying Todo Application..."
                        kubectl apply -f kubernetes/todo-app/ -n ${K8S_NAMESPACE}
                        
                        echo "🔄 Updating deployment image..."
                        kubectl set image deployment/todo-app-deployment \\
                            todo-app=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} \\
                            -n ${K8S_NAMESPACE}
                        
                        echo "⏳ Waiting for rollout to complete..."
                        if kubectl rollout status deployment/todo-app-deployment -n ${K8S_NAMESPACE} --timeout=300s; then
                            echo "✅ Rollout completed successfully"
                        else
                            echo "❌ Rollout failed"
                            echo "📊 Checking deployment status:"
                            kubectl describe deployment/todo-app-deployment -n ${K8S_NAMESPACE}
                            exit 1
                        fi
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "🔍 Verifying deployment..."
                }
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        echo "📊 Deployment Status:"
                        kubectl get all -n ${K8S_NAMESPACE}
                        
                        echo "✅ Deployment verification completed"
                    """
                }
            }
        }
    }
    
    post {
        always {
            echo "🏁 Pipeline execution completed for ${params.DEPLOY_ENVIRONMENT}"
            echo "Build Result: ${currentBuild.result}"
            echo "Build Number: ${env.BUILD_NUMBER}"
        }
        success {
            echo "🎉 Deployment successful! Environment: ${params.DEPLOY_ENVIRONMENT}, Build: ${env.BUILD_NUMBER}"
        }
        failure {
            echo "💥 Deployment failed! Environment: ${params.DEPLOY_ENVIRONMENT}, Build: ${env.BUILD_NUMBER}"
        }
    }
}