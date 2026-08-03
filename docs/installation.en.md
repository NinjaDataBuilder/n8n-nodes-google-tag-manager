# Installation and operation — English

This is the detailed reference for installing the package on self-hosted n8n.

## Before installation

- confirm that the instance is self-hosted;
- confirm that you are an Owner/Admin;
- back up the n8n instance;
- choose a pinned package version;
- install in staging first;
- confirm `N8N_COMMUNITY_PACKAGES_ENABLED=true`;
- enable `N8N_UNVERIFIED_PACKAGES_ENABLED=true` only when required by your instance policy for packages that are not yet verified.

## UI installation

Use **Settings → Community Nodes → Install** and enter:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2
```

Accept the risk warning, install the package, and confirm that all four nodes are available. If installation fails, record the n8n error without copying tokens or secret environment variables.

## Environment-managed installation

Add these settings to n8n:

```bash
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES='[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.2"}]'
```

Restart the services. n8n reconciles the package list at startup; packages not in the list may be removed.

## Local tarball installation

To validate a version before publishing to npm:

```bash
npm ci
npm test
npm pack
```

Install the tarball using the community-node mechanism documented for your n8n version. Prefer the UI or environment-managed installation for reproducible deployments.

## Verification

1. Search for `Google Tag Manager` in the editor.
2. Confirm the Read, Editor, Publisher, and Admin nodes.
3. Create the Read credential in the n8n UI.
4. Run an account/container read operation.
5. Confirm that the output is redacted and bounded.
6. Only then create write-capable credentials.

## Credentials

Enter OAuth values only in the n8n credential screen. Use one credential per role. Do not reuse the Admin credential for Publisher or the Publisher credential for Editor.

## Rollback

- UI: uninstall the package and reinstall the previous version.
- Environment-managed: restore the previous version in `N8N_COMMUNITY_PACKAGES` and restart.
- Tarball: restore the previous package and restart the services.
- After rollback, rerun the Read smoke test before enabling write workflows.

## Limitations

The package does not manage GTM users, delete containers, publish automatically, or expose a generic HTTP dispatcher. Admin and Publisher require named, manual workflows with explicit confirmation.

## References

- [n8n documentation — GUI installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation)
- [n8n documentation — environment variable installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/environment-variable-installation)
- [Português do Brasil README](../README.pt-BR.md)
- [English README](../README.en.md)
