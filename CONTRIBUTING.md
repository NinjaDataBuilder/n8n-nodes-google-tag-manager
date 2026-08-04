# Contributing

Thank you for helping improve the **NinjaDataBuilder™** Google Tag Manager nodes.

## Before opening a pull request

1. Read the permission contract and the role-specific design documents.
2. Keep the package client-neutral.
3. Do not commit OAuth values, customer identifiers, account/container IDs, workflow exports, execution data, or production payloads.
4. Keep Read, Editor, Publisher, and Admin credentials and operations separated.
5. Add or update tests for routing, validation, confirmation guards, and output redaction.

## Local checks

```bash
npm ci
npm test
npm audit --omit=dev
npm pack --dry-run
git diff --check
```

## Pull requests

Describe:

- the problem and the role affected;
- the security and permission impact;
- the tests run;
- any n8n version assumptions;
- rollback or compatibility considerations.

Do not include live credentials or customer data in issues, pull requests, fixtures, screenshots, or logs.
