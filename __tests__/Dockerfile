FROM docker.io/library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-1
FROM nginx:1.27.2-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-2
FROM nginx:1.27-bookworm AS nginx-3
FROM nginx AS nginx-4
FROM nginx-4 AS nginx-5
COPY --from=busybox:latest /bin/busybox /bin/busybox
COPY --from=nginx-4 /bin/nginx /bin/nginx
FROM ghcr.io/piotrekkr/dockerfile-updater:test AS private-img
