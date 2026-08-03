# Google Tag Manager Admin — secure design

## Status

**Implemented as the `0.5.3` Admin role and validated in a controlled reference deployment.** The Admin role is separate from Read, Editor, and Publisher and is limited to named account/container administration. Each adopter must review their own target account, container, and authorization before any mutation.

## Purpose

The Admin role provides controlled top-level GTM administration without exposing user-permission management, deletion, versioning, publication, or arbitrary API dispatch.

## Credential boundary

| Item | Contract |
| --- | --- |
| Credential name | `Google Tag Manager OAuth2 API - Admin` |
| Credential type | `googleTagManagerAdminOAuth2Api` |
| OAuth scopes | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` |
| Stored in | n8n encrypted credential store only |
| Separate from | Read, Editor, Publisher, access-management, and destructive credentials |

The Admin node is not exposed as an AI tool. A future MCP integration must invoke a named, reviewed workflow rather than call the node as a generic dispatcher.

## Initial allow-list

```text
Resource: Account
  - Update account metadata (name and explicitly selected shareData flag)

Resource: Container
  - Create container
  - Update container metadata
```

Every mutation requires `Confirm Admin Change = true`. Update operations accept an optional fingerprint query precondition. Account creation is not exposed because the GTM API does not provide an accounts.create method in this surface.

## Payload contract

Container payloads accept only named fields:

```json
{
  "name": "Controlled container",
  "usageContext": ["web"],
  "notes": "Optional notes",
  "domainName": ["example.test"],
  "taggingServerUrls": ["https://sgtm.example.test"]
}
```

The node validates usage contexts and JSON arrays of strings. It does not accept arbitrary JSON, resource paths, HTTP methods, or query parameters.

Account updates accept only `name` and the explicitly enabled `shareData` field. The node rejects an empty account update.

## Explicit exclusions

- `tagmanager.manage.users` and user permissions;
- `tagmanager.delete.containers` and deletion;
- version creation, publication, revert, and set-latest;
- combine containers, move tag IDs, destination linking, and arbitrary API calls;
- AI-tool exposure and scheduled mutation workflows.

## Deployment and live-test gate

1. Build, test, audit, and inspect the compiled Admin metadata locally.
2. Install the pinned public package in the adopter's staging n8n instance with a backup and checksum.
3. Confirm the Admin node and credential appear in that staging catalog without `__CUSTOM_API_CALL__` or generic selectors.
4. Bind the dedicated Admin credential in n8n through the UI.
5. Execute only a read/metadata verification first, then obtain explicit approval before any real container/account mutation.
6. Keep all mutation workflows inactive/manual-only with `callerPolicy=none` after validation.
