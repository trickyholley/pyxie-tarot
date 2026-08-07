# Terraform

Infrastructure for the AWS migration (issue #102). Decisions/reasoning/build
order live in the `AWS migration plan.md` note in the Obsidian vault, not
here - this is just the code.

## Layout

- `bootstrap/` - one-time stack that creates the S3 bucket the main
  project's state lives in. Has its own local state (gitignored, not
  committed - it can't depend on the backend it's creating). Apply once,
  rarely touch again.
- `versions.tf` / `providers.tf` / `variables.tf` - the main project.
  Resources (Route 53, EC2, RDS, etc.) get added here phase by phase.

## Auth

Uses the `pyxie` AWS CLI SSO profile - export `AWS_PROFILE=pyxie` before
running any `terraform`/`aws` command (or pass `--profile pyxie` to `aws`
directly; Terraform only respects the env var, not a CLI flag). Not
hardcoded into the provider block so it stays portable across machines
with a differently-named local profile.

If commands start failing with credential errors, the SSO session has
likely expired - run `aws sso login --profile pyxie`.

## First-time setup

```bash
export AWS_PROFILE=pyxie

cd bootstrap
terraform init
terraform apply   # creates the state bucket

cd ..
terraform init    # configures the S3 backend using that bucket
```

## Day to day

```bash
export AWS_PROFILE=pyxie
terraform plan    # review before ever applying
terraform apply
```
