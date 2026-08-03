# Google Tag Manager permissions contract

## Purpose

This document defines the authorization and operational-safety contract for the NinjaDataBuilder Google Tag Manager n8n community node.

It keeps the package client-neutral and separates OAuth consent from the operations that the node and reusable n8n workflows expose. A Google OAuth scope is a technical ceiling, not permission to expose every API method in the product.

## Principles

- Every credential has one named operational role.
- Credentials are created by each n8n user and remain encrypted in n8n. Tokens, client secrets, account IDs, and customer data never enter workflow JSON, source control, releases, or examples.
- A role may use more than one OAuth scope only when the documented operations require it.
- The node exposes an allow-list of operations; it must never offer an arbitrary method/path/payload dispatcher.
- Write operations use named inputs, schema validation, encoded path segments, predictable normalized output, and audit-friendly request metadata with secrets redacted.
- A successful OAuth grant does not override Google Tag Manager account-level or container-level permissions. Google may still return `403` for a user without access.
- Destructive and publication operations are opt-in capabilities, separate from normal editor workflows.

## Role model

### Read

**Intent:** inventory, audit, diagnostics, and approval preparation.

| Item | Contract |
| --- | --- |
| Credential display name | `Google Tag Manager OAuth2 API - Read Only` |
| OAuth scope | `https://www.googleapis.com/auth/tagmanager.readonly` |
| Node surface | Existing list/get/status operations only |
| Permitted effects | None; requests are read-only |
| Forbidden effects | Any create, update, delete, revert, version creation, publish, user-permission, or account mutation |
| Automation | Safe for scheduled inventory and bounded MCP workflows after live validation |

The current package implements this role.

### Editor

**Intent:** create and update draft configuration without publishing it.

| Item | Contract |
| --- | --- |
| Credential display name | `Google Tag Manager OAuth2 API - Editor` |
| OAuth scopes | `tagmanager.readonly`, `tagmanager.edit.containers` |
| Initial node surface | Create/update workspace, tag, trigger, variable, and folder |
| Later editor candidates | Built-in variables, clients, templates, transformations, zones, controlled environment changes |
| Permitted effects | Draft configuration changes inside an explicitly selected workspace |
| Explicit exclusions | Publish, create version, set latest version, delete, revert, bulk update, combine containers, move tag IDs, destination linking, account/user-permission operations |
| Automation | Only through named workflows with an explicit `Configuration` node and an audit record |

`tagmanager.edit.containers` technically permits additional API methods, including container creation. The plugin deliberately does not expose them under Editor.

### Publisher

**Intent:** create a version from a reviewed workspace and publish a specific, explicit version.

| Item | Contract |
| --- | --- |
| Credential display name | `Google Tag Manager OAuth2 API - Publisher` |
| OAuth scopes | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` |
| Initial node surface | Create version from a workspace, inspect version, quick preview, publish a specified version |
| Preconditions | Read inventory completed; workspace status checked; the workspace and version fingerprints match the reviewed values; version ID is explicit; user confirmation captured by the calling workflow |
| Permitted effects | Quick-preview a workspace; create a container version while acknowledging that Google deletes the source workspace and returns a replacement workspace path; publish only the specified version |
| Explicit exclusions | Editing workspace resources, deleting/undeleting versions, setting latest version, account/container/user-permission operations |
| Automation | No scheduled or generic MCP publishing. A named workflow must require an explicit confirmation value and emit a redacted normalized audit result retained by n8n execution history. |

The Publisher credential is not a replacement for Editor. Publishing starts only after an Editor-created draft has been reviewed.

### Admin

**Intent:** limited account and container administration, isolated from ordinary editing and publishing.

Admin is intentionally split into narrowly scoped credential variants. It is a product role, not a reason to request every Google scope by default.

#### Admin — standard

| Item | Contract |
| --- | --- |
| Credential display name | `Google Tag Manager OAuth2 API - Admin` |
| OAuth scopes | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` |
| Initial node surface | Create container, update container, update account metadata |
| Preconditions | Explicit account ID, validated container payload, user confirmation, and an audit record |
| Explicit exclusions | Delete container/workspace, manage users, publish, version lifecycle, arbitrary destination linking |

Creating a container requires `tagmanager.edit.containers` according to the official GTM API. It is classified as Admin in this product because it creates a top-level production asset.

#### Admin — access management (future, opt-in)

| Item | Contract |
| --- | --- |
| OAuth scope | `tagmanager.manage.users` |
| Planned surface | List, create, update, and delete GTM user permissions |
| Guardrails | Separate credential type; never included in standard Admin; no MCP exposure until a dedicated review is complete |

#### Admin — destructive (future, opt-in)

| Item | Contract |
| --- | --- |
| OAuth scope | `tagmanager.delete.containers` |
| Planned surface | Delete a container or workspace only after an explicit, human-approved workflow |
| Guardrails | Separate credential type; exact resource path confirmation; backup/export reference; no batch delete; no scheduled execution; no MCP exposure |

## Scope-to-capability matrix

| Google OAuth scope | Product role | Exposed use |
| --- | --- | --- |
| `tagmanager.readonly` | Read; included as inspection support in other roles | Inventory and pre/post-change checks |
| `tagmanager.edit.containers` | Editor; Admin standard | Draft resource CRUD allow-list; container creation/update only through Admin |
| `tagmanager.edit.containerversions` | Publisher | Create version and controlled preview |
| `tagmanager.publish` | Publisher | Publish one explicit version |
| `tagmanager.manage.accounts` | Admin standard | Account metadata administration |
| `tagmanager.manage.users` | Admin — access management | Deferred, separate opt-in credential |
| `tagmanager.delete.containers` | Admin — destructive | Deferred, separate opt-in credential |

## Implementation boundaries

### Node design

The node will move from a single flat operation list to resource-specific operations:

```text
Resource: Account | Container | Workspace | Tag | Trigger | Variable | Folder | Version
Operation: List | Get | Create | Update | Preview | Create version | Publish
```

Only combinations explicitly listed in this contract will appear in the UI. Node runtime code must read parameters only for the selected operation.

### API client design

The API layer must define typed request builders by role. A write request requires:

1. the expected credential type for its role;
2. validated IDs and payload fields;
3. method and path from an allow-list;
4. pagination or error normalization where applicable;
5. normalized output containing resource identifiers and no OAuth values.

### Workflow and MCP design

- Every user-facing workflow starts with a `Configuration` Edit Fields node immediately after its trigger.
- Configuration stores non-secret IDs, labels, dry-run/confirmation values, and target resource selections only.
- Credentials are bound through n8n's credential store and are never accepted as workflow input.
- MCP is added only after each named workflow has passed a live test with its intended credential and has bounded input/output.
- MCP names actions, not raw API methods: for example, `Create GTM Draft Tag` rather than `executeGtmRequest`.

## Required safeguards by operation class

| Class | Required safeguards |
| --- | --- |
| Read | Pagination, rate-limit-safe behavior, normalized results |
| Editor create/update | Selected workspace ID, validation, before/after result, audit metadata |
| Publisher create version | Workspace status check, explicit version name/notes, audit result |
| Publisher publish | Explicit version ID, confirmation token/value, review workflow, audit result; no schedule/MCP auto-publish |
| Admin standard | Account/container confirmation, validated payload, audit result |
| Admin destructive/access | Separate credential, dedicated workflow, human confirmation, explicit scope review |

## Implementation status

- **Read:** implemented, packaged, installed, and live-validated against the intended GTM account and container inventory.
- **Editor:** implemented in v0.2.0 with a separate OAuth credential, allow-listed create/update operations, confirmation requirement, local tests, and installed metadata. Controlled live smoke tests have validated `Workspace → create`, `Folder → create`, an unreferenced constant `Variable → create`, and an unreferenced custom-event `Trigger → create`, and a paused no-op Custom HTML `Tag → create` in a dedicated draft workspace with no publication. A `Variable → update` using the fingerprint read immediately before the write has also passed controlled live validation; it changed only the audit note while preserving the constant value, type, and folder.
- **Publisher:** the separate OAuth credential and bounded v0.5.1 node are installed and validated on the target n8n instance for the previously approved read/status and lifecycle surface. Package 0.5.1 adds quick-preview compiler/sync validation, rejects missing version IDs and unexpected replacement workspaces, treats empty merge-conflict arrays as healthy, verifies the live version after publication, and emits only redacted normalized output. The GTM API's `containerVersionId` response field remains supported.
- **Admin:** implemented as the bounded Admin role introduced in `v0.5.0` and carried by installed package `v0.5.1`, with a separate OAuth credential. The initial surface is `Account → update`, `Container → create`, and `Container → update`, with explicit confirmation and fingerprint support for updates. The Admin credential instance and controlled live validation remain pending in the n8n UI; access-management and destructive Admin variants remain deferred.

## Rollout order

1. Keep Read live-validated with the existing read-only credential.
2. Keep the Editor credential and create/update operations separated from Read; `Workspace → create`, `Folder → create`, an unreferenced constant `Variable → create`, an unreferenced custom-event `Trigger → create`, a paused no-op Custom HTML `Tag → create`, and a fingerprint-protected `Variable → update` have passed controlled live validation.
3. Keep the Publisher credential and lifecycle operations separated from Editor; controlled version creation and publication have passed live validation.
4. Install and live-validate Admin standard for create/update container and account metadata.
5. Design Admin access management and destructive actions only after a dedicated security review.
6. Add release automation, installation documentation, and public distribution only after role-level tests and a secret audit are clean.

## Official references

- [Tag Manager API authorization](https://developers.google.com/tag-platform/tag-manager/api/v2/authorization)
- [Tag Manager API overview](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [Google APIs Discovery document: Tag Manager API v2](https://www.googleapis.com/discovery/v1/apis/tagmanager/v2/rest)
