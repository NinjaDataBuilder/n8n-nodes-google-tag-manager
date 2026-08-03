import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const READ_ONLY_SCOPE = 'https://www.googleapis.com/auth/tagmanager.readonly';

/**
 * OAuth credential for the read-only GTM surface.
 *
 * Editor and publisher credentials will be separate types and separate scopes.
 */
export class GoogleTagManagerOAuth2 implements ICredentialType {
  name = 'googleTagManagerOAuth2Api';
  extends = ['googleOAuth2Api'];
  displayName = 'Google Tag Manager OAuth2 API - Read Only';
  icon: 'file:google-tag-manager-v2.svg' = 'file:google-tag-manager-v2.svg';
  documentationUrl = 'https://developers.google.com/tag-platform/tag-manager/api/v2/authorization';

  properties: INodeProperties[] = [
    {
      displayName: 'Grant Type',
      name: 'grantType',
      type: 'hidden',
      default: 'authorizationCode',
    },
    {
      displayName: 'Authorization URL',
      name: 'authUrl',
      type: 'hidden',
      default: 'https://accounts.google.com/o/oauth2/v2/auth',
    },
    {
      displayName: 'Access Token URL',
      name: 'accessTokenUrl',
      type: 'hidden',
      default: 'https://oauth2.googleapis.com/token',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'hidden',
      default: 'header',
    },
    {
      displayName: 'Auth URI Query Parameters',
      name: 'authQueryParameters',
      type: 'hidden',
      default: 'access_type=offline&prompt=consent',
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'hidden',
      default: READ_ONLY_SCOPE,
    },
  ];
}
