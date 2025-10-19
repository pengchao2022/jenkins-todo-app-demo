pipeline {
    agent {
        node {
            label 'jenkins-agent'
        }
    }
    
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
            defaultValue: true,  // 默认跳过测试
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
        
        stage('ECR Login') {
            steps {
                script {
                    echo "🐳 Attempting ECR Login..."
                }
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY',
                    credentialsId: 'dev-user-aws-credentials'
                ]]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="\$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="\$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=${AWS_REGION}
                        
                        echo "🔑 Testing AWS credentials..."
                        aws sts get-caller-identity
                        echo "✅ AWS credentials test passed"
                        
                        echo "🚪 Logging into ECR..."
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}
                        echo "✅ ECR login successful!"
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
                    docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} -f docker/Dockerfile .
                    docker tag ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    echo "✅ Docker image built and tagged"
                """
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    echo "📤 Pushing to ECR..."
                }
                sh """
                    docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG}
                    docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                    echo "✅ Images pushed to ECR"
                """
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY',
                    credentialsId: 'dev-user-aws-credentials'
                ]]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="\$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="\$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=${AWS_REGION}
                        
                        echo "🔄 Configuring kubectl..."
                        
                        # 检查并安装 kubectl 如果不存在（不使用 sudo）
                        if ! command -v kubectl &> /dev/null; then
                            echo "📥 Installing kubectl..."
                            curl -LO "https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                            chmod +x kubectl
                            mkdir -p /usr/local/bin
                            mv kubectl /usr/local/bin/
                        fi
                        
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        echo "📁 Creating namespace..."
                        kubectl apply -f kubernetes/namespace.yaml
                        
                        echo "🗄️ Deploying MySQL..."
                        kubectl apply -f kubernetes/mysql/ -n ${K8S_NAMESPACE}
                        
                        echo "⏳ Waiting for MySQL to be ready..."
                        sleep 30
                        
                        echo "📦 Deploying Todo App..."
                        kubectl apply -f kubernetes/todo-app/ -n ${K8S_NAMESPACE}
                        
                        echo "🔄 Updating image..."
                        kubectl set image deployment/todo-app-deployment \\
                            todo-app=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} \\
                            -n ${K8S_NAMESPACE} --record
                        
                        echo "⏳ Waiting for rollout..."
                        kubectl rollout status deployment/todo-app-deployment -n ${K8S_NAMESPACE} --timeout=300s
                        echo "✅ Deployment completed"
                    """
                }
            }
        }
    }
    
    post {
        always {
            echo "🏁 Pipeline completed for ${params.DEPLOY_ENVIRONMENT}"
        }
        success {
            echo "🎉 SUCCESS: Deployment completed!"
        }
        failure {
            echo "💥 FAILED: Deployment failed"
        }
    }
}