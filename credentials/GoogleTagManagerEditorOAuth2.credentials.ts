import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const EDITOR_SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
].join(' ');

/**
 * OAuth credential for named draft workspace mutations only.
 * It intentionally excludes versioning, publishing, account, user-management,
 * and destructive scopes.
 */
export class GoogleTagManagerEditorOAuth2 implements ICredentialType {
  name = 'googleTagManagerEditorOAuth2Api';
  extends = ['googleOAuth2Api'];
  displayName = 'Google Tag Manager OAuth2 API - Editor';
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
      default: EDITOR_SCOPES,
    },
  ];
}
