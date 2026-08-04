# Installation and operation — English

This is the operational procedure for installing, validating, upgrading, removing, and reinstalling the package on self-hosted n8n.

> ✅ Public package: `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.5`
>
> ⚠️ Do not use this procedure on n8n Cloud: unverified community nodes are not available there.

## Before installation

Confirm all of the following:

- [ ] The instance is self-hosted.
- [ ] You are an n8n Owner or Admin.
- [ ] A recent backup and rollback path exist.
- [ ] The package will be installed in staging first.
- [ ] Outbound access to `https://registry.npmjs.org` is allowed.
- [ ] You have Google Cloud access and a test GTM account/container.
- [ ] No secret or customer data will be placed in chat, Git, or workflows.

The project reference environment was n8n `2.32.5`. Validate newer n8n releases in staging before production use.

## Recommended path: UI installation

### 1. Open the correct screen

In n8n:

```text
Settings → Community Nodes → Install
```

### 2. Pin the version

Enter:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.5
```

Do not use an unpinned package in production.

### 3. Accept the warning and wait

Accept the unverified community-node warning and wait for n8n to finish.

If n8n requests a restart, do so only when backup and rollback are available.

### 4. Verify the installation

In **Settings → Community Nodes**, confirm `0.5.5`. In the editor, search for `Google Tag Manager` and confirm:

- Google Tag Manager;
- Google Tag Manager Editor;
- Google Tag Manager Publisher;
- Google Tag Manager Admin.

The package appearing in the list is not enough: run the Read smoke test.

## Reproducible path: Docker/environment

Use these n8n settings:

```dotenv
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES_REGISTRY=https://registry.npmjs.org
N8N_COMMUNITY_PACKAGES=[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.5"}]
```

In a `docker-compose.yml`, preserve the JSON as a valid string. Validate before recreating:

```bash
docker compose config --quiet
docker compose up -d
```

Then check readiness and logs:

```bash
curl -fsS http://127.0.0.1:5678/healthz/readiness
docker compose logs --tail=200 n8n
```

Look for readiness and a package-install confirmation. A container being `Up` is not enough: the package must be installed and loaded.

> ⚠️ With `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true`, the list is authoritative. Omitted packages may be removed at startup. Capture the existing list before enabling this mechanism.

### Optional checksum

When your n8n version supports the `checksum` field, you can also pin the npm-published checksum:

```text
sha512-3rZKyvCNvuFQew5J8APx7aDrXlkSpBqGzP1KgtgLqsJ3zeZnBEwavUkZLeesFbeBXkioqzE35irl6tZhTWyr9A==
```

Do not use a registry token or custom registry for this public package.

## Google OAuth

Configure OAuth in n8n's credential screen.

1. Create or select the appropriate Google Cloud project.
2. Configure the consent screen according to organization policy.
3. Create a web-application OAuth client.
4. Open the package credential in n8n.
5. Copy the redirect URI shown by n8n.
6. Register that URI in Google Cloud.
7. Enter Client ID and Client Secret only in n8n's credential screen.
8. Authorize with the Google account that has GTM access.
9. Never put a token in a workflow or node input.

If OAuth succeeds but GTM returns `403`, review the Google account's permission on the target account/container. OAuth approval does not replace GTM permissions.

## Read smoke test

1. Create a manual workflow.
2. Add the `Google Tag Manager` node.
3. Select `Google Tag Manager OAuth2 API - Read Only`.
4. Run an account, container, or status read.
5. Check the account and container IDs before executing.
6. Confirm that the result contains no token, client secret, or unnecessary full configuration.
7. Retain a redacted result for audit purposes.

Only after this test should you move to Editor.

## Roles and scopes

| Role | Credential | Main scopes | First use |
| --- | --- | --- | --- |
| Read | `Google Tag Manager OAuth2 API - Read Only` | `tagmanager.readonly` | Inventory and audit |
| Editor | `Google Tag Manager OAuth2 API - Editor` | `tagmanager.readonly`, `tagmanager.edit.containers` | Draft/workspace changes |
| Publisher | `Google Tag Manager OAuth2 API - Publisher` | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` | Preview and explicit publication |
| Admin | `Google Tag Manager OAuth2 API - Admin` | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` | Bounded administration |

Use one credential per role. Do not use Admin as a generic credential.

## Adoption order

```text
Read → review state → Editor draft → review diff → Publisher preview/version → explicit publication
```

> ⚠️ **Create Version is not a preview:** it creates a real version, consumes the source workspace in GTM, and returns a replacement workspace. Review fingerprints, IDs, name, and impact before enabling confirmation.
>
> 🔴 **Literal publication confirmation:** set `Confirm Publish = true` and `Publish Confirmation = PUBLICAR {versionId}`. Example: `PUBLICAR 123456`. `PUBLISH 123456` is rejected.

Keep write workflows manual and inactive until the payload has been reviewed. Do not schedule publication or expose Publisher/Admin as generic AI tools.

## What not to do

- Do not install in production first.
- Do not use n8n Cloud.
- Do not use `latest` in production.
- Do not reuse credentials across roles.
- Do not put secrets in workflows, Data Tables, Git, logs, or screenshots.
- Do not publish without reviewing IDs, workspace, version ID, and target.
- Do not assume OAuth grants sufficient GTM access.
- Do not make arbitrary API calls.
- Do not enable environment management without preserving existing packages.
- Do not delete production volumes to solve a community-node installation issue.

## Upgrade and rollback

### UI

1. Back up the instance.
2. Test the new version in staging.
3. Run Read.
4. Open **Settings → Community Nodes**.
5. Use **Options → Uninstall package** to remove the current version.
6. Install the previous pinned version.
7. Run Read again.

### Environment

Restore the previous version in `N8N_COMMUNITY_PACKAGES` and recreate only editor/worker/webhook/runners as required. Do not restart PostgreSQL or Redis for an unrelated package change.

## Sandbox reinstall

The sandbox must be separate from production, use SQLite, a dedicated volume, and a local-only binding. A full sandbox reset is:

```bash
docker compose down --volumes --remove-orphans
docker compose up -d
```

This destroys only disposable sandbox state when run in the correct project directory. Never run it from the production Compose directory.

## Troubleshooting

| Symptom | Likely diagnosis | Next action |
| --- | --- | --- |
| Package does not appear | Instance is not self-hosted or installation is blocked | Check instance type and Community Nodes policy |
| npm `404` | Wrong registry, version, or network | Use `registry.npmjs.org` and `0.5.5` |
| GTM `403` | Account lacks target access | Fix GTM permissions |
| OAuth does not return to n8n | Incorrect redirect URI or consent setup | Use the URI shown by n8n |
| Package disappears after restart | Declarative list does not contain it | Restore the `N8N_COMMUNITY_PACKAGES` entry |
| n8n does not start | Invalid environment/JSON | Restore the previous env and validate Compose |
| Node appears but fails | Invalid IDs, workspace, or payload | Run Read and test in draft |

When collecting support logs, remove tokens, cookies, client secrets, private URLs, sensitive IDs, and customer data.

## References

- [English README](https://github.com/NinjaDataBuilder/n8n-nodes-google-tag-manager/blob/main/docs/README.en.md)
- [Português do Brasil](https://github.com/NinjaDataBuilder/n8n-nodes-google-tag-manager/blob/main/docs/README.pt-BR.md)
- [Architecture and sandbox](architecture.md)
- [Permission contract](permissions-contract.md)
- [n8n GUI installation](https://docs.n8n.io/integrations/community-nodes/installation/gui-install)
- [n8n environment variable installation](https://docs.n8n.io/integrations/community-nodes/installation/environment-variable-installation)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
