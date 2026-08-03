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
  buildEditorPayload,
  buildEditorRequest,
  EditorOperation,
  EditorResource,
  GTM_BASE_URL,
} from '../../src/gtmApi';

const CREDENTIAL_NAME = 'googleTagManagerEditorOAuth2Api';

const resourceOptions = [
  { name: 'Workspace', value: 'workspace' },
  { name: 'Tag', value: 'tag' },
  { name: 'Trigger', value: 'trigger' },
  { name: 'Variable', value: 'variable' },
  { name: 'Folder', value: 'folder' },
];

const resourceOperations = [
  { name: 'Create', value: 'create', action: 'Create a GTM draft resource' },
  { name: 'Update', value: 'update', action: 'Update a GTM draft resource' },
];

const nonWorkspaceResources = ['tag', 'trigger', 'variable', 'folder'];
const typedResources = ['tag', 'trigger', 'variable'];

export class GoogleTagManagerEditor implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Google Tag Manager Editor',
    name: 'googleTagManagerEditor',
    group: ['transform'],
    version: 1,
    description: 'Create or update named GTM draft resources through the official API v2',
    icon: 'file:google-tag-manager-v2.svg',
    defaults: { name: 'Google Tag Manager Editor' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: CREDENTIAL_NAME, required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: resourceOptions,
        default: 'workspace',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: resourceOperations,
        default: 'create',
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
        description: 'Numeric GTM container ID',
      },
      {
        displayName: 'Workspace ID',
        name: 'workspaceId',
        type: 'string',
        default: '',
        required: true,
        description: 'Numeric GTM workspace ID to update',
        displayOptions: { show: { resource: ['workspace'], operation: ['update'] } },
      },
      {
        displayName: 'Workspace ID',
        name: 'workspaceId',
        type: 'string',
        default: '',
        required: true,
        description: 'Numeric GTM workspace ID that contains the draft resource',
        displayOptions: { show: { resource: nonWorkspaceResources } },
      },
      {
        displayName: 'Resource ID',
        name: 'resourceId',
        type: 'string',
        default: '',
        required: true,
        description: 'Numeric ID of the tag, trigger, variable, or folder to update',
        displayOptions: { show: { resource: nonWorkspaceResources, operation: ['update'] } },
      },
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        required: true,
        description: 'Display name for the GTM resource',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        description: 'Workspace description',
        displayOptions: { show: { resource: ['workspace'] } },
      },
      {
        displayName: 'Resource Type',
        name: 'resourceType',
        type: 'string',
        default: '',
        required: true,
        description: 'Official GTM type, such as `html`, `customEvent`, or `v`',
        displayOptions: { show: { resource: typedResources } },
      },
      {
        displayName: 'Notes',
        name: 'notes',
        type: 'string',
        default: '',
        description: 'Optional GTM notes for this resource',
        displayOptions: { show: { resource: nonWorkspaceResources } },
      },
      {
        displayName: 'Parent Folder ID',
        name: 'parentFolderId',
        type: 'string',
        default: '',
        description: 'Optional folder ID for a tag, trigger, or variable',
        displayOptions: { show: { resource: typedResources } },
      },
      {
        displayName: 'Advanced Resource Options',
        name: 'advancedOptions',
        type: 'json',
        default: '{}',
        description: 'Optional JSON object with only supported GTM fields for the selected resource. Identity fields, paths, and arbitrary API fields are rejected.',
      },
      {
        displayName: 'Expected Fingerprint',
        name: 'fingerprint',
        type: 'string',
        default: '',
        description: 'Optional fingerprint from a previous GET response. GTM rejects the update if the resource changed since that read.',
        displayOptions: { show: { operation: ['update'] } },
      },
      {
        displayName: 'Confirm Draft Change',
        name: 'confirmDraftChange',
        type: 'boolean',
        default: false,
        required: true,
        description: 'Whether to confirm this creates or updates a draft resource. This node cannot publish a container version.',
      },
    ],
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: Array<{ json: IDataObject }> = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const resource = this.getNodeParameter('resource', itemIndex) as EditorResource;
      const operation = this.getNodeParameter('operation', itemIndex) as EditorOperation;
      const confirmed = this.getNodeParameter('confirmDraftChange', itemIndex, false) as boolean;

      if (!confirmed) {
        throw new NodeOperationError(
          this.getNode(),
          'Set Confirm Draft Change to true before creating or updating a GTM draft resource.',
          { itemIndex },
        );
      }

      const isWorkspaceCreate = resource === 'workspace' && operation === 'create';
      const isWorkspace = resource === 'workspace';
      const isTypedResource = typedResources.includes(resource);
      const isUpdate = operation === 'update';

      const accountId = this.getNodeParameter('accountId', itemIndex) as string;
      const containerId = this.getNodeParameter('containerId', itemIndex) as string;
      const workspaceId = isWorkspaceCreate
        ? undefined
        : this.getNodeParameter('workspaceId', itemIndex) as string;
      const resourceId = !isWorkspace && isUpdate
        ? this.getNodeParameter('resourceId', itemIndex) as string
        : undefined;
      const fingerprint = isUpdate
        ? this.getNodeParameter('fingerprint', itemIndex, '') as string
        : undefined;

      try {
        const payload = buildEditorPayload(resource, {
          name: this.getNodeParameter('name', itemIndex),
          description: isWorkspace ? this.getNodeParameter('description', itemIndex, '') : undefined,
          resourceType: isTypedResource ? this.getNodeParameter('resourceType', itemIndex) : undefined,
          notes: !isWorkspace ? this.getNodeParameter('notes', itemIndex, '') : undefined,
          parentFolderId: isTypedResource ? this.getNodeParameter('parentFolderId', itemIndex, '') : undefined,
          advancedOptions: this.getNodeParameter('advancedOptions', itemIndex, '{}'),
        });
        const request = buildEditorRequest(resource, operation, {
          accountId,
          containerId,
          workspaceId,
          resourceId,
        }, payload);
        const response = await this.helpers.requestOAuth2.call(this, CREDENTIAL_NAME, {
          method: request.method,
          url: `${GTM_BASE_URL}${request.path}`,
          body: request.body,
          qs: fingerprint?.trim() ? { fingerprint: fingerprint.trim() } : undefined,
          json: true,
        });
        const result = asJsonObject(response);
        result.ninjaDataBuilderAudit = {
          role: 'editor',
          resource,
          operation,
          accountId,
          containerId,
          ...(workspaceId ? { workspaceId } : {}),
          ...(resourceId ? { resourceId } : {}),
          confirmed: true,
        };
        returnData.push({ json: result });
      } catch (error) {
        if (error instanceof NodeOperationError || error instanceof NodeApiError) throw error;
        const errorObject: JsonObject = error instanceof Error
          ? { message: error.message, ...(error.stack ? { stack: error.stack } : {}) }
          : { error: String(error) };
        throw new NodeApiError(this.getNode(), errorObject, {
          message: `Google Tag Manager Editor ${operation} ${resource} failed`,
          description: error instanceof Error ? error.message : 'Unknown GTM API error',
        });
      }
    }

    return [returnData];
  }
}
