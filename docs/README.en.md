# NinjaDataBuilder Google Tag Manager for n8n

Bounded Google Tag Manager API v2 nodes and role-separated OAuth credentials for **self-hosted n8n**.

> [!IMPORTANT]
> The public package is available as `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.4`.
>
> [!WARNING]
> This is an unverified community node. The supported target is self-hosted n8n. Unverified community nodes are not available on n8n Cloud.

## Quick answer

| Question | Answer |
| --- | --- |
| Can I install it from npm? | Yes, through n8n or n8n environment management. |
| Do I need to clone the source repository? | No. End users only need the public package. |
| Do I need n8n Cloud? | No. The target is self-hosted n8n. |
| Can I start by publishing GTM changes? | No. Start with Read and a read-only workflow. |
| Do I need OAuth? | Yes. Authorize it through n8n's credential screen. |
| Do I need Admin? | No. Use the smallest role that can complete the task. |

## What the package provides

| Role | Intended use | Default posture |
| --- | --- | --- |
| **Read** | Inventory, audit, account/container/workspace/resource/version/status reads | Read-only |
| **Editor** | Named changes in a draft workspace | Confirmation required |
| **Publisher** | Preview, reviewed version creation, and explicit publication | Manual and confirmation-gated |
| **Admin** | Bounded account/container administration | Separate credential and explicit confirmation |

Each role has a separate credential type and OAuth scope boundary. The package exposes named allow-listed operations rather than an arbitrary HTTP dispatcher.

## Before you start

You need:

- a **self-hosted** n8n instance;
- Owner or Admin permission in n8n to install community nodes;
- outbound access to `registry.npmjs.org`;
- access to Google Cloud to configure OAuth;
- a Google account with access to the target GTM account/container;
- staging, backup, and rollback before production installation.

> [!WARNING]
> Enter client secrets, refresh tokens, access tokens, and passwords only in n8n's credential screen. Never put them in workflows, Data Tables, Git, screenshots, issues, or chat.

## Install from the n8n UI

This is the recommended first-install path.

### 1. Open Community Nodes

In n8n, open:

```text
Settings → Community Nodes → Install
```

GUI installation requires Owner or Admin permissions and is available on self-hosted n8n.

### 2. Enter the pinned package

Use exactly:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.4
```

Pinning avoids silently changing behavior when a future version is released.

### 3. Accept the warning and install

Read the unverified community-code warning, confirm the installation, and wait for n8n to finish.

If n8n requests a restart, restart only after confirming that you have a rollback path and a backup.

### 4. Confirm the nodes

Search for `Google Tag Manager` in the editor and confirm:

- `Google Tag Manager`;
- `Google Tag Manager Editor`;
- `Google Tag Manager Publisher`;
- `Google Tag Manager Admin`.

Open **Settings → Community Nodes** and confirm version `0.5.4`.

## Install through Docker or environment management

Use this when the deployment must be reproducible and controlled by configuration.

```dotenv
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES_REGISTRY=https://registry.npmjs.org
N8N_COMMUNITY_PACKAGES=[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.4"}]
```

Recreate or restart the n8n services according to your architecture: editor, worker, webhook, and runners when present.

> [!CAUTION]
> `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true` makes the declared list authoritative. Packages previously installed through the UI and omitted from the list may be removed at startup. Inventory and preserve the existing list before enabling it.

For additional supply-chain control, add the SHA-512 checksum published by npm. Do not use a custom npm registry for this public package.

## Configure Google OAuth

The package uses Google's OAuth2 flow. The visual steps can vary with your n8n version and Google organization policy, but the safe sequence is:

1. open Google Cloud Console;
2. select or create the appropriate project;
3. configure the OAuth consent screen according to your organization policy;
4. create a web-application OAuth client;
5. open the credential in n8n and copy the redirect URL shown by n8n itself;
6. add that URL as an authorized redirect URI in Google Cloud;
7. enter Client ID and Client Secret only in n8n's credential screen;
8. save and authorize with the Google account that has the intended GTM access;
9. confirm that the selected account and container are within that account's GTM permissions.

The package does not accept tokens as workflow parameters. n8n's credential store must manage them.

## Create the Read credential first

Use:

```text
Google Tag Manager OAuth2 API - Read Only
```

Main scope:

```text
https://www.googleapis.com/auth/tagmanager.readonly
```

Create a manual workflow and run an account, container, or status read. The first test proves:

1. the package is loaded;
2. OAuth works;
3. the Google account can access the intended GTM resources.

A `403` usually means the Google user lacks GTM access, even when OAuth authorization succeeded.

## Adopt the other roles in order

### Editor

Credential:

```text
Google Tag Manager OAuth2 API - Editor
```

Main scopes:

```text
tagmanager.readonly
tagmanager.edit.containers
```

Use it only for named draft-workspace changes. Review account ID, container ID, workspace ID, resource, payload, and result before confirming.

### Publisher

Credential:

```text
Google Tag Manager OAuth2 API - Publisher
```

Main scopes:

```text
tagmanager.readonly
tagmanager.edit.containerversions
tagmanager.publish
```

Use this sequence:

```text
read state → review workspace → preview → create explicit version → review version → publish explicitly
```

> [!WARNING]
> **Create Version is not a preview.** It creates a real version, consumes the source workspace in GTM, and returns a replacement workspace. Run it only after reviewing fingerprints, IDs, name, and impact.
>
> [!CAUTION]
> Publication requires a literal confirmation: set `Confirm Publish = true` and enter exactly `PUBLICAR {versionId}`. Example: `PUBLICAR 123456`. `PUBLISH 123456` is rejected.

Do not schedule publication or expose Publisher as a generic AI tool.

### Admin

Credential:

```text
Google Tag Manager OAuth2 API - Admin
```

Main scopes:

```text
tagmanager.readonly
tagmanager.edit.containers
tagmanager.manage.accounts
```

Admin is for bounded account/container administration. It should not be the default credential for ordinary workflows.

## What not to do

- Do not install in production first.
- Do not use n8n Cloud expecting an unverified community node to work.
- Do not install without a backup and rollback path.
- Do not use `latest` in production; pin `@0.5.4`.
- Do not put secrets in workflow fields, Data Tables, Git, logs, or screenshots.
- Do not reuse the Admin credential for Publisher.
- Do not reuse the Publisher credential for Editor.
- Do not activate Publisher/Admin automatically or on a schedule.
- Do not publish without reviewing the diff, workspace, version ID, and target.
- Do not change a production container merely because a read succeeded.
- Do not assume an OAuth scope grants GTM permissions the user does not have.
- Do not use arbitrary API endpoints, methods, paths, or payloads.
- Do not enable environment management without preserving all existing packages.
- Do not share tokens when asking for help; redact values before sharing logs.

## Upgrade, rollback, and reinstall

### Controlled upgrade

1. Back up the instance.
2. Install the new version in staging first.
3. Run the Read smoke test.
4. Compare behavior and logs.
5. Update production only after validation.

### UI rollback

1. Open **Settings → Community Nodes**.
2. Choose **Options → Uninstall package**.
3. Reinstall the previous pinned version.
4. Restart if requested.
5. Run the Read smoke test again.

### Environment rollback

Restore the previous entry in `N8N_COMMUNITY_PACKAGES` and recreate only the affected n8n services. Do not remove PostgreSQL, Redis, or n8n volumes to solve a package problem.

### Clean sandbox reinstall

A clean reinstall belongs in a disposable sandbox, not production:

```bash
docker compose down --volumes --remove-orphans
docker compose up -d
```

Use this only in the dedicated sandbox project and volume. It destroys the disposable SQLite state.

## Troubleshooting

| Symptom | Likely cause | Safe action |
| --- | --- | --- |
| Package does not appear | Not self-hosted, installation disabled, or restart pending | Check Community Nodes policy and n8n logs |
| Package returns `404` | Wrong registry, version, or network | Use npm official and `0.5.4`; do not republish the same version |
| GTM returns `403` | Google user lacks account/container access | Fix GTM permissions; do not widen scopes automatically |
| OAuth does not complete | Incorrect redirect URI or consent configuration | Use the URI shown by n8n; never share secrets in chat |
| Node loads but operation fails | Invalid IDs, workspace, or payload | Run Read, review IDs, and test in draft |
| Package disappears after restart | Declarative list does not contain the package | Restore the package entry in `N8N_COMMUNITY_PACKAGES` |
| n8n fails after the change | Invalid environment/configuration | Restore the previous env and restart only n8n services |

## Security boundaries

The package does not provide:

- a generic HTTP dispatcher;
- GTM user/permission management;
- container deletion;
- automatic or scheduled publication;
- generic AI exposure of Admin/Publisher;
- token or secret-payload storage in workflow fields.

Report security issues through [SECURITY.md](SECURITY.md), without including secrets, customer data, or real exports.

## References

- [Main README](../README.md)
- [Detailed installation](installation.en.md)
- [Português do Brasil](README.pt-BR.md)
- [Architecture, environments, and sandbox](architecture.md)
- [Permission contract](permissions-contract.md)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [n8n Community Nodes GUI installation](https://docs.n8n.io/integrations/community-nodes/installation/gui-install)
