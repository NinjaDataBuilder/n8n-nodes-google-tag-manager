# NinjaDataBuilder Google Tag Manager for n8n

Role-separated, bounded Google Tag Manager API v2 nodes and OAuth credentials for self-hosted n8n.

> **Public-release status:** the repository is being prepared for public distribution. The package is not yet published to npm. Installation instructions below are written for the first public release and use the package name `@ninjadatabuilder/n8n-nodes-google-tag-manager`.

## Documentation

- [Português do Brasil — guia completo](README.pt-BR.md)
- [English — complete guide](README.en.md)
- [Installation reference — Português](docs/installation.pt-BR.md)
- [Installation reference — English](docs/installation.en.md)
- [Permission contract](docs/permissions-contract.md)
- [Architecture](docs/ARCHITECTURE.md)

## What this package provides

- **Read:** account, container, workspace, tag, trigger, variable, folder, environment, version, and status inspection.
- **Editor:** named, confirmation-gated draft workspace changes.
- **Publisher:** guarded version creation and publication with preview, fingerprint, live verification, and redacted output.
- **Admin:** bounded account/container administration with explicit confirmation and no generic API dispatcher.

Each role has a separate credential type and least-privilege OAuth scope boundary. Secrets belong only in n8n's encrypted credential store.

## Important compatibility note

This package is designed for **self-hosted n8n**. Unverified community nodes are not available on n8n Cloud. The reference deployment has been validated with n8n `2.32.5`; test the package in a staging instance before using it in production.

## Quick start

1. Install the package from n8n **Settings → Community Nodes** after the public npm release.
2. Restart n8n if your installation method requires it.
3. Create only the role credential you need in the n8n UI.
4. Start with the Read node and a read-only workflow.
5. Keep Editor, Publisher, and Admin workflows manual-only and confirmation-gated.

See the language-specific guides for the complete procedure, OAuth setup, Docker/environment installation, validation, rollback, and troubleshooting.

## Development

```bash
npm ci
npm test
npm audit --omit=dev
npm pack --dry-run
```

The package is client-neutral. Do not commit OAuth values, account IDs, container IDs, customer names, workflow exports, or production data.

## License

MIT. See [LICENSE](LICENSE).
