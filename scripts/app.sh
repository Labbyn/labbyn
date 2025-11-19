#!/bin/bash
set -e

# Config
COMPOSE_FILE="../docker-compose.yml"

# Enable development mode if --dev flag is provided
if [[ "$2" == "--dev" ]]; then
    COMPOSE_FILE="../docker-compose-dev.yaml"
    shift
    echo "Running in development mode using $COMPOSE_FILE"
fi

# Function: Deploy app
deploy_app() {
    echo "Deploying Docker Compose app..."
    docker-compose -f $COMPOSE_FILE up -d
    echo "App deployed!"
    docker-compose -f $COMPOSE_FILE ps
}

# Function: Update app
update_app() {
    echo "Updating app..."
    docker-compose -f $COMPOSE_FILE down
    docker-compose -f $COMPOSE_FILE up -d --build
    echo "App updated!"
    docker-compose -f $COMPOSE_FILE ps
}

# Function: Stop app
stop_app() {
    echo "Stopping app..."
    docker-compose -f $COMPOSE_FILE down
    echo "App stopped"
}

# Function: Delete app
delete_app() {
    echo "WARNING: This will permanently delete the app containers and images."
    read -p "Are you sure you want to continue? Type 'yes' to confirm: " CONFIRM

    if [[ "$CONFIRM" != "yes" ]]; then
        echo "Deletion aborted."
        return
    fi

    echo "Deleting app..."
    docker-compose -f $COMPOSE_FILE down -v
    docker-compose -f $COMPOSE_FILE down --rmi all
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
