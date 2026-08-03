import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const ADMIN_SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.manage.accounts',
].join(' ');

/**
 * OAuth credential for named GTM account/container administration only.
 * User permissions, deletion, versioning, and publication remain separate roles.
 */
export class GoogleTagManagerAdminOAuth2 implements ICredentialType {
  name = 'googleTagManagerAdminOAuth2Api';
  extends = ['googleOAuth2Api'];
  supportedNodes = ['googleTagManagerAdmin'];
  displayName = 'Google Tag Manager OAuth2 API - Admin';
  icon: 'file:google-tag-manager-v2.svg' = 'file:google-tag-manager-v2.svg';
  documentationUrl = 'https://developers.google.com/tag-platform/tag-manager/api/v2/authorization';

  properties: INodeProperties[] = [
    { displayName: 'Grant Type', name: 'grantType', type: 'hidden', default: 'authorizationCode' },
    { displayName: 'Authorization URL', name: 'authUrl', type: 'hidden', default: 'https://accounts.google.com/o/oauth2/v2/auth' },
    { displayName: 'Access Token URL', name: 'accessTokenUrl', type: 'hidden', default: 'https://oauth2.googleapis.com/token' },
    { displayName: 'Authentication', name: 'authentication', type: 'hidden', default: 'header' },
    { displayName: 'Auth URI Query Parameters', name: 'authQueryParameters', type: 'hidden', default: 'access_type=offline&prompt=consent' },
    { displayName: 'Scope', name: 'scope', type: 'hidden', default: ADMIN_SCOPES },
  ];
}
