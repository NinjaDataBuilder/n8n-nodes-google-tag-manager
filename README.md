# NinjaDataBuilder Google Tag Manager for n8n

Bounded Google Tag Manager API v2 nodes with separate OAuth credentials for **self-hosted n8n**.

> ✅ **Published package:** `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2`
>
> ⚠️ **Important:** this is an unverified community node. It is intended for self-hosted n8n. Unverified community nodes are not available on n8n Cloud.

## Start here

| Your situation | Recommended path |
| --- | --- |
| You are installing for the first time | Read [the Portuguese walkthrough](README.pt-BR.md) or [the English walkthrough](README.en.md). |
| You want the shortest safe installation | Use [the installation reference](docs/installation.en.md). |
| You need to understand permissions | Read the [permission contract](docs/permissions-contract.md). |
| You are evaluating staging, Docker, or rollback | Read the [architecture and environment guide](docs/architecture.md). |
| You found a security problem | Follow [SECURITY.md](SECURITY.md). Do not publish secrets in an issue. |

## What the package does

| Role | Intended use | Default posture |
| --- | --- | --- |
| **Read** | Inspect accounts, containers, workspaces, resources, versions, and status | Read-only |
| **Editor** | Make named changes in a draft workspace | Confirmation required |
| **Publisher** | Preview, create a reviewed version, and publish one explicit version | Manual and confirmation-gated |
| **Admin** | Perform bounded account/container administration | Separate credential and explicit confirmation |

Each role has its own credential type and OAuth scope boundary. The node exposes named, allow-listed operations rather than an arbitrary HTTP method/path/payload dispatcher.

## Five-minute safe start

1. Use a self-hosted n8n instance and install the package from **Settings → Community Nodes**.
2. Pin the package to `0.5.2` in staging.
3. Create the **Read Only** credential in n8n's credential screen.
4. Run one account/container read operation with a manual workflow.
5. Only after that, consider Editor, Publisher, or Admin in separate workflows and credentials.

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2
```

Do not put OAuth client secrets, refresh tokens, access tokens, passwords, or customer data in workflow fields, Data Tables, source code, Git, screenshots, or chat.

## What this package does not do

- It does not work as an unverified community node on n8n Cloud.
- It does not expose a generic HTTP dispatcher.
- It does not manage GTM users or permissions.
- It does not delete containers.
- It does not publish automatically or on a schedule.
- It does not turn an OAuth scope into permission to every GTM operation.
- It does not replace staging, backup, review, or a rollback procedure.

## Before using write operations

Keep this order:

```text
Read → review → Editor draft → review diff → Publisher preview/version → explicit publication
```

Keep Publisher and Admin workflows manual and inactive until the payload, target IDs, and expected result have been reviewed. Do not expose Publisher or Admin as a generic AI tool.

## Documentation

- [Português do Brasil — walkthrough completo](README.pt-BR.md)
- [English — complete walkthrough](README.en.md)
- [Instalação detalhada em português](docs/installation.pt-BR.md)
- [Detailed installation in English](docs/installation.en.md)
- [Architecture, environments, sandbox, and rollback](docs/architecture.md)
- [Permission contract](docs/permissions-contract.md)
- [Google Tag Manager API v2 authorization](https://developers.google.com/tag-platform/tag-manager/api/v2/authorization)
- [n8n GUI installation for community nodes](https://docs.n8n.io/integrations/community-nodes/installation/gui-install)

## Development checks

```bash
npm ci
npm test
npm audit --omit=dev
npm pack --dry-run
git diff --check
```

Do not commit OAuth values, customer identifiers, account/container IDs, workflow exports, execution data, or production payloads.

## License

MIT. See [LICENSE](LICENSE).
