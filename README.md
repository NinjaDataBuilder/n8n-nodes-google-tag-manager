# 🏷️ NinjaDataBuilder Google Tag Manager for n8n

[![npm version](https://img.shields.io/npm/v/%40ninjadatabuilder%2Fn8n-nodes-google-tag-manager?label=npm)](https://www.npmjs.com/package/@ninjadatabuilder/n8n-nodes-google-tag-manager)
[![npm downloads](https://img.shields.io/npm/dm/%40ninjadatabuilder%2Fn8n-nodes-google-tag-manager?label=downloads)](https://www.npmjs.com/package/@ninjadatabuilder/n8n-nodes-google-tag-manager)
[![License](https://img.shields.io/npm/l/%40ninjadatabuilder%2Fn8n-nodes-google-tag-manager?label=license)](LICENSE)
[![n8n](https://img.shields.io/badge/n8n-self--hosted-EA4B71?logo=n8n&logoColor=white)](https://n8n.io/)
[![Google Tag Manager](https://img.shields.io/badge/Google%20Tag%20Manager-API%20v2-4285F4?logo=google&logoColor=white)](https://developers.google.com/tag-platform/tag-manager/api/v2)
[![Version](https://img.shields.io/badge/version-0.5.4-4c1)](https://www.npmjs.com/package/@ninjadatabuilder/n8n-nodes-google-tag-manager)

Role-separated, bounded Google Tag Manager API v2 nodes and OAuth credentials for **self-hosted n8n**.

> [!IMPORTANT]
> The public package is available as `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.4`. Pin the version in production and validate the package in staging first.

> [!WARNING]
> This is an **unverified community node**. It is intended for self-hosted n8n; unverified community nodes are not available on n8n Cloud.

<hr>

## 🧭 Start here

| If you are... | Start with |
| --- | --- |
| Installing for the first time | [Five-minute safe start](#-five-minute-safe-start) |
| Choosing credentials | [Role and permission matrix](#-role-and-permission-matrix) |
| Configuring Google OAuth | [OAuth setup](#-oauth-setup) |
| Managing Docker deployments | [Environment-managed installation](#-environment-managed-installation) |
| Reviewing publication risk | [Publisher workflow](#-publisher-workflow) and [security boundaries](#-security-boundaries) |
| Troubleshooting | [Troubleshooting](#-troubleshooting) |
| Contributing | [Development checks](#-development-checks) |

## 🎯 What this package does

The package exposes named, allow-listed n8n nodes for bounded GTM operations. It uses separate OAuth credentials and scope boundaries for four operational roles:

| Role | Main use | Default posture |
| --- | --- | --- |
| **Read** | Inventory, audit, account/container/workspace/resource/version/status reads | Read-only |
| **Editor** | Named changes in a draft workspace | Confirmation required |
| **Publisher** | Preview, explicit version creation, and publication | Manual and confirmation-gated |
| **Admin** | Bounded account/container administration | Separate credential and explicit confirmation |

It does **not** expose an arbitrary HTTP method/path/payload dispatcher.

## 🚀 Five-minute safe start

1. Use a **self-hosted** n8n instance with Community Nodes enabled.
2. Install the pinned package from **Settings → Community Nodes → Install**:

   ```text
   @ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.4
   ```

3. Create the Read credential in the n8n credential screen.
4. Build a manual workflow with one account, container, or status read.
5. Confirm that OAuth works and the Google account can access the intended GTM resources.
6. Keep Editor, Publisher, and Admin workflows manual and inactive until their targets and payloads are reviewed.

> [!NOTE]
> GUI installation requires Owner or Admin permission in n8n. The package itself does not need to be cloned for end-user installation.

## ✅ Requirements

- self-hosted n8n;
- Owner or Admin permission to install community nodes;
- `registry.npmjs.org` network access;
- Google Cloud access to configure OAuth;
- a Google account with access to the target GTM account/container;
- staging, backup, and rollback before production installation.

## 🔐 Secrets and OAuth

Enter Client ID, Client Secret, refresh tokens, access tokens, and passwords only in n8n's encrypted credential store.

```text
Google Cloud OAuth client
        │
        ▼
n8n credential screen
        │
        ▼
role-specific GTM node
```

The package does not accept tokens through workflow fields or operation parameters. A successful OAuth grant also does not guarantee that the Google user has access to the requested GTM account or container.

## 🧩 Role and permission matrix

| Role | Credential | Main scopes | Use it for |
| --- | --- | --- | --- |
| Read | `Google Tag Manager OAuth2 API - Read Only` | `tagmanager.readonly` | Inventory, audit, and read-only smoke tests |
| Editor | `Google Tag Manager OAuth2 API - Editor` | `tagmanager.readonly`, `tagmanager.edit.containers` | Named draft workspace changes |
| Publisher | `Google Tag Manager OAuth2 API - Publisher` | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` | Preview, explicit version creation, and publication |
| Admin | `Google Tag Manager OAuth2 API - Admin` | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` | Bounded account/container administration |

Use the smallest role that can complete the task. Do not reuse Admin for ordinary reads or Publisher for Editor work.

## 🐳 Environment-managed installation

Use this path when n8n services are managed from Docker or deployment configuration:

```dotenv
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES_REGISTRY=https://registry.npmjs.org
N8N_COMMUNITY_PACKAGES=[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.4"}]
```

Restart the editor, worker, webhook, and runners according to your architecture.

> [!CAUTION]
> `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true` makes the declared list authoritative. Packages installed through the UI but omitted from the list may be removed at startup. Inventory and preserve the existing package list before enabling this mode.

For stronger supply-chain control, pin the version and use the npm tarball SHA-512 checksum where your deployment process supports it.

## ✍️ Publisher workflow

Use this order:

```text
read state → review workspace → preview → create explicit version → review version → publish explicitly
```

> [!WARNING]
> **Create Version is not a preview.** It creates a real GTM version, consumes the source workspace, and returns a replacement workspace. Review fingerprints, IDs, names, and impact before confirming.

> [!CAUTION]
> Publication requires both `Confirm Publish = true` and the literal text `PUBLICAR {versionId}`. For example: `PUBLICAR 123456`. `PUBLISH 123456` is rejected.

Do not schedule publication and do not expose Publisher or Admin as a generic AI tool.

## 🚫 What this package does not do

- It does not support unverified installation on n8n Cloud.
- It does not manage GTM users or permissions.
- It does not delete containers.
- It does not publish automatically or on a schedule.
- It does not convert an OAuth scope into GTM access the user does not have.
- It does not replace staging, backup, review, or rollback.
- It does not accept arbitrary API endpoints, methods, paths, or payloads.

## 🔄 Upgrade, rollback, and uninstall

### Controlled upgrade

1. Back up the n8n instance.
2. Install the new package version in staging.
3. Run the Read smoke test.
4. Compare behavior and logs.
5. Update production only after validation.

### UI rollback

1. Open **Settings → Community Nodes**.
2. Select **Options → Uninstall package**.
3. Reinstall the previous pinned version.
4. Restart n8n if requested.
5. Run the Read smoke test again.

### Environment rollback

Restore the previous `N8N_COMMUNITY_PACKAGES` entry and restart only the affected n8n services. Do not remove PostgreSQL, Redis, or n8n volumes to solve a package problem.

## 🧪 Troubleshooting

| Symptom | Likely cause | Safe action |
| --- | --- | --- |
| Package does not appear | Installation disabled, restart pending, or unsupported n8n target | Check Community Nodes policy and n8n logs |
| npm returns `404` | Wrong registry, version, or network | Use the official registry and pinned `0.5.4` |
| GTM returns `403` | Google user lacks account/container access | Fix GTM permissions; do not widen scopes automatically |
| OAuth does not complete | Incorrect redirect URI or consent configuration | Use the redirect URI shown by n8n |
| Node loads but operation fails | Invalid IDs, workspace, or payload | Run Read, review IDs, and test in draft |
| Package disappears after restart | Declarative list omits the package | Restore the package in `N8N_COMMUNITY_PACKAGES` |
| n8n fails after the change | Invalid environment/configuration | Restore the previous environment and restart only n8n services |

## 📚 Documentation

- [Português do Brasil — guia completo](README.pt-BR.md)
- [English — complete guide](README.en.md)
- [Installation reference — Português](docs/installation.pt-BR.md)
- [Installation reference — English](docs/installation.en.md)
- [Permission contract](docs/permissions-contract.md)
- [Architecture](docs/architecture.md)
- [Security reporting](SECURITY.md)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [n8n community node installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation)

## 🛠️ Development checks

```bash
npm ci
npm test
npm audit --omit=dev
npm pack --dry-run
git diff --check
```

Do not commit OAuth values, account/container IDs, customer identifiers, workflow exports, execution data, or production payloads.

## 📄 License

MIT. See [LICENSE](LICENSE).
