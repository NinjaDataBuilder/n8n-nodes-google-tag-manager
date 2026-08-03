import {
  IDataObject,
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  JsonObject,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';
import {
  asJsonObject,
  AdminOperation,
  AdminResource,
  buildAdminPayload,
  buildAdminRequest,
  GTM_BASE_URL,
} from '../../src/gtmApi';

const CREDENTIAL_NAME = 'googleTagManagerAdminOAuth2Api';

const resources = [
  { name: 'Account', value: 'account' },
  { name: 'Container', value: 'container' },
];

const operations = [
  { name: 'Create', value: 'create', action: 'Create a GTM container' },
  { name: 'Update', value: 'update', action: 'Update a GTM account or container' },
];

const containerResources = { adminResource: ['container'] };
const accountUpdate = { adminResource: ['account'], adminOperation: ['update'] };
const containerCreate = { adminResource: ['container'], adminOperation: ['create'] };
const containerChange = { adminResource: ['container'], adminOperation: ['create', 'update'] };
const containerUpdate = { adminResource: ['container'], adminOperation: ['update'] };

export class GoogleTagManagerAdmin implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Google Tag Manager Admin',
    name: 'googleTagManagerAdmin',
    group: ['transform'],
    version: 1,
    description: 'Create guarded containers and update named GTM account or container metadata through the official API v2',
    icon: 'file:google-tag-manager-v2.svg',
    defaults: { name: 'Google Tag Manager Admin' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: CREDENTIAL_NAME, required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'adminResource',
        type: 'options',
        noDataExpression: true,
        options: resources,
        default: 'container',
      },
      {
        displayName: 'Operation',
        name: 'adminOperation',
        type: 'options',
        noDataExpression: true,
        options: operations,
        default: 'create',
        description: 'Account supports Update only. Container supports Create and Update.',
      },
      {
        displayName: 'Account ID',
        name: 'accountId',
        type: 'string',
        default: '',
        required: true,
        description: 'Numeric GTM account ID',
      },
      {
        displayName: 'Container ID',
        name: 'containerId',
        type: 'string',
        default: '',
        required: true,
        description: 'Numeric GTM container ID to update',
        displayOptions: { show: containerUpdate },
      },
      {
        displayName: 'Account Name',
        name: 'accountName',
        type: 'string',
        default: '',
        description: 'Optional replacement display name for the GTM account',
        displayOptions: { show: accountUpdate },
      },
      {
        displayName: 'Update Share Data',
        name: 'updateShareData',
        type: 'boolean',
        default: false,
        description: 'Enable this only when intentionally changing the account data-sharing preference',
        displayOptions: { show: accountUpdate },
      },
      {
        displayName: 'Share Data',
        name: 'shareData',
        type: 'boolean',
        default: false,
        description: 'Whether the account shares data anonymously with Google and others',
        displayOptions: { show: accountUpdate },
      },
      {
        displayName: 'Container Name',
        name: 'containerName',
        type: 'string',
        default: '',
        description: 'Display name for the GTM container',
        displayOptions: { show: containerResources },
      },
      {
        displayName: 'Usage Context',
        name: 'usageContext',
        type: 'string',
        default: 'web',
        description: 'Comma-separated GTM contexts, for example `web` or `web,server`',
        displayOptions: { show: containerChange },
      },
      {
        displayName: 'Container Notes',
        name: 'containerNotes',
        type: 'string',
        default: '',
        description: 'Optional container notes',
        displayOptions: { show: containerChange },
      },
      {
        displayName: 'Domain Names',
        name: 'domainNames',
        type: 'json',
        default: '[]',
        description: 'Optional JSON array of domains associated with the container',
        displayOptions: { show: containerChange },
      },
      {
        displayName: 'Tagging Server URLs',
        name: 'taggingServerUrls',
        type: 'json',
        default: '[]',
        description: 'Optional JSON array of server-side container URLs',
        displayOptions: { show: containerChange },
      },
      {
        displayName: 'Expected Fingerprint',
        name: 'fingerprint',
        type: 'string',
        default: '',
        description: 'Optional fingerprint from a previous GET response; GTM rejects stale updates',
        displayOptions: { show: { adminOperation: ['update'] } },
      },
      {
        displayName: 'Confirm Admin Change',
        name: 'confirmAdminChange',
        type: 'boolean',
        default: false,
        required: true,
        description: 'Required confirmation for every account or container mutation. This node cannot manage users or delete containers.',
      },
    ],
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: Array<{ json: IDataObject }> = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const resource = this.getNodeParameter('adminResource', itemIndex) as AdminResource;
      const operation = this.getNodeParameter('adminOperation', itemIndex) as AdminOperation;
      const confirmed = this.getNodeParameter('confirmAdminChange', itemIndex, false) as boolean;

      if (!confirmed) {
        throw new NodeOperationError(this.getNode(), 'Set Confirm Admin Change to true before changing a GTM account or container.', { itemIndex });
      }
      if (resource === 'account' && operation !== 'update') {
        throw new NodeOperationError(this.getNode(), 'Account administration supports Update only; container creation is a separate operation.', { itemIndex });
      }

      const accountId = this.getNodeParameter('accountId', itemIndex) as string;
      const containerId = operation === 'update' && resource === 'container'
        ? this.getNodeParameter('containerId', itemIndex) as string
        : undefined;
      const fingerprint = operation === 'update'
        ? this.getNodeParameter('fingerprint', itemIndex, '') as string
        : undefined;

      try {
        const payload = buildAdminPayload(resource, {
          accountName: resource === 'account' ? this.getNodeParameter('accountName', itemIndex, '') : undefined,
          updateShareData: resource === 'account' ? this.getNodeParameter('updateShareData', itemIndex, false) : undefined,
          shareData: resource === 'account' ? this.getNodeParameter('shareData', itemIndex, false) : undefined,
          containerName: resource === 'container' ? this.getNodeParameter('containerName', itemIndex, '') : undefined,
          usageContext: resource === 'container' ? this.getNodeParameter('usageContext', itemIndex, 'web') : undefined,
          containerNotes: resource === 'container' ? this.getNodeParameter('containerNotes', itemIndex, '') : undefined,
          domainNames: resource === 'container' ? this.getNodeParameter('domainNames', itemIndex, '[]') : undefined,
          taggingServerUrls: resource === 'container' ? this.getNodeParameter('taggingServerUrls', itemIndex, '[]') : undefined,
        });
        const request = buildAdminRequest(resource, operation, { accountId, containerId, fingerprint }, payload);
        const response = await this.helpers.requestOAuth2.call(this, CREDENTIAL_NAME, {
          method: request.method,
          url: `${GTM_BASE_URL}${request.path}`,
          body: request.body,
          qs: request.query,
          json: true,
        });
        const result = asJsonObject(response);
        result.ninjaDataBuilderAudit = {
          role: 'admin',
          resource,
          operation,
          accountId,
          ...(containerId ? { containerId } : {}),
          confirmed: true,
        };
        returnData.push({ json: result });
      } catch (error) {
        if (error instanceof NodeOperationError || error instanceof NodeApiError) throw error;
        const errorObject: JsonObject = error instanceof Error
          ? { message: error.message, ...(error.stack ? { stack: error.stack } : {}) }
          : { error: String(error) };
        throw new NodeApiError(this.getNode(), errorObject, {
          message: `Google Tag Manager Admin ${operation} ${resource} failed`,
          description: error instanceof Error ? error.message : 'Unknown GTM API error',
        });
      }
    }

    return [returnData];
  }
}
