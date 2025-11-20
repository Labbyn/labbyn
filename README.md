# Labbyn
test
Labbyn is an application for your datacenter, laboratory or homelab. You can monitor your infrastructure, set the location of each server or platform on an interactive dashboard, store information about your assets in an inventory and more. Everything runs on a modern GUI, is deployable on most Linux machines and is **OPEN SOURCE**.

## Installation

To install you only need docker  and docker compose.
Example of Debian installation:
```bash
apt update
apt upgrade
apt install docker.io docker-compose
apt install -y docker-compose-plugin
```
### Application script

Inside the `scripts` directory there is an `app.sh` script that can be used to manage your application.

#### Arguments:
- `deploy` - start/install app on your machine
- `update` - rebuild application if nesscesary
- `stop` - stop application container
- `delete` - delete application
- `--dev` - run application in development mode
> [!IMPORTANT]
> **If you use the `delete` argument entire application will be deleted including containers, images, volumes and networks**

### Example:

Start/Install application

```bash
./app.sh deploy
```

Stop application

```bash
./app.sh stop
```

Start application in developement mode:
```bash
./app.sh deploy --dev
```

**PJATK 2025**:
s26990, s26985, s27081, s27549