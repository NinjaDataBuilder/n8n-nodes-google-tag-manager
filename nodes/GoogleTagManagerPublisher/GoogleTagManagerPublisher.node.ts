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
  buildPublisherRequest,
  buildReadRequest,
  GTM_BASE_URL,
  hasPublisherBlockingStatus,
  PublisherOperation,
  PublisherResource,
  requirePublisherCreateVersionConfirmation,
  requirePublisherPreviewConfirmation,
  requirePublisherPublishConfirmation,
} from '../../src/gtmApi';

const CREDENTIAL_NAME = 'googleTagManagerPublisherOAuth2Api';

const workspaceOperations = [
  { name: 'Get Status', value: 'getStatus', action: 'Get workspace conflict and sync status' },
  { name: 'Quick Preview', value: 'quickPreview', action: 'Generate a non-published GTM workspace quick preview' },
  { name: 'Create Version', value: 'createVersion', action: 'Create a version and consume the source workspace after explicit confirmation' },
];

const versionOperations = [
  { name: 'Get', value: 'get', action: 'Get a specific GTM container version' },
  { name: 'Publish', value: 'publish', action: 'Publish one explicitly selected GTM container version after fingerprint validation' },
];

export function getContainerVersionId(version: IDataObject): string {
  return String(version.versionId ?? version.containerVersionId ?? '');
}

type PublisherOutputContext = {
  accountId: string;
  containerId: string;
  workspaceId?: string;
  versionId?: string;
  expectedWorkspaceFingerprint?: string;
  expectedVersionFingerprint?: string;
  newWorkspacePath?: string;
  liveVersion?: IDataObject;
  requestedAt: string;
  executionId?: string;
};

function summarizeContainerVersion(value: unknown): IDataObject | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const version = asJsonObject(value);
  const summary: IDataObject = {};
  const id = getContainerVersionId(version);
  if (id) summary.containerVersionId = id;
  for (const key of ['accountId', 'containerId', 'workspaceId', 'name', 'description', 'fingerprint', 'path']) {
    if (typeof version[key] === 'string' && version[key]) summary[key] = version[key];
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function summarizeSyncStatus(value: unknown): IDataObject {
  if (Array.isArray(value)) return { present: value.length > 0, issueCount: value.length };
  if (value === undefined || value === null || value === '') return { present: false, blocking: false };
  return { present: true, blocking: hasPublisherBlockingStatus(value) };
}

export function normalizePublisherResult(
  resource: PublisherResource,
  operation: PublisherOperation,
  response: unknown,
  context: PublisherOutputContext,
): IDataObject {
  const source = asJsonObject(response);
  const result: IDataObject = { role: 'publisher', resource, operation };

  if (resource === 'workspace' && operation === 'getStatus') {
    const conflicts = source.mergeConflict;
    result.status = {
      hasWorkspaceChange: source.workspaceChange !== undefined,
      mergeConflictCount: Array.isArray(conflicts) ? conflicts.length : conflicts ? 1 : 0,
      syncStatus: summarizeSyncStatus(source.syncStatus),
    };
  } else if (resource === 'workspace' && operation === 'quickPreview') {
    result.preview = {
      compilerError: source.compilerError === true,
      syncStatus: summarizeSyncStatus(source.syncStatus),
      containerVersion: summarizeContainerVersion(source.containerVersion),
    };
  } else if (resource === 'workspace' && operation === 'createVersion') {
    result.createdVersion = {
      compilerError: source.compilerError === true,
      syncStatus: summarizeSyncStatus(source.syncStatus),
      containerVersion: summarizeContainerVersion(source.containerVersion),
      newWorkspacePath: context.newWorkspacePath,
    };
  } else if (resource === 'version' && operation === 'get') {
    result.version = summarizeContainerVersion(source);
  } else if (resource === 'version' && operation === 'publish') {
    result.publication = {
      compilerError: source.compilerError === true,
      returnedFingerprint: typeof source.fingerprint === 'string' ? source.fingerprint : undefined,
      liveVersion: summarizeContainerVersion(context.liveVersion),
    };
  }

  result.audit = {
    requestedAt: context.requestedAt,
    ...(context.executionId ? { executionId: context.executionId } : {}),
    accountId: context.accountId,
    containerId: context.containerId,
    ...(context.workspaceId ? { workspaceId: context.workspaceId } : {}),
    ...(context.versionId ? { versionId: context.versionId } : {}),
    ...(context.expectedWorkspaceFingerprint ? { expectedWorkspaceFingerprint: context.expectedWorkspaceFingerprint } : {}),
    ...(context.expectedVersionFingerprint ? { expectedVersionFingerprint: context.expectedVersionFingerprint } : {}),
    ...(context.newWorkspacePath ? { newWorkspacePath: context.newWorkspacePath } : {}),
    ...(context.liveVersion ? { liveVersionId: getContainerVersionId(context.liveVersion) } : {}),
    status: 'success',
    confirmed: ['quickPreview', 'createVersion', 'publish'].includes(operation),
  };
  return result;
}

export class GoogleTagManagerPublisher implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Google Tag Manager Publisher',
    name: 'googleTagManagerPublisher',
    group: ['transform'],
    version: 1,
    description: 'Review GTM workspace and version state, create guarded versions, and publish explicitly selected versions through the official API v2',
    icon: 'file:google-tag-manager-v2.svg',
    defaults: { name: 'Google Tag Manager Publisher' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: CREDENTIAL_NAME, required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'publisherResource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Workspace', value: 'workspace' },
          { name: 'Version', value: 'version' },
        ],
        default: 'workspace',
      },
      {
        displayName: 'Operation',
        name: 'publisherOperation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { publisherResource: ['workspace'] } },
        options: workspaceOperations,
        default: 'getStatus',
      },
      {
        displayName: 'Operation',
        name: 'publisherOperation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { publisherResource: ['version'] } },
        options: versionOperations,
        default: 'get',
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
        description: 'Numeric GTM workspace ID to inspect or quick preview',
        displayOptions: { show: { publisherResource: ['workspace'] } },
      },
      {
        displayName: 'Version ID',
        name: 'versionId',
        type: 'string',
        default: '',
        required: true,
        description: 'Numeric GTM container version ID to inspect',
        displayOptions: { show: { publisherResource: ['version'] } },
      },
      {
        displayName: 'Confirm Quick Preview',
        name: 'confirmQuickPreview',
        type: 'boolean',
        default: false,
        required: true,
        description: 'Whether to generate a fake version for review. This does not publish, create a real version, or delete the workspace.',
        displayOptions: { show: { publisherResource: ['workspace'], publisherOperation: ['quickPreview'] } },
      },
      {
        displayName: 'Confirm Create Version',
        name: 'confirmCreateVersion',
        type: 'boolean',
        default: false,
        required: true,
        description: 'Allow a real GTM version creation only after the source workspace has been reviewed.',
        displayOptions: { show: { publisherResource: ['workspace'], publisherOperation: ['createVersion'] } },
      },
      {
        displayName: 'Acknowledge Workspace Consumption',
        name: 'acknowledgeWorkspaceConsumption',
        type: 'boolean',
        default: false,
        required: true,
        description: 'Acknowledge that GTM consumes the source workspace and returns a replacement workspace path.',
        displayOptions: { show: { publisherResource: ['workspace'], publisherOperation: ['createVersion'] } },
      },
      {
        displayName: 'Expected Workspace Fingerprint',
        name: 'expectedWorkspaceFingerprint',
        type: 'string',
        default: '',
        required: true,
        description: 'Fingerprint captured during review; creation stops if the current workspace differs.',
        displayOptions: { show: { publisherResource: ['workspace'], publisherOperation: ['createVersion'] } },
      },
      {
        displayName: 'Version Name',
        name: 'versionName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { publisherResource: ['workspace'], publisherOperation: ['createVersion'] } },
      },
      {
        displayName: 'Version Notes',
        name: 'versionNotes',
        type: 'string',
        default: '',
        displayOptions: { show: { publisherResource: ['workspace'], publisherOperation: ['createVersion'] } },
      },
      {
        displayName: 'Expected Version Fingerprint',
        name: 'expectedVersionFingerprint',
        type: 'string',
        default: '',
        required: true,
        description: 'Fingerprint captured during review; publishing stops if the current version differs.',
        displayOptions: { show: { publisherResource: ['version'], publisherOperation: ['publish'] } },
      },
      {
        displayName: 'Confirm Publish',
        name: 'confirmPublish',
        type: 'boolean',
        default: false,
        required: true,
        displayOptions: { show: { publisherResource: ['version'], publisherOperation: ['publish'] } },
      },
      {
        displayName: 'Publish Confirmation',
        name: 'publishConfirmation',
        type: 'string',
        default: '',
        required: true,
        description: 'Enter exactly PUBLICAR followed by the selected version ID.',
        displayOptions: { show: { publisherResource: ['version'], publisherOperation: ['publish'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: Array<{ json: IDataObject }> = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const resource = this.getNodeParameter('publisherResource', itemIndex) as PublisherResource;
      const operation = this.getNodeParameter('publisherOperation', itemIndex) as PublisherOperation;
      const isWorkspace = resource === 'workspace';
      const isQuickPreview = resource === 'workspace' && operation === 'quickPreview';
      const isCreateVersion = resource === 'workspace' && operation === 'createVersion';
      const isPublish = resource === 'version' && operation === 'publish';

      const accountId = this.getNodeParameter('accountId', itemIndex) as string;
      const containerId = this.getNodeParameter('containerId', itemIndex) as string;
      const workspaceId = isWorkspace
        ? this.getNodeParameter('workspaceId', itemIndex) as string
        : undefined;
      const versionId = resource === 'version'
        ? this.getNodeParameter('versionId', itemIndex) as string
        : undefined;

      try {
        if (isQuickPreview) {
          requirePublisherPreviewConfirmation(
            operation,
            this.getNodeParameter('confirmQuickPreview', itemIndex, false) as boolean,
          );
        }
        if (isCreateVersion) {
          requirePublisherCreateVersionConfirmation(
            this.getNodeParameter('confirmCreateVersion', itemIndex, false) as boolean,
            this.getNodeParameter('acknowledgeWorkspaceConsumption', itemIndex, false) as boolean,
          );
        }
        if (isPublish) {
          requirePublisherPublishConfirmation(
            versionId ?? '',
            this.getNodeParameter('confirmPublish', itemIndex, false) as boolean,
            this.getNodeParameter('publishConfirmation', itemIndex, '') as string,
          );
        }
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          error instanceof Error ? error.message : 'Publisher confirmation is required.',
          { itemIndex },
        );
      }

      const requestGtm = async (request: ReturnType<typeof buildPublisherRequest>) => this.helpers.requestOAuth2.call(this, CREDENTIAL_NAME, {
        method: request.method,
        url: `${GTM_BASE_URL}${request.path}`,
        json: true,
        ...(request.body ? { body: request.body } : {}),
      });

      try {
        let response: unknown;
        const outputContext: PublisherOutputContext = {
          accountId,
          containerId,
          ...(workspaceId ? { workspaceId } : {}),
          ...(versionId ? { versionId } : {}),
          requestedAt: new Date().toISOString(),
          executionId: (this as IExecuteFunctions & { getExecutionId?: () => string }).getExecutionId?.(),
        };

        if (isCreateVersion) {
          const ids = { accountId, containerId, workspaceId };
          const expectedWorkspaceFingerprint = this.getNodeParameter('expectedWorkspaceFingerprint', itemIndex) as string;
          outputContext.expectedWorkspaceFingerprint = expectedWorkspaceFingerprint;
          const workspace = asJsonObject(await this.helpers.requestOAuth2.call(this, CREDENTIAL_NAME, {
            method: 'GET',
            url: `${GTM_BASE_URL}${buildReadRequest('workspacesGet', ids).path}`,
            json: true,
          }));
          if (!expectedWorkspaceFingerprint || String(workspace.fingerprint ?? '') !== expectedWorkspaceFingerprint) {
            throw new Error('Workspace fingerprint is missing or changed since review; Create Version was blocked.');
          }
          const status = asJsonObject(await requestGtm(buildPublisherRequest('workspace', 'getStatus', ids)));
          if (hasPublisherBlockingStatus(status.workspaceChange)
            || hasPublisherBlockingStatus(status.mergeConflict)
            || hasPublisherBlockingStatus(status.syncStatus)) {
            throw new Error('Workspace status has a blocking conflict or sync problem; Create Version was blocked.');
          }
          const preview = asJsonObject(await requestGtm(buildPublisherRequest('workspace', 'quickPreview', ids)));
          if (preview.compilerError === true || hasPublisherBlockingStatus(preview.syncStatus)) {
            throw new Error('Workspace quick preview has a compiler or sync problem; Create Version was blocked.');
          }
          response = await requestGtm(buildPublisherRequest('workspace', 'createVersion', {
            ...ids,
            versionName: this.getNodeParameter('versionName', itemIndex),
            versionNotes: this.getNodeParameter('versionNotes', itemIndex, ''),
          }));
          const created = asJsonObject(response);
          const createdVersion = asJsonObject(created.containerVersion);
          if (created.compilerError === true || hasPublisherBlockingStatus(created.syncStatus)) {
            throw new Error('Create Version returned a compiler or sync problem; verification failed.');
          }
          if (!getContainerVersionId(createdVersion)) {
            throw new Error('Create Version returned no container version ID; verification failed.');
          }
          if (typeof created.newWorkspacePath !== 'string'
            || !created.newWorkspacePath
            || !created.newWorkspacePath.includes(`/accounts/${accountId}/containers/${containerId}/workspaces/`)) {
            throw new Error('Create Version returned no expected replacement workspace path; verification failed.');
          }
          outputContext.newWorkspacePath = created.newWorkspacePath;
        } else if (isPublish) {
          const ids = { accountId, containerId, versionId };
          const expectedVersionFingerprint = this.getNodeParameter('expectedVersionFingerprint', itemIndex) as string;
          outputContext.expectedVersionFingerprint = expectedVersionFingerprint;
          if (!expectedVersionFingerprint) throw new Error('Expected Version Fingerprint is required before Publish.');
          const currentVersion = asJsonObject(await requestGtm(buildPublisherRequest('version', 'get', ids)));
          if (String(currentVersion.fingerprint ?? '') !== expectedVersionFingerprint) {
            throw new Error('Version fingerprint changed since review; Publish was blocked.');
          }
          response = await requestGtm(buildPublisherRequest('version', 'publish', {
            ...ids,
            fingerprint: expectedVersionFingerprint,
          }));
          const publishResult = asJsonObject(response);
          if (publishResult.compilerError === true || hasPublisherBlockingStatus(publishResult.syncStatus)) {
            throw new Error('Publish returned a compiler or sync problem; verification failed.');
          }
          const liveRequest = buildReadRequest('versionsLive', { accountId, containerId });
          const liveVersion = asJsonObject(await this.helpers.requestOAuth2.call(this, CREDENTIAL_NAME, {
            method: liveRequest.method,
            url: `${GTM_BASE_URL}${liveRequest.path}`,
            json: true,
          }));
          if (getContainerVersionId(liveVersion) !== versionId) {
            throw new Error('Post-publish verification returned a different live version ID.');
          }
          outputContext.liveVersion = liveVersion;
        } else {
          response = await requestGtm(buildPublisherRequest(resource, operation, {
            accountId,
            containerId,
            workspaceId,
            versionId,
          }));
        }

        returnData.push({ json: normalizePublisherResult(resource, operation, response, outputContext) });
      } catch (error) {
        if (error instanceof NodeOperationError || error instanceof NodeApiError) throw error;
        const errorObject: JsonObject = error instanceof Error
          ? { message: error.message, ...(error.stack ? { stack: error.stack } : {}) }
          : { error: String(error) };
        throw new NodeApiError(this.getNode(), errorObject, {
          message: `Google Tag Manager Publisher ${operation} ${resource} failed`,
          description: error instanceof Error ? error.message : 'Unknown GTM API error',
        });
      }
    }

    return [returnData];
  }
}
