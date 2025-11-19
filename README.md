# Labbyn

Labbyn is a application for your datacenter, labolatory or homelab. You can monitor your infrastructure, set location of each server/platform on interactive dashboard, store information about your assets in inventory and more. Everthing on modern GUI, deployable on most Linux machines and OPEN SOURCE.

## Installation

To install you only need docker, example of installation on Debian:
```bash
apt update
apt upgrade
apt install docker.io docker-compose
apt install -y docker-compose-plugin
```
### Application script

Inside `scripts` directory there is `app.sh` script.

#### Arguments:
- `deploy` - start/install app on your machine
- `update` - rebuild application if nesscesary
- `stop` - stop application container
- `delete` - delete application
- `--dev` - run application in development mode
> [!IMPORTANT]
> **If you use `delete` argument whole application will be deleted including: containers, images, volumes and network**

### Example:

Start application

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