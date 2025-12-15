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


deploy_app() {
    echo "Deploying Docker Compose app..."
    docker-compose -f $COMPOSE_FILE "$COMPOSE_FILE_DEV_FLAG" "$COMPOSE_FILE_DEV" up -d
    echo "App deployed!"
    docker-compose -f $COMPOSE_FILE "$COMPOSE_FILE_DEV_FLAG" "$COMPOSE_FILE_DEV" ps
}

update_app() {
    echo "Updating app..."
    docker-compose -f $COMPOSE_FILE "$COMPOSE_FILE_DEV_FLAG" "$COMPOSE_FILE_DEV" up -d --build
    echo "App updated!"
    docker-compose -f $COMPOSE_FILE "$COMPOSE_FILE_DEV_FLAG" "$COMPOSE_FILE_DEV" ps
}

stop_app() {
    echo "Stopping app..."
    docker-compose -f $COMPOSE_FILE "$COMPOSE_FILE_DEV_FLAG" "$COMPOSE_FILE_DEV" stop
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
    docker-compose -f $COMPOSE_FILE "$COMPOSE_FILE_DEV_FLAG" "$COMPOSE_FILE_DEV" down -v --rmi all
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
