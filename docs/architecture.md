# Architecture, environments, sandbox, and rollback

This document explains where the package lives, how it reaches n8n, and which environments must remain separate.

## Distribution path

```text
Public npm package
        │
        ▼
Self-hosted n8n Community Nodes manager
        │
        ▼
Installed package in the n8n nodes directory/volume
        │
        ▼
GTM nodes and role-specific credential types in the n8n editor
        │
        ▼
Google Tag Manager API v2 through OAuth
```

The public runtime package is:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.3
```

The package uses the official public npm registry:

```text
https://registry.npmjs.org
```

## Repository boundaries

| Area | Visibility | Purpose | May contain production data? |
| --- | --- | --- | --- |
| Private engineering repository | Private | Full source, installer work, sandbox, internal plans, tests | No |
| Public runtime repository | Public | Sanitized runtime, public documentation, license, security policy | No |
| npm package | Public | Installable runtime and selected public documentation | No |
| n8n sandbox | Private and disposable | Package-loading, restart, uninstall, reinstall smoke tests | No |
| Staging n8n | Controlled | OAuth and workflow validation with test resources | Only approved test data |
| Production n8n | Protected | Real workflows and customer operations | Yes, therefore unchanged during package development |

The private installer and sandbox are deliberately excluded from the public runtime repository and npm tarball.

## Sandbox topology

The disposable package-loading sandbox uses:

- one pinned n8n image;
- SQLite in a dedicated named volume;
- one dedicated Compose project and network;
- a loopback-only port such as `127.0.0.1:5679`;
- the official npm registry;
- no PostgreSQL, Redis, proxy, public hostname, OAuth, or customer data;
- a pinned package version and optional SHA-512 checksum.

The sandbox is a loading test, not a GTM authorization test. It proves that n8n can fetch, reconcile, install, and load the package. OAuth is tested separately in staging with a test credential.

## Safe sandbox lifecycle

The intended sequence is:

```text
audit → registry preflight → Compose validation → install → readiness → package metadata check
       → restart → uninstall by declared list → readiness → reinstall → verify → cleanup
```

The managed package list is authoritative:

```dotenv
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES=[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.3"}]
```

Changing the list to `[]` and restarting the sandbox removes the package. Restoring the pinned entry and restarting reinstalls it. This behavior must not be tested against a production volume.

A complete disposable reset is:

```bash
docker compose down --volumes --remove-orphans
docker compose up -d
```

Run that command only after verifying the current directory and Compose project. `--volumes` destroys the sandbox SQLite database, n8n state, encryption key, and installed packages.

## Production boundary

The package validation process must not:

- recreate production n8n editor, worker, webhook, or runner containers;
- modify production PostgreSQL or Redis;
- change production Community Nodes settings;
- import real OAuth credentials into the sandbox;
- execute a GTM write operation merely to prove that n8n is healthy;
- remove production volumes or networks;
- copy production `.env` files into a test directory.

A production package update requires a separate change window, backup, pinned image/package versions, staging evidence, and a documented rollback.

## Installation states

Report these states separately:

| State | Meaning |
| --- | --- |
| Registry verified | npm metadata, tarball, version, and checksum are available |
| Compose validated | Configuration parses without starting services |
| Container started | The sandbox process is running; this does not prove package loading |
| n8n ready | `/healthz/readiness` returns HTTP 200 |
| Package installed | The exact package/version exists in the n8n nodes directory and logs confirm reconciliation |
| Package loaded | n8n registers the declared node and credential metadata without startup errors |
| OAuth smoke test | A test Google credential performs a controlled Read operation |
| Production ready | Staging, rollback, documentation, and security review are complete |

Never call a local tarball, a clean Compose render, or an npm page a production deployment.

## Rollback decision tree

```text
Installation fails before n8n starts
  → restore the previous env/config; do not remove volumes

n8n starts but package is absent
  → inspect managed package list, registry, and logs

Package loads but Read fails
  → inspect OAuth, GTM permissions, account/container IDs, and n8n version

Read works but a write is unsafe or unexpected
  → keep write workflows inactive; revert workflow/package configuration

A package release is incompatible
  → reinstall the previous pinned package version; rerun Read
```

Keep n8n application rollback separate from database rollback. Do not restore or delete the database for a package-only failure unless a separate database incident has been proven.

## Current validation boundary

The package-loading sandbox validates the public package and n8n startup path without OAuth. It does not prove that every Google account, GTM permission model, production workflow, or future n8n release will behave identically. Those remain staging and release gates.
