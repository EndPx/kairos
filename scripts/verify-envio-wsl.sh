#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:?Pass the packages/envio-indexer directory as the first argument.}"
verify_dir="/tmp/kairos-envio-verify"
node_version="v22.23.2"
node_archive="node-${node_version}-linux-x64.tar.xz"
node_archive_path="/tmp/${node_archive}"
node_home="/tmp/node-${node_version}-linux-x64"
node_sha256="d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307"

rm -rf "${verify_dir}"
mkdir -p "${verify_dir}"
cp -R "${source_dir}/." "${verify_dir}/"

if [[ ! -x "${node_home}/bin/node" ]]; then
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/${node_archive}" -o "${node_archive_path}"
  printf '%s  %s\n' "${node_sha256}" "${node_archive_path}" | sha256sum --check --status
  tar -xJf "${node_archive_path}" -C /tmp
fi

export PATH="${node_home}/bin:${PATH}"
corepack enable
corepack prepare pnpm@10.21.0 --activate >/dev/null

cd "${verify_dir}"
pnpm install

# These syntactically valid sentinel values exercise configuration interpolation
# and generated types. They are never a deployment identity or live evidence.
export ENVIO_KAIROS_POLICY_ADDRESS="0x1111111111111111111111111111111111111111"
export ENVIO_KAIROS_POLICY_START_BLOCK="1"
export ENVIO_KAIROS_CRE_RECEIVER_ADDRESS="0x2222222222222222222222222222222222222222"
export ENVIO_KAIROS_CRE_RECEIVER_START_BLOCK="1"

# Validate the lifecycle-only production configuration first.
pnpm codegen

# The handler suite also exercises the separately gated receiver path.
cp config.execution.yaml config.yaml
pnpm codegen
pnpm test
pnpm typecheck
