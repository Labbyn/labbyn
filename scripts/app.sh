#!/bin/bash
set -e

COMPOSE_FILE="../docker-compose.yaml"
COMPOSE_FILE_DEV=""

SERVICE=""

COMMAND="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dev)
            COMPOSE_FILE_DEV="../docker-compose.dev.yaml"
            echo "Running in development mode with $COMPOSE_FILE_DEV"
            shift
            ;;
        *)
            SERVICE="$1"
            shift
            ;;
    esac
done


run_compose() {
    if [[ -n "$COMPOSE_FILE_DEV" ]]; then
        docker-compose -f "$COMPOSE_FILE" -f "$COMPOSE_FILE_DEV" "$@"
    else
        docker-compose -f "$COMPOSE_FILE" "$@"
    fi
}


deploy_app() {
    if [[ -n "$SERVICE" ]]; then
        echo "Deploying specific service: $SERVICE"
        run_compose up -d "$SERVICE"
        echo "Specific service deployed!"
        run_compose ps "$SERVICE"
    else
        echo "Deploying Docker Compose app..."
        run_compose up -d
        echo "App deployed!"
        run_compose ps
    fi
}

update_app() {
    if [[ -n "$SERVICE" ]]; then
        echo "Updating specific service: $SERVICE"
        run_compose up -d --build "$SERVICE"
        echo "Specific service updated!"
        run_compose ps "$SERVICE"
    else
        echo "Updating app..."
        run_compose up -d --build
        echo "App updated!"
        run_compose ps
    fi
}

stop_app() {
    if [[ -n "$SERVICE" ]]; then
        echo "Stopping specific service: $SERVICE"
        run_compose stop "$SERVICE"
        echo "Specific service stopped!"
    else
        echo "Stopping app..."
        run_compose stop
        echo "App stopped"
    fi
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

case "$COMMAND" in
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
        echo "Usage: $0 {deploy|update|stop|delete} [--dev] [service]"
        exit 1
        ;;
esac
