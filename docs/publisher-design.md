# Google Tag Manager Publisher — secure design

## Status

**Implemented in the public package `0.5.5`.** The separate Publisher credential and bounded Publisher node are designed for controlled staging validation by each adopter. The implementation validates quick-preview compiler/sync status before Create Version, verifies returned version and replacement workspace identifiers, verifies the published live version, and returns redacted normalized summaries rather than complete unpublished GTM configuration. The GTM API's `containerVersionId` response field is accepted alongside `versionId`. Do not treat package installation as proof that a particular n8n instance or GTM account has been live-validated.

## Purpose

The Publisher role creates a named GTM container version from a reviewed workspace and publishes one explicitly selected version. It is separate from Read, Editor, and Admin because version creation has a lifecycle effect and publication changes live production behavior.

## Official Google API facts

| Action | Method | Minimum Google OAuth scope | Important effect |
| --- | --- | --- | --- |
| Inspect workspace status | `workspaces.getStatus` | `tagmanager.readonly` | Read-only conflict and status inspection. |
| Quick preview | `workspaces.quick_preview` | `tagmanager.edit.containerversions` | Creates a fake version for review; it does not publish. |
| Create version | `workspaces.create_version` | `tagmanager.edit.containerversions` | Creates a real container version, deletes the source workspace, and returns a newly generated workspace path. |
| Inspect a version | `versions.get` | `tagmanager.readonly` | Read-only validation of the exact proposed version. |
| Publish a version | `versions.publish` | `tagmanager.publish` | Makes the selected version live. A `fingerprint` may be supplied by the API and is mandatory in this product contract. |

The exact API paths are allow-listed:

```text
POST /accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:quick_preview
POST /accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:create_version
GET  /accounts/{accountId}/containers/{containerId}/versions/{versionId}
POST /accounts/{accountId}/containers/{containerId}/versions/{versionId}:publish?fingerprint={fingerprint}
```

`create_version` accepts only a named version payload:

```json
{
  "name": "Reviewed release name",
  "notes": "Human-readable release notes"
}
```

## Credential boundary

| Item | Contract |
| --- | --- |
| Credential name | `Google Tag Manager OAuth2 API - Publisher` |
| Credential type | `googleTagManagerPublisherOAuth2Api` |
| OAuth scopes | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` |
| Stored in | n8n encrypted credential store only |
| Explicit exclusions | `tagmanager.edit.containers`, deletion, user permissions, account administration, arbitrary HTTP methods |
| Credential setup | Human OAuth consent in the n8n UI after the package is deployed and validated locally |

The Publisher credential is not accepted in any Editor node, and the Editor credential cannot be selected in the Publisher node.

## Narrow initial node surface

A separate `Google Tag Manager Publisher` node may expose only:

```text
Resource: Workspace
  - Get status
  - Quick preview
  - Create version

Resource: Version
  - Get
  - Publish
```

It must not expose delete, undelete, set-latest, revert, bulk operations, workspace resource edits, account/container administration, generic request paths, or arbitrary payload JSON.

The node is not exposed as an AI tool. A future MCP integration must invoke named, reviewed workflows only and must never provide generic publication capability.

## Controlled workflow contract

Publishing is a multi-stage human process, not an automatic chain.

### 1. Review workspace

`sub: gtm-review-workspace`

```text
Manual Trigger
  → Configuration
  → Read workspace status
  → Quick preview
  → Return normalized review result
```

Required outputs include workspace identity, conflict/sync status, preview compiler status, and redacted preview version metadata. A conflict, sync failure, or compiler error blocks all later stages; complete tags, triggers, variables, and other unpublished configuration are never returned by the node.

### 2. Create version (consumes draft workspace)

`sub: gtm-create-version`

```text
Manual Trigger
  → Configuration
  → Re-read workspace status
  → Confirm exact workspace and version name
  → Create version
  → Verify created version
  → Record redacted normalized audit result
```

`Configuration` must include:

```text
accountId
containerId
workspaceId
expectedWorkspaceFingerprint
versionName
versionNotes
confirmCreateVersion = false by default
```

Creation is allowed only when all conditions hold:

- `confirmCreateVersion` is explicitly true;
- the current workspace fingerprint matches the reviewed fingerprint;
- workspace status has no blocking conflict/sync condition;
- the version name is non-empty and unique for the intended release process;
- the caller acknowledges that the source workspace will be deleted and replaced by the API-generated workspace path.

If the API returns `compilerError: true`, a blocking `syncStatus`, a missing version ID, or an unexpected replacement workspace path, the workflow stops and reports the redacted result. It never publishes automatically.

### 3. Publish one exact version

`sub: gtm-publish-version`

```text
Manual Trigger
  → Configuration
  → Get the explicit version
  → Check exact version fingerprint
  → Require publish confirmation
  → Publish
  → Re-read live version
  → Record redacted normalized audit result
```

`Configuration` must include:

```text
accountId
containerId
versionId
expectedVersionFingerprint
confirmPublish = false by default
publishConfirmation = empty by default
```

Publication is allowed only when all conditions hold:

- `confirmPublish` is explicitly true;
- `publishConfirmation` exactly equals `PUBLICAR {versionId}`;
- the requested version ID and current fingerprint equal the reviewed values;
- the version has no compiler error and belongs to the explicitly selected container;
- the workflow is manual, unscheduled, and not callable through generic MCP/AI tooling.

After the API returns success, the workflow reads the container's live version through the live-version endpoint and requires either `versionId` or the GTM API's `containerVersionId` to equal the requested version ID. A mismatch is a failed verification and is reported as such.

## Audit and recovery

Every create-version and publish action must emit a redacted normalized execution record retained by n8n execution history containing at least:

```text
operation
requestedAt
accountId
containerId
workspaceId or versionId
expectedFingerprint
returnedFingerprint
result status
newWorkspacePath (for version creation)
liveVersionId before and after (for publishing)
execution ID
```

OAuth tokens, client IDs, client secrets, HTTP authorization headers, and complete unpublished GTM payloads must never be written to workflow fields, logs, Data Tables, source control, package tarballs, or chat. The node deliberately returns only identifiers, status summaries, fingerprints, and named metadata fields.

Publication is not automatically reversible. The Publisher role deliberately does not include revert or set-latest. If a recovery publication is required, it must be a new manually approved execution against an explicitly chosen prior version, with its own exact confirmation and audit record.

## Implementation gates

Before implementation:

1. Add local pure request/payload tests for all allow-listed operations and all blocked operations.
2. Add a separate Publisher credential type with only the three documented scopes.
3. Add a separate Publisher node with no Editor operations and no AI-tool exposure.
4. Pass build, tests, package-content audit, and n8n metadata loading checks.
5. Deploy the package without workflows, then create the OAuth credential in the n8n UI.
6. Live-test `getStatus` and `quick_preview` only.
7. Conduct one controlled `create_version` smoke test in a dedicated non-production workspace after explicit approval.
8. Design and approve the publication smoke test separately; no real container version is published as part of credential installation or node deployment.

## Official references

- [Tag Manager API authorization](https://developers.google.com/tag-platform/tag-manager/api/v2/authorization)
- [Tag Manager API overview](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [Google APIs Discovery Document: Tag Manager API v2](https://www.googleapis.com/discovery/v1/apis/tagmanager/v2/rest)
