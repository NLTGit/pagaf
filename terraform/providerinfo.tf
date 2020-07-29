//Terraform programmatic creds
provider "aws" {
  access_key = var.PROVIDER_ACCESS_KEY
  secret_key = var.PROVIDER_SECRET_KEY
  region     = "us-east-1"
}
