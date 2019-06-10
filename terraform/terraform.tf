terraform {
  required_version = ">= 0.12"

  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "bendrucker"

    workspaces {
      name = "cfn-nest"
    }
  }
}
