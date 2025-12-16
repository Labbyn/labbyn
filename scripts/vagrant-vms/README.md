# Vagrant hosts

## Setup

Install vagrant on your host machine: [Install Vagrant](https://developer.hashicorp.com/vagrant/tutorials/get-started/install)

Install VirtualBox on your host machine [Install VirtualBox](https://www.virtualbox.org/wiki/Downloads)
## Commands

```bash
cd scripts/vagrant-vms # location of config files
vagrant up # builds VMs defined in Vagrantfile
vagrant destroy -f # deletes VMs defined in Vagrantfile
```

## SSH connection

```bash
ssh vagrant@192.168.56.101 # VM IP address is located in Vagrantfile

# default credentials vagrant:vagrant

# Fix for WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
ssh-keygen -R <VM IP>
```