Vagrant.configure("2") do |config|
    config.vm.provider "virtualbox"
    config.vm.box = "ubuntu/bionic64"
  
    config.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end

    config.vm.define "vault" do |vault|
        vault.vm.hostname = "vault.vinicius.example"
        vault.vm.network "private_network", ip: "192.168.56.10"
        vault.vm.provider "virtualbox" do |vb|
            vb.name = "vault"
        end

        vault.vm.provision "shell", path: "prepare-vault.sh"
    end
end