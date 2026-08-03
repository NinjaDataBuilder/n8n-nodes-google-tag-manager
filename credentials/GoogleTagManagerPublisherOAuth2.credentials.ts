import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const PUBLISHER_SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.publish',
].join(' ');

/**
 * OAuth credential for the narrow GTM Publisher role.
 *
 * It supports reviewed version lifecycle and explicit publication only.
 * Draft editing, account administration, user management, and destructive
 * permissions remain intentionally excluded.
 */
export class GoogleTagManagerPublisherOAuth2 implements ICredentialType {
  name = 'googleTagManagerPublisherOAuth2Api';
  extends = ['googleOAuth2Api'];
  supportedNodes = ['googleTagManagerPublisher'];
  displayName = 'Google Tag Manager OAuth2 API - Publisher';
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
      default: PUBLISHER_SCOPES,
    },
  ];
}
