# Development discovery checklist

This repository is designed for installation in independent n8n environments. Local discovery notes, account names, email addresses, credential labels, workflow names, and infrastructure details must not be committed here.

Before implementing or installing a release:

1. Verify the target n8n application version and supported community-node installation path.
2. Verify the Google Tag Manager API is enabled in the OAuth project's Google Cloud configuration.
3. Confirm the required n8n credential type is created by the operator in the n8n UI; never collect its secret values in source control or chat.
4. Verify the requested Google account has the relevant GTM account/container permissions.
5. Test Read first. Add Editor, Publisher, or Admin only after the matching role-level tests pass.
6. Keep customer-specific workflows, credentials, and runtime identifiers outside this reusable package.

See [permissions-contract.md](permissions-contract.md) for the role and OAuth scope contract.
