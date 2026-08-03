# Architecture

## Scope

This package is the reusable Google Tag Manager module of the NinjaDataBuilder bundle. It is client-neutral and contains no customer identities, account IDs, container IDs, OAuth secrets, refresh tokens, or production data.

## Runtime model

```text
Hermes
  -> n8n MCP
    -> governed n8n workflow
      -> NinjaDataBuilder GTM node
        -> Google Tag Manager API v2
```

The GTM credential authenticates the source resource. A calling workflow may persist outputs using a separate destination credential.

## Permission model

The authoritative role contract is [permissions-contract.md](permissions-contract.md):

```text
Read
  -> inventory and audit only
Editor
  -> named draft workspace create/update operations
Publisher
  -> version creation and explicit publishing
Admin
  -> isolated account/container administration
```

Each role has a separate n8n credential type and least-privilege OAuth scope set. The package never treats a granted OAuth scope as permission to expose every API method.

## Read-only node surface

- list accounts;
- list containers;
- get container;
- list workspaces;
- get workspace;
- list tags;
- list triggers;
- list variables;
- list folders;
- list environments;
- list versions;
- get published version;
- get workspace status.

## Write rollout

1. Read: implemented, installed, and live-validated through the read-only credential.
2. Editor: implemented for create/update workspace, tag, trigger, variable, and folder; controlled live smoke tests have validated workspace and folder creation, unreferenced constant-variable and custom-event-trigger creation, paused no-op Custom HTML tag creation, and a fingerprint-protected variable note update inside a dedicated draft workspace. Every write remains confirmation-gated, scoped to draft resources, and excluded from workflow publication.
3. Publisher: create a version from a reviewed workspace, preview, and publish an explicit version.
4. Admin: create/update containers and account metadata.
5. Design Admin access management and destructive actions only after a dedicated security review.
6. Add release automation, installation documentation, and public distribution only after role-level tests and a secret audit are clean.

## Client neutrality

Customer-specific values belong in encrypted n8n credentials, workflow `Configuration` nodes, and deployment profiles. They do not belong in source code, workflow text fields, examples, package tarballs, or Git history intended for public release.

## Design constraints

- Implement from first principles; benchmark projects inform coverage and behavior only.
- Keep n8n as the execution and governance layer.
- Expose MCP tools only after named workflows are tested.
- Use sub-workflows for reusable inventory and mutation functions.
- Add a `Configuration` Edit Fields node immediately after each user-facing trigger.
