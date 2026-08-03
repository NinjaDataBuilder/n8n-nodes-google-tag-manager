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

- **Read:** implemented and included in the public package. It is intended for inventory, audit, diagnostics, and approval preparation.
- **Editor:** implemented with a separate OAuth credential, allow-listed draft create/update operations, confirmation requirements, and fingerprint-aware updates. Keep changes inside an explicitly selected draft workspace.
- **Publisher:** implemented with a separate OAuth credential and bounded preview/version/publication operations. Require an explicit version ID, reviewed workspace state, confirmation, and redacted audit output. Publication is never scheduled automatically.
- **Admin:** implemented as a separate bounded role for account/container administration. Access-management and destructive variants remain outside the standard Admin credential and require a separate security review.

The public npm package is `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2`. The next documentation-focused patch is being prepared as `0.5.3`; it is not published until the complete release validation is clean.

## Rollout order

1. Start with Read in a disposable or staging instance.
2. Add Editor only for named draft workflows with explicit confirmation.
3. Add Publisher only after a reviewed draft and controlled preview/version test.
4. Add standard Admin only after account/container targets and payloads have been independently reviewed.
5. Keep user-permission and destructive Admin variants deferred until a dedicated security review.
6. Publish a new package version only after tests, pack inspection, secret audit, documentation review, and sandbox reinstall validation are clean.

## Official references

- [Tag Manager API authorization](https://developers.google.com/tag-platform/tag-manager/api/v2/authorization)
- [Tag Manager API overview](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [Google APIs Discovery document: Tag Manager API v2](https://www.googleapis.com/discovery/v1/apis/tagmanager/v2/rest)
