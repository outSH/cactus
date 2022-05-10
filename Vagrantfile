# -*- mode: ruby -*-
# vi: set ft=ruby :

ENV['VAGRANT_DEFAULT_PROVIDER'] = 'hyperv'
ENV['VAGRANT_EXPERIMENTAL'] = 'disks'

Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu2004"
  config.vm.hostname = "CactusDevVM"
  config.vm.disk :disk, size: "200GB", primary: true # extend default disk

  config.vm.provider "hyperv" do |h|
    h.cpus = 4
    h.maxmemory = 16384
    h.enable_virtualization_extensions = true
    h.linked_clone = true
  end

  # Setup VM
  config.vm.provision "shell", inline: <<-SHELL
    # Install prerequisites
    apt-get update
    apt-get install -y \
        build-essential \
        python3-pip \
        openjdk-11-jdk \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
    cmake \
    git

    # Install docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose docker-compose-plugin
    # Add vagrant user to docker group
    usermod -aG docker vagrant

    # Install Rust toolchain (rustup, rustc, cargo, etc.)
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --verbose --default-toolchain=1.57.0
  SHELL

  # Setup Node
  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    # Installing Node Version Manager (nvm)
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    nvm install 16
    nvm install 14
    nvm alias default 16
  SHELL
end
