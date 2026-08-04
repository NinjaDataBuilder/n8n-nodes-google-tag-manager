# Security policy

## Supported versions

Security fixes target the latest published version and the active development branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Contact the maintainers privately through the security contact configured in the repository or the **NinjaDataBuilder™** maintainers.

Please include:

- affected package version;
- n8n version and installation method;
- a minimal reproduction without credentials or customer data;
- impact and suggested mitigation, if known.

Never send OAuth client secrets, refresh tokens, access tokens, passwords, exported credentials, workflow execution data, or customer identifiers in a report.

## Scope

The package contains role-separated Google Tag Manager nodes. Security reports involving credential handling, arbitrary API dispatch, privilege boundaries, secret leakage, or unsafe publication paths are especially important.
