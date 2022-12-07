#!/bin/bash
# Vinicius Santiago

echo "================== UPGRADE SYSTEM ===================";
sudo su - 
apt update && apt install unzip -y

echo "================== DOWNLOAD ===================";
curl https://releases.hashicorp.com/vault/1.4.0/vault_1.4.0_linux_amd64.zip -o vault.zip
unzip vault.zip
mv vault /usr/local/bin

setcap cap_ipc_lock=+ep /usr/local/bin/vault
useradd --system --home /etc/vault.d --shell /bin/false vault

echo "================== CONFIGURE VAULT ===================";
mkdir -p /vault/data
cd /etc/
mkdir -p vault.d
cp /vagrant/config.hcl /etc/vault.d/ 
chown -R vault:vault /etc/vault.d
chmod 600 /etc/vault.d/config.hcl
#cp /vagrant/vault.service /etc/systemd/system/vault.service

#systemctl enable vault
#systemctl start vault
#systemctl status vault
vault -autocomplete-install

cd /etc/vault.d/
vault server -config=config.hcl

#mymachine
#sudo sh -c "echo '192.168.56.10 vault.vinicius.example' >> /etc/hosts"

#other terminal
#export VAULT_ADDR='http://192.168.56.10:8200'
#vault operator init
#export VAULT_TOKEN="s.Gn4a2o3YklB27izWWDPuKusy"
#vault operator unseal
#vault login


# Vault configure Generic key
# ---------------------------
# vault secrets list -detailed
# vault secrets enable kv
# vault policy write my-policy - << EOF
# # Dev servers have version 2 of KV secrets engine mounted by default, so will
# # need these paths to grant permissions:
# path "secret/data/*" {
#   capabilities = ["create", "update", "read", "delete"]
# }
# EOF
# vault kv put service_accounts/sa_rotation accessKeyId="AKIAXSZDJEJ6RRXTFL4K" secretAccessKey="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"
# vault kv get service_accounts/sa_rotation

# Validate new policy
# export VAULT_TOKEN="$(vault token create -field token -policy=my-policy)"
# vault token lookup | grep policies

# NODEJS CODE TO READ VAULT INFORMATION - https://codersociety.com/blog/articles/hashicorp-vault-node | https://developer.hashicorp.com/vault/docs/auth/approle
# npm install node-vault
# vault auth enable approle
# vault write auth/approle/role/my-role \
#     secret_id_ttl=10m \
#     token_num_uses=10 \
#     token_ttl=20m \
#     token_max_ttl=30m \
#     secret_id_num_uses=40 \
#     token_policies=my-policy

# 192.168.56.10
# export ROLE_ID=4a9da329-cbe0-24d0-ec8b-8fa281f3f11a
# export SECRET_ID=2ef4cb03-708e-2010-ab97-e77f3d9e013d

















# ========================================================================
# Vault configure AWS ENGINE - https://developer.hashicorp.com/vault/docs/secrets/aws
# --------------------------
# vault write aws/config/root \
#     access_key= \
#     secret_key= \
#     region=us-east-1

# vault write aws/roles/my-role \
#     credential_type=iam_user \
#     policy_document=-<<EOF
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": "ec2:*",
#       "Resource": "*"
#     }
#   ]
# }
# EOF

# vault write aws/roles/my-other-role \
#     policy_arns=arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess,arn:aws:iam::aws:policy/IAMReadOnlyAccess \
#     iam_groups=group1,group2 \
#     credential_type=iam_user \
#     policy_document=-<<EOF
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": "ec2:*",
#       "Resource": "*"
#     }
#   ]
# }
# EOF