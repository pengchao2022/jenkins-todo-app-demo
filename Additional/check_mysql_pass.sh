kubectl get secret mysql-secret -n todo-app-dev -o jsonpath='{.data.mysql-root-password}' | base64 --decode
echo
