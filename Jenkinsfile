pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        EKS_CLUSTER_NAME = 'todo-app-cluster'
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
        
        stage('Verify AWS Setup') {
            steps {
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh '''
                        echo "配置 AWS 环境变量..."
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" 
                        export AWS_DEFAULT_REGION=us-east-1
                        
                        echo "测试 AWS 凭据..."
                        aws sts get-caller-identity
                        echo "✅ AWS 凭据工作正常！"
                    '''
                }
            }
        }
        
        stage('ECR Login') {
            steps {
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=us-east-1
                        
                        echo "登录到 ECR..."
                        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 319998871902.dkr.ecr.us-east-1.amazonaws.com
                        
                        echo "✅ ECR 登录成功！"
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
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh """
                        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
                        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
                        export AWS_DEFAULT_REGION=us-east-1
                        
                        # 配置 kubectl
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
                        
                        # 创建命名空间
                        kubectl apply -f kubernetes/namespace.yaml
                        
                        # 部署 MySQL
                        echo "部署 MySQL..."
                        kubectl apply -f kubernetes/mysql/ -n ${K8S_NAMESPACE}
                        
                        # 等待 MySQL 就绪
                        echo "等待 MySQL 启动..."
                        sleep 60
                        
                        # 部署应用
                        echo "部署 Todo App..."
                        kubectl apply -f kubernetes/todo-app/ -n ${K8S_NAMESPACE}
                        
                        # 更新镜像
                        kubectl set image deployment/todo-app-deployment \\
                            todo-app=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${IMAGE_TAG} \\
                            -n ${K8S_NAMESPACE}
                        
                        # 等待部署完成
                        kubectl rollout status deployment/todo-app-deployment -n ${K8S_NAMESPACE} --timeout=300s
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                sh """
                    echo "✅ 部署完成！"
                    kubectl get pods -n ${K8S_NAMESPACE}
                    kubectl get services -n ${K8S_NAMESPACE}
                """
            }
        }
    }
    
    post {
        always {
            echo "Pipeline 执行完成"
        }
        success {
            echo "🎉 部署成功！构建号: ${env.BUILD_NUMBER}"
        }
        failure {
            echo "❌ 部署失败！构建号: ${env.BUILD_NUMBER}"
        }
    }
}