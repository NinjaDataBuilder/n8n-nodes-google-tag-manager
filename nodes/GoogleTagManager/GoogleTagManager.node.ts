import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
  IDataObject,
  JsonObject,
} from 'n8n-workflow';
import { asJsonObject, buildReadRequest, GTM_BASE_URL, ReadOperation } from '../../src/gtmApi';

const CREDENTIAL_NAME = 'googleTagManagerOAuth2Api';

const operationOptions = [
  { name: 'List Accounts', value: 'accountsList', action: 'List accessible GTM accounts' },
  { name: 'List Containers', value: 'containersList', action: 'List containers in an account' },
  { name: 'Get Container', value: 'containersGet', action: 'Get a container' },
  { name: 'List Workspaces', value: 'workspacesList', action: 'List workspaces in a container' },
  { name: 'Get Workspace', value: 'workspacesGet', action: 'Get a workspace' },
  { name: 'Get Workspace Status', value: 'workspacesGetStatus', action: 'Get workspace status' },
  { name: 'List Tags', value: 'tagsList', action: 'List tags in a workspace' },
  { name: 'List Triggers', value: 'triggersList', action: 'List triggers in a workspace' },
  { name: 'List Variables', value: 'variablesList', action: 'List variables in a workspace' },
  { name: 'List Folders', value: 'foldersList', action: 'List folders in a workspace' },
  { name: 'List Environments', value: 'environmentsList', action: 'List container environments' },
  { name: 'Get Live Version', value: 'versionsLive', action: 'Get the published container version' },
  { name: 'Get Version', value: 'versionsGet', action: 'Get a container version' },
] as const;

export class GoogleTagManager implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Google Tag Manager',
    name: 'googleTagManager',
    group: ['transform'],
    version: 1,
    description: 'Read Google Tag Manager inventory through the official API v2',
    icon: 'file:google-tag-manager-v2.svg',
    defaults: { name: 'Google Tag Manager' },
    inputs: ['main'],
    outputs: ['main'],
    usableAsTool: true,
    credentials: [{ name: CREDENTIAL_NAME, required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: operationOptions.map(({ name, value, action }) => ({ name, value, action })),
        default: 'accountsList',
      },
      {
        displayName: 'Account ID',
        name: 'accountId',
        type: 'string',
        default: '',
        description: 'Numeric GTM account ID',
        displayOptions: { hide: { operation: ['accountsList'] } },
      },
      {
        displayName: 'Container ID',
        name: 'containerId',
        type: 'string',
        default: '',
        description: 'Numeric GTM container ID',
        displayOptions: {
          show: {
            operation: [
              'containersList',
              'containersGet',
              'workspacesList',
              'workspacesGet',
              'workspacesGetStatus',
              'tagsList',
              'triggersList',
              'variablesList',
              'foldersList',
              'environmentsList',
              'versionsLive',
              'versionsGet',
            ],
          },
        },
      },
      {
        displayName: 'Workspace ID',
        name: 'workspaceId',
        type: 'string',
        default: '',
        description: 'Numeric GTM workspace ID',
        displayOptions: {
          show: {
            operation: ['workspacesGet', 'workspacesGetStatus', 'tagsList', 'triggersList', 'variablesList', 'foldersList'],
          },
        },
      },
      {
        displayName: 'Version ID',
        name: 'versionId',
        type: 'string',
        default: '',
        description: 'Numeric GTM container version ID',
        displayOptions: { show: { operation: ['versionsGet'] } },
      },
      {
        displayName: 'Fetch All Pages',
        name: 'fetchAll',
        type: 'boolean',
        default: true,
        description: 'Whether to follow GTM pagination until all pages are returned',
      },
      {
        displayName: 'Page Size',
        name: 'pageSize',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1, maxValue: 200 },
        description: 'Number of records requested per page',
      },
    ],
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: Array<{ json: IDataObject }> = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const operation = this.getNodeParameter('operation', itemIndex) as ReadOperation;
      const pathParams = {
        accountId: this.getNodeParameter('accountId', itemIndex, '') as string,
        containerId: this.getNodeParameter('containerId', itemIndex, '') as string,
        workspaceId: this.getNodeParameter('workspaceId', itemIndex, '') as string,
        versionId: this.getNodeParameter('versionId', itemIndex, '') as string,
      };
      const fetchAll = this.getNodeParameter('fetchAll', itemIndex, true) as boolean;
      const pageSize = this.getNodeParameter('pageSize', itemIndex, 100) as number;

      try {
        const request = buildReadRequest(operation, pathParams);
        const pages: IDataObject[] = [];
        let pageToken: string | undefined;

        do {
          const response = await this.helpers.requestOAuth2.call(this, CREDENTIAL_NAME, {
            method: request.method,
            url: `${GTM_BASE_URL}${request.path}`,
            qs: {
              pageSize,
              ...(pageToken ? { pageToken } : {}),
            },
            json: true,
          });
          const page = asJsonObject(response);
          pages.push(page);
          pageToken = fetchAll && typeof page.nextPageToken === 'string' ? page.nextPageToken : undefined;
        } while (pageToken);

        const result = pages.length === 1 ? pages[0] : mergePages(pages);
        returnData.push({ json: result });
      } catch (error) {
        if (error instanceof NodeOperationError || error instanceof NodeApiError) throw error;
        const errorObject: JsonObject = error instanceof Error
          ? { message: error.message, ...(error.stack ? { stack: error.stack } : {}) }
          : { error: String(error) };
        throw new NodeApiError(this.getNode(), errorObject, {
          message: `Google Tag Manager ${operation} failed`,
          description: error instanceof Error ? error.message : 'Unknown GTM API error',
        });
      }
    }

    return [returnData];
  }
}

function mergePages(pages: IDataObject[]): IDataObject {
  const merged: IDataObject = {};
  for (const page of pages) {
    for (const [key, value] of Object.entries(page)) {
      if (key === 'nextPageToken') continue;
      if (Array.isArray(value)) {
        const existing = Array.isArray(merged[key]) ? (merged[key] as unknown[]) : [];
        merged[key] = [...existing, ...value] as unknown as IDataObject[keyof IDataObject];
      } else if (merged[key] === undefined) {
        merged[key] = value;
      }
    }
  }
  return merged;
}
