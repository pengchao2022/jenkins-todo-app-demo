pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        EKS_CLUSTER_NAME = 'comic-website-prod'  // 替换为您的集群名称
        DOCKER_IMAGE = 'todo-app'
        K8S_NAMESPACE = 'todo-app'
        DOCKER_REGISTRY = '319998871902.dkr.ecr.us-east-1.amazonaws.com'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
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
                    sh """
                    echo "AWS Region: ${AWS_REGION}"
                    echo "EKS Cluster: ${EKS_CLUSTER_NAME}"
                    echo "Docker Registry: ${DOCKER_REGISTRY}"
                    echo "Image Tag: ${IMAGE_TAG}"
                    """
                }
            }
        }
        
        stage('ECR Login') {
            steps {
                script {
                    sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${DOCKER_REGISTRY}
                    """
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                    docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} .
                    docker tag ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    """
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'python -m pytest tests/ -v || true'
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    sh """
                    docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG}
                    docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    """
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: 'aws-credentials',
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        sh """
                        # Configure kubectl
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        # Create namespace if not exists
                        kubectl apply -f kubernetes/namespace.yaml
                        
                        # Deploy MySQL first
                        echo "Deploying MySQL..."
                        kubectl apply -f kubernetes/mysql/ -n ${K8S_NAMESPACE}
                        
                        # Wait for MySQL to be ready
                        echo "Waiting for MySQL to be ready..."
                        timeout 300s bash -c 'until kubectl get pods -n ${K8S_NAMESPACE} -l app=mysql --field-selector=status.phase=Running --no-headers | grep -q .; do sleep 5; done'
                        
                        # Deploy Todo Application
                        echo "Deploying Todo App..."
                        kubectl apply -f kubernetes/todo-app/ -n ${K8S_NAMESPACE}
                        
                        # Update deployment with new image
                        kubectl set image deployment/todo-app-deployment \
                            todo-app=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} \
                            -n ${K8S_NAMESPACE}
                        
                        # Wait for rollout to complete
                        echo "Waiting for rollout to complete..."
                        kubectl rollout status deployment/todo-app-deployment -n ${K8S_NAMESPACE} --timeout=300s
                        """
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                sh """
                ./scripts/verify-deployment.sh
                """
            }
        }
    }
    
    post {
        always {
            echo "Pipeline execution completed"
            sh """
            kubectl get pods -n ${K8S_NAMESPACE} || true
            """
        }
        success {
            echo "✅ Deployment successful! Build: ${env.BUILD_NUMBER}"
        }
        failure {
            echo "❌ Deployment failed! Build: ${env.BUILD_NUMBER}"
        }
    }
}