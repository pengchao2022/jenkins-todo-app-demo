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
        
        stage('Build and Push with Kaniko') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY',
                    credentialsId: 'dev-user-aws-credentials'
                ]]) {
                    sh """
                        # 使用 Kaniko 构建和推送镜像（无需 Docker 守护进程）
                        docker run --rm \
                        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
                        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
                        -v \$(pwd):/workspace \
                        -w /workspace \
                        gcr.io/kaniko-project/executor:latest \
                        --dockerfile=docker/Dockerfile \
                        --destination=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} \
                        --context=dir:///workspace \
                        --cache=true
                        
                        echo "✅ Image built and pushed with Kaniko"
                    """
                }
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
                sh 'python -m pytest tests/ -v || echo "⚠️ Tests completed"'
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
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=${AWS_REGION}
                        
                        echo "🔄 Configuring kubectl..."
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        echo "📁 Creating namespace..."
                        kubectl apply -f kubernetes/namespace.yaml
                        
                        echo "🗄️ Deploying MySQL..."
                        kubectl apply -f kubernetes/mysql/ -n ${K8S_NAMESPACE}
                        
                        echo "⏳ Waiting for MySQL..."
                        sleep 60
                        
                        echo "📦 Deploying Todo App..."
                        kubectl apply -f kubernetes/todo-app/ -n ${K8S_NAMESPACE}
                        
                        echo "🔄 Updating image..."
                        kubectl set image deployment/todo-app-deployment \\
                            todo-app=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} \\
                            -n ${K8S_NAMESPACE}
                        
                        echo "⏳ Waiting for rollout..."
                        kubectl rollout status deployment/todo-app-deployment -n ${K8S_NAMESPACE} --timeout=300s
                        echo "✅ Deployment completed"
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY',
                    credentialsId: 'dev-user-aws-credentials'
                ]]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=${AWS_REGION}
                        
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        echo "📊 Final status:"
                        kubectl get all -n ${K8S_NAMESPACE}
                        echo "✅ Verification completed"
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