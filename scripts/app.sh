#!/bin/bash
set -e

COMPOSE_FILE="../docker-compose.yaml"
COMPOSE_FILE_DEV_FLAG=""
COMPOSE_FILE_DEV=""

# Enable development mode if --dev flag is provided
if [[ "$2" == "--dev" ]]; then
    COMPOSE_FILE_DEV="../docker-compose.dev.yaml"
    COMPOSE_FILE_DEV_FLAG="-f"
    echo "Running in development mode with $COMPOSE_FILE_DEV"
fi

run_compose() {
    if [[ -n "$COMPOSE_FILE_DEV" ]]; then
        docker-compose -f "$COMPOSE_FILE" -f "$COMPOSE_FILE_DEV" "$@"
    else
        docker-compose -f "$COMPOSE_FILE" "$@"
    fi
}


deploy_app() {
    echo "Deploying Docker Compose app..."
    run_compose up -d
    echo "App deployed!"
    run_compose ps
}

update_app() {
    echo "Updating app..."
    run_compose up -d --build
    echo "App updated!"
    run_compose ps
}

stop_app() {
    echo "Stopping app..."
    run_compose stop
    echo "App stopped"
}

delete_app() {
    echo "WARNING: This will permanently delete the app containers and images."
    read -r -p "Are you sure you want to continue? Type 'yes' to confirm: " CONFIRM

    if [[ "$CONFIRM" != "yes" ]]; then
        echo "Deletion aborted."
        return
    fi

    echo "Deleting app..."
    run_compose down -v --rmi all
    echo "App deleted"
}

case "$1" in
    deploy)
        deploy_app
        ;;
    update)
        update_app
        ;;
    stop)
        stop_app
        ;;
    delete)
        delete_app
        ;;
    *)
        echo "Usage: $0 {deploy|update|stop|delete}"
        exit 1
        ;;
esac
