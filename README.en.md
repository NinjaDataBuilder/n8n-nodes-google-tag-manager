# NinjaDataBuilder Google Tag Manager for n8n

Bounded Google Tag Manager API v2 nodes and role-separated OAuth credentials for self-hosted n8n.

> **Public distribution status:** the repository is being prepared for release. The package is not yet published to npm. After publication, the package name will be `@ninjadatabuilder/n8n-nodes-google-tag-manager`.

## 1. Requirements

- a **self-hosted** n8n instance;
- Owner or Admin permissions to install community nodes;
- community packages enabled on the instance;
- access to Google Cloud to create and authorize GTM OAuth;
- a backup or rollback procedure before installing in production.

Unverified community nodes are not available on n8n Cloud. This project was reference-validated on n8n `2.32.5`; validate it in staging first.

## 2. Install from the n8n UI

After the first public npm release:

1. Open **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `@ninjadatabuilder/n8n-nodes-google-tag-manager`.
4. To pin a version, enter, for example, `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2`.
5. Read and accept the warning about unverified community code.
6. Select **Install**.
7. Wait for n8n to finish and confirm that the nodes appear in the editor.

UI installation requires Owner or Admin permissions and is available on self-hosted n8n.

## 3. Install with Docker/environment management

For configuration-managed instances, n8n can reconcile community packages at startup:

```bash
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES='[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.2"}]'
```

Restart the editor, worker, and webhook services according to your architecture.

> When `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true` is enabled, n8n removes community packages not present in the list. Preserve existing packages before enabling this mode.

For higher assurance, pin the version and, where appropriate, the tarball SHA-512 checksum.

## 4. Verify the installation

In n8n:

1. Create a manual workflow.
2. Search for **Google Tag Manager**.
3. Confirm that the Read, Editor, Publisher, and Admin nodes are available.
4. Open **Settings → Community Nodes** and confirm the installed version.
5. Execute a read-only operation first.
6. Confirm that the output is summarized and does not contain complete GTM configuration.

Do not consider the installation validated merely because the package appears in the list: run a controlled smoke test with a test credential.

## 5. Credentials and scopes

Create credentials in the n8n UI. Never put a client secret, refresh token, password, or access token in chat, workflows, Data Tables, source code, or Git.

| Role | Credential | Main scopes |
| --- | --- | --- |
| Read | `Google Tag Manager OAuth2 API` | `tagmanager.readonly` |
| Editor | `Google Tag Manager OAuth2 API - Editor` | `tagmanager.readonly`, `tagmanager.edit.containers` |
| Publisher | `Google Tag Manager OAuth2 API - Publisher` | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` |
| Admin | `Google Tag Manager OAuth2 API - Admin` | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` |

An OAuth scope is not authorization for every API operation. Each node has its own allow-list.

## 6. Recommended adoption order

1. Read: inventory and audit.
2. Editor: named draft workspace changes, always confirmed.
3. Publisher: preview, version creation, and explicit publication.
4. Admin: account or container administration only after target review.

Keep write workflows manual and inactive until the payload has been reviewed. Do not expose Admin or Publisher as generic AI tools.

## 7. Upgrade, downgrade, and uninstall

- Back up before upgrading.
- Pin the package version in production.
- To downgrade, uninstall the current version and reinstall the previous version.
- To uninstall from the UI: **Settings → Community Nodes → Options → Uninstall package**.
- With Docker, restore the previous package in `N8N_COMMUNITY_PACKAGES` and restart.
- After any change, run the Read smoke test before reopening write workflows.

## 8. Local development

```bash
git clone https://github.com/NinjaDataBuilder/n8n-nodes-google-tag-manager.git
cd n8n-nodes-google-tag-manager
npm ci
npm test
npm audit --omit=dev
npm pack --dry-run
```

Install the tarball in staging first. Do not install directly in production without a backup and rollback path.

## 9. Security boundaries

The package does not provide:

- a generic HTTP dispatcher;
- GTM user/permission administration;
- container deletion;
- automatic or scheduled publication;
- generic AI-tool exposure for Admin or Publisher;
- storage of tokens or secret payloads in workflow fields.

Report security issues using [SECURITY.md](SECURITY.md), without including secrets or customer data.

## Links

- [Detailed installation reference](docs/installation.en.md)
- [Português do Brasil](README.pt-BR.md)
- [Permission contract](docs/permissions-contract.md)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [n8n community node installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation)
