#!/usr/bin/env bash

# Patch bashrc
cat <<END >> ~/.bashrc

alias dcs='docker stop \$(docker ps -a -q)'
alias dcrm='docker rm \$(docker ps -a -q)'
alias dcrmi='docker rmi -f \$(docker images -qa)'
alias dcnp='docker network prune -f'
alias dcvp='docker volume prune -f'
alias dcprune='dcs; dcrm; dcrmi; dcnp; dcvp'
END

# Path vimrc
echo 'colorscheme industry' > ~/.vimrc

# Setup git
git config --global user.name "Michal Bajer" # "John Doe"
git config --global user.email michal.bajer@fujitsu.com # johndoe@example.com
git config --global core.editor vim
echo "git config:"
git config --list

# Add github to known_hosts
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keyscan -H github.com >> ~/.ssh/known_hosts

# Generate key pair
ssh-keygen -b 4096 -t rsa -q -f ~/.ssh/id_rsa -N ""
echo "######### PUBLIC KEY #########"
cat ~/.ssh/id_rsa.pub
echo "##############################"
