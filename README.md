# Dockerfile Base Image Updater

[![GitHub Super-Linter](https://github.com/actions/javascript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/javascript-action/actions/workflows/ci.yml/badge.svg)

GitHub Action to keep base images inside Dockerfiles up to date.

## About

It is important to keep base image used inside Dockerfile up to date. This
action will help you with this process by:

1. extracting images from Dockerfile instructions
1. checking inside Docker registries for new versions of images and their
   digests
1. modify Dockerfile with new versions if available

When SemVer is used (e.g. `nginx:1.2.3-alpine`) as image tag it will try to
update `PATCH` version and its digest. In case of non SemVer tags it will add or
update image tag digest. Examples:

```text
nginx                                       => nginx:latest@sha256:<sha>
nginx:latest                                => nginx:latest@sha256:<sha>
nginx@sha256:<sha>                          => nginx:latest@sha256:<updated-sha>
nginx:latest@sha256:<sha>                   => nginx:latest@sha256:<updated-sha>
nginx:1                                     => nginx:1@sha256:<sha>
nginx:1.2                                   => nginx:1.2@sha256:<sha>
nginx:1.2@sha256:<sha>                      => nginx:1.2@sha256:<updated-sha>
nginx:1.2.3                                 => nginx:1.2.<latest>@sha256:<sha>
nginx:1.2.3@sha256:<sha>                    => nginx:1.2.<latest>@sha256:<updated-sha>
debian:1.2.3-bookworm                       => debian:1.2.<latest>-bookworm@sha256:<sha>
debian:1.2.3-bookworm@sha256:<sha>          => debian:1.2.<latest>-bookworm@sha256:<updated-sha>
private-registry.io/ns/img:tag              => private-registry.io/ns/img:tag@sha256:<sha>
private-registry.io/ns/img:tag@sha256:<sha> => private-registry.io/ns/img:tag@sha256:<updated-sha>
```

### Supported Dockerfile instructions

This action will update images used inside `FROM` and `COPY --from=`
instructions.

Instructions presented below are not currently supported:

```dockerfile
# dynamic image based on build arg
ARG VERSION=latest
FROM busybox:$VERSION

# RUN with mount and from
RUN --mount=type=bind,from=busybox:latest,target=/mnt cp /mnt/file /file

# multiline instructions like
COPY \
    --from=busybox:latest \
    /mnt/file \
    /file
```

### Supported Docker registries

Action supports both public and private registries. Registry must implement
[Docker Registry v2 API](https://distribution.github.io/distribution/).
Currently all major registries implement this v2 API.

## Usage

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Update Dockerfile
    uses: piotrekkr/dockerfile-updater@v1
    with:
      dockerfile: |
        Dockerfile
        some/other/Dockerfile

  - name: Print changes in files
    run: git diff
```

### Private registry

Docker Hub:

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Login to Docker Hub
    uses: docker/login-action@v3
    with:
      username: ${{ vars.DOCKERHUB_USERNAME }}
      password: ${{ secrets.DOCKERHUB_TOKEN }}

  - name: Update Dockerfile
    uses: piotrekkr/dockerfile-updater@v1
    with:
      dockerfile: Dockerfile

  - name: Print changes in files
    run: git diff
```

GCR with
[Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Authorize in GCP
    uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: ${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER_ID }}
      service_account: ${{ vars.GCP_SERVICE_ACCOUNT_EMAIL }}

  - name: Set up Cloud SDK
    uses: google-github-actions/setup-gcloud@v2

  - name: Configure Docker in GCP
    run: gcloud auth configure-docker europe-docker.pkg.dev

  - name: Update Dockerfile
    uses: piotrekkr/dockerfile-updater@v1
    with:
      dockerfile: Dockerfile

  - name: Print changes in files
    run: git diff
```

### Sending changes as PR

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Update Dockerfile
    uses: piotrekkr/dockerfile-updater@v1
    with:
      dockerfile: |
        Dockerfile
        some/other/Dockerfile

  - name: Create Pull Request
    uses: peter-evans/create-pull-request@v7
    with:
      token: ${{ secrets.CUSTOM_PAT }}
      author: some-user <12345+some-user@users.noreply.github.com>
      commit-message: Dockerfile updates
      branch: chore/update-dockerfile-base-images
      base: main
      delete-branch: true
      title: 'chore: update dockerfile base images'
      body: Automated dockerfile base image updates
      add-paths: |
        Dockerfile
        some/other/Dockerfile
```

## Inputs

| Name         | Required | Description                                       |
| ------------ | -------- | ------------------------------------------------- |
| `dockerfile` | `true`   | Dockerfile path, use multiline for multiple files |

## Development

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy. If you are using a version manager like
> [`nodenv`](https://github.com/nodenv/nodenv) or
> [`nvm`](https://github.com/nvm-sh/nvm), you can run `nodenv install` in the
> root of your repository to install the version specified in
> [`package.json`](./package.json). Otherwise, 20.x or later should work!

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the JavaScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   npm test
   ```

> [!NOTE]
>
> If your IDE support devcontainers, you can reopen project inside devcontainer.
