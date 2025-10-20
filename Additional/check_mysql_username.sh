kubectl get deployment mysql-deployment -n todo-app-dev -o yaml | grep -A 10 -B 5 "env:"
