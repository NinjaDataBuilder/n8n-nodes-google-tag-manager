import type { IDataObject } from 'n8n-workflow';

export const GTM_BASE_URL = 'https://www.googleapis.com/tagmanager/v2';

export type ReadOperation =
  | 'accountsList'
  | 'containersList'
  | 'containersGet'
  | 'workspacesList'
  | 'workspacesGet'
  | 'workspacesGetStatus'
  | 'tagsList'
  | 'triggersList'
  | 'variablesList'
  | 'foldersList'
  | 'environmentsList'
  | 'versionsLive'
  | 'versionsGet';

export type EditorResource = 'workspace' | 'tag' | 'trigger' | 'variable' | 'folder';
export type EditorOperation = 'create' | 'update';
export type PublisherResource = 'workspace' | 'version';
export type PublisherOperation = 'getStatus' | 'quickPreview' | 'createVersion' | 'get' | 'publish';
export type AdminResource = 'account' | 'container';
export type AdminOperation = 'create' | 'update';

export type GtmPathParams = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  versionId?: string;
  resourceId?: string;
  fingerprint?: unknown;
};

export type PublisherPayloadParams = GtmPathParams & {
  versionName?: unknown;
  versionNotes?: unknown;
  fingerprint?: unknown;
};

export type AdminPayloadInput = {
  accountName?: unknown;
  updateShareData?: unknown;
  shareData?: unknown;
  containerName?: unknown;
  usageContext?: unknown;
  containerNotes?: unknown;
  domainNames?: unknown;
  taggingServerUrls?: unknown;
};

export type GtmRequest = {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  required: string[];
  body?: IDataObject;
  query?: IDataObject;
};

export type EditorPayloadInput = {
  name: unknown;
  resourceType?: unknown;
  description?: unknown;
  notes?: unknown;
  parentFolderId?: unknown;
  advancedOptions?: unknown;
};

const EDITOR_ADVANCED_FIELDS: Record<EditorResource, readonly string[]> = {
  workspace: [],
  tag: [
    'consentSettings',
    'priority',
    'firingTriggerId',
    'scheduleStartMs',
    'scheduleEndMs',
    'setupTag',
    'paused',
    'parameter',
    'tagFiringOption',
    'monitoringMetadata',
    'monitoringMetadataTagNameKey',
    'teardownTag',
    'liveOnly',
    'blockingTriggerId',
  ],
  trigger: [
    'continuousTimeMinMilliseconds',
    'verticalScrollPercentageList',
    'totalTimeMinMilliseconds',
    'customEventFilter',
    'interval',
    'filter',
    'checkValidation',
    'waitForTagsTimeout',
    'limit',
    'eventName',
    'maxTimerLengthSeconds',
    'waitForTags',
    'visiblePercentageMin',
    'intervalSeconds',
    'horizontalScrollPercentageList',
    'uniqueTriggerId',
    'selector',
    'visibilitySelector',
    'parameter',
    'autoEventFilter',
  ],
  variable: [
    'enablingTriggerId',
    'scheduleStartMs',
    'scheduleEndMs',
    'formatValue',
    'disablingTriggerId',
    'parameter',
  ],
  folder: [],
};

const segment = (value: string, name: string): string => {
  if (!value.trim()) throw new Error(`${name} is required`);
  return encodeURIComponent(value.trim());
};

const optionalText = (value: unknown, name: string): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${name} must be a string`);
  const trimmed = value.trim();
  return trimmed || undefined;
};

const requiredText = (value: unknown, name: string): string => {
  const text = optionalText(value, name);
  if (!text) throw new Error(`${name} is required`);
  return text;
};

function parseAdvancedOptions(value: unknown): IDataObject {
  if (value === undefined || value === null || value === '') return {};
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('advancedOptions must be a JSON object');
  }
  return parsed as IDataObject;
}

function validatedAdvancedOptions(resource: EditorResource, value: unknown): IDataObject {
  let options: IDataObject;
  try {
    options = parseAdvancedOptions(value);
  } catch (error) {
    throw new Error(`Invalid advancedOptions: ${error instanceof Error ? error.message : String(error)}`);
  }

  const allowed = new Set(EDITOR_ADVANCED_FIELDS[resource]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) {
      throw new Error(`advancedOptions.${key} is not supported for ${resource}`);
    }
  }
  return options;
}

export function buildReadRequest(operation: ReadOperation, params: GtmPathParams): GtmRequest {
  const account = () => segment(params.accountId ?? '', 'accountId');
  const container = () => segment(params.containerId ?? '', 'containerId');
  const workspace = () => segment(params.workspaceId ?? '', 'workspaceId');
  const version = () => segment(params.versionId ?? '', 'versionId');

  switch (operation) {
    case 'accountsList':
      return { method: 'GET', path: '/accounts', required: [] };
    case 'containersList':
      return { method: 'GET', path: `/accounts/${account()}/containers`, required: ['accountId'] };
    case 'containersGet':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}`, required: ['accountId', 'containerId'] };
    case 'workspacesList':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces`, required: ['accountId', 'containerId'] };
    case 'workspacesGet':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces/${workspace()}`, required: ['accountId', 'containerId', 'workspaceId'] };
    case 'workspacesGetStatus':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces/${workspace()}/status`, required: ['accountId', 'containerId', 'workspaceId'] };
    case 'tagsList':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces/${workspace()}/tags`, required: ['accountId', 'containerId', 'workspaceId'] };
    case 'triggersList':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces/${workspace()}/triggers`, required: ['accountId', 'containerId', 'workspaceId'] };
    case 'variablesList':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces/${workspace()}/variables`, required: ['accountId', 'containerId', 'workspaceId'] };
    case 'foldersList':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/workspaces/${workspace()}/folders`, required: ['accountId', 'containerId', 'workspaceId'] };
    case 'environmentsList':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/environments`, required: ['accountId', 'containerId'] };
    case 'versionsLive':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/versions:live`, required: ['accountId', 'containerId'] };
    case 'versionsGet':
      return { method: 'GET', path: `/accounts/${account()}/containers/${container()}/versions/${version()}`, required: ['accountId', 'containerId', 'versionId'] };
    default:
      return assertNever(operation);
  }
}

export function buildEditorPayload(resource: EditorResource, input: EditorPayloadInput): IDataObject {
  const name = requiredText(input.name, 'name');
  const advancedOptions = validatedAdvancedOptions(resource, input.advancedOptions);
  const payload: IDataObject = { name, ...advancedOptions };

  if (resource === 'workspace') {
    const description = optionalText(input.description, 'description');
    if (description) payload.description = description;
    return payload;
  }

  const notes = optionalText(input.notes, 'notes');
  const parentFolderId = optionalText(input.parentFolderId, 'parentFolderId');
  if (notes) payload.notes = notes;
  if (parentFolderId) payload.parentFolderId = parentFolderId;

  if (resource === 'folder') return payload;

  payload.type = requiredText(input.resourceType, 'resourceType');
  return payload;
}

export function buildEditorRequest(
  resource: EditorResource,
  operation: EditorOperation,
  params: GtmPathParams,
  body: IDataObject,
): GtmRequest {
  const account = () => segment(params.accountId ?? '', 'accountId');
  const container = () => segment(params.containerId ?? '', 'containerId');
  const workspace = () => segment(params.workspaceId ?? '', 'workspaceId');
  const resourceId = () => segment(params.resourceId ?? '', 'resourceId');
  const containerParent = `/accounts/${account()}/containers/${container()}`;

  if (resource === 'workspace') {
    if (operation === 'create') {
      return { method: 'POST', path: `${containerParent}/workspaces`, required: ['accountId', 'containerId'], body };
    }
    return {
      method: 'PUT',
      path: `${containerParent}/workspaces/${workspace()}`,
      required: ['accountId', 'containerId', 'workspaceId'],
      body,
    };
  }

  const workspaceParent = `${containerParent}/workspaces/${workspace()}`;
  const collection = `${resource}s`;
  if (operation === 'create') {
    return {
      method: 'POST',
      path: `${workspaceParent}/${collection}`,
      required: ['accountId', 'containerId', 'workspaceId'],
      body,
    };
  }

  return {
    method: 'PUT',
    path: `${workspaceParent}/${collection}/${resourceId()}`,
    required: ['accountId', 'containerId', 'workspaceId', 'resourceId'],
    body,
  };
}

export function buildPublisherRequest(
  resource: PublisherResource,
  operation: PublisherOperation,
  params: PublisherPayloadParams,
): GtmRequest {
  const account = () => segment(params.accountId ?? '', 'accountId');
  const container = () => segment(params.containerId ?? '', 'containerId');
  const workspace = () => segment(params.workspaceId ?? '', 'workspaceId');
  const version = () => segment(params.versionId ?? '', 'versionId');
  const containerParent = `/accounts/${account()}/containers/${container()}`;

  if (resource === 'workspace' && operation === 'getStatus') {
    return {
      method: 'GET',
      path: `${containerParent}/workspaces/${workspace()}/status`,
      required: ['accountId', 'containerId', 'workspaceId'],
    };
  }

  if (resource === 'workspace' && operation === 'quickPreview') {
    return {
      method: 'POST',
      path: `${containerParent}/workspaces/${workspace()}:quick_preview`,
      required: ['accountId', 'containerId', 'workspaceId'],
    };
  }

  if (resource === 'workspace' && operation === 'createVersion') {
    const name = requiredText(params.versionName, 'versionName');
    const notes = optionalText(params.versionNotes, 'versionNotes');
    return {
      method: 'POST',
      path: `${containerParent}/workspaces/${workspace()}:create_version`,
      required: ['accountId', 'containerId', 'workspaceId'],
      body: { name, ...(notes ? { notes } : {}) },
    };
  }

  if (resource === 'version' && operation === 'get') {
    return {
      method: 'GET',
      path: `${containerParent}/versions/${version()}`,
      required: ['accountId', 'containerId', 'versionId'],
    };
  }

  if (resource === 'version' && operation === 'publish') {
    const fingerprint = encodeURIComponent(requiredText(params.fingerprint, 'fingerprint'));
    return {
      method: 'POST',
      path: `${containerParent}/versions/${version()}:publish?fingerprint=${fingerprint}`,
      required: ['accountId', 'containerId', 'versionId', 'fingerprint'],
    };
  }

  throw new Error(`Unsupported Publisher operation: ${operation} on ${resource}`);
}

export function buildAdminPayload(resource: AdminResource, input: AdminPayloadInput): IDataObject {
  if (resource === 'account') {
    const payload: IDataObject = {};
    const name = optionalText(input.accountName, 'accountName');
    if (name) payload.name = name;
    if (input.updateShareData === true) {
      if (typeof input.shareData !== 'boolean') throw new Error('shareData must be a boolean when updateShareData is true');
      payload.shareData = input.shareData;
    }
    if (Object.keys(payload).length === 0) throw new Error('Provide accountName or enable updateShareData for an account update');
    return payload;
  }

  const name = requiredText(input.containerName, 'containerName');
  const usageContextValue = optionalText(input.usageContext, 'usageContext') ?? 'web';
  const usageContext = usageContextValue.split(',').map((value) => value.trim()).filter(Boolean);
  const allowedContexts = new Set(['web', 'android', 'ios', 'androidSdk5', 'iosSdk5', 'amp', 'server']);
  if (usageContext.length === 0 || usageContext.some((value) => !allowedContexts.has(value))) {
    throw new Error('usageContext must contain only supported GTM values: web, android, ios, androidSdk5, iosSdk5, amp, server');
  }

  const parseStringArray = (value: unknown, name: string): string[] => {
    if (value === undefined || value === null || value === '') return [];
    let parsed: unknown;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      throw new Error(`${name} must be a JSON array of strings: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== 'string')) {
      throw new Error(`${name} must be a JSON array of strings`);
    }
    return parsed.map((entry) => entry.trim()).filter(Boolean);
  };

  const payload: IDataObject = { name, usageContext };
  const notes = optionalText(input.containerNotes, 'containerNotes');
  if (notes) payload.notes = notes;
  const domainName = parseStringArray(input.domainNames, 'domainNames');
  if (domainName.length) payload.domainName = domainName;
  const taggingServerUrls = parseStringArray(input.taggingServerUrls, 'taggingServerUrls');
  if (taggingServerUrls.length) payload.taggingServerUrls = taggingServerUrls;
  return payload;
}

export function buildAdminRequest(
  resource: AdminResource,
  operation: AdminOperation,
  params: GtmPathParams,
  body: IDataObject,
): GtmRequest {
  const account = () => segment(params.accountId ?? '', 'accountId');
  const container = () => segment(params.containerId ?? '', 'containerId');
  const fingerprint = optionalText(params.fingerprint, 'fingerprint');
  const query = fingerprint ? { fingerprint } : undefined;

  if (resource === 'account' && operation === 'update') {
    return {
      method: 'PUT',
      path: `/accounts/${account()}`,
      required: ['accountId'],
      body,
      query,
    };
  }
  if (resource === 'container' && operation === 'create') {
    return {
      method: 'POST',
      path: `/accounts/${account()}/containers`,
      required: ['accountId'],
      body,
    };
  }
  if (resource === 'container' && operation === 'update') {
    return {
      method: 'PUT',
      path: `/accounts/${account()}/containers/${container()}`,
      required: ['accountId', 'containerId'],
      body,
      query,
    };
  }
  throw new Error(`Unsupported Admin operation: ${operation} on ${resource}`);
}

export function requireAdminConfirmation(confirmed: boolean): void {
  if (!confirmed) throw new Error('Set Confirm Admin Change to true before changing a GTM account or container.');
}

export function requirePublisherPreviewConfirmation(operation: PublisherOperation, confirmed: boolean): void {
  if (operation === 'quickPreview' && !confirmed) {
    throw new Error('Set Confirm Quick Preview to true before generating a GTM workspace quick preview.');
  }
}

export function hasPublisherBlockingStatus(value: unknown): boolean {
  if (value === undefined || value === null || value === false || value === '') return false;
  if (value === true) return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return /fail|error|conflict|invalid|not[\s_-]*synced/i.test(value);
  if (typeof value !== 'object') return false;

  return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
    const keyLooksBlocking = /error|fail|conflict/i.test(key);
    if (keyLooksBlocking && entry !== undefined && entry !== null && entry !== false && entry !== '') {
      return Array.isArray(entry) ? entry.length > 0 : true;
    }
    return hasPublisherBlockingStatus(entry);
  });
}

export function requirePublisherCreateVersionConfirmation(confirmed: boolean, acknowledgedWorkspaceConsumption: boolean): void {
  if (!confirmed || !acknowledgedWorkspaceConsumption) {
    throw new Error('Set Confirm Create Version to true and acknowledge that GTM will consume the source workspace.');
  }
}

export function requirePublisherPublishConfirmation(
  versionId: string,
  confirmed: boolean,
  confirmation: unknown,
): void {
  const expected = `PUBLICAR ${requiredText(versionId, 'versionId')}`;
  if (!confirmed || confirmation !== expected) {
    throw new Error(`Set Confirm Publish to true and enter exactly: ${expected}`);
  }
}

export function asJsonObject(value: unknown): IDataObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as IDataObject;
  return { data: value as IDataObject };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported GTM operation: ${String(value)}`);
}
