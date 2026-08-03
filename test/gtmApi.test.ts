import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleTagManagerAdminOAuth2 } from '../credentials/GoogleTagManagerAdminOAuth2.credentials';
import { GoogleTagManagerAdmin } from '../nodes/GoogleTagManagerAdmin/GoogleTagManagerAdmin.node';
import { GoogleTagManagerPublisherOAuth2 } from '../credentials/GoogleTagManagerPublisherOAuth2.credentials';
import { GoogleTagManagerPublisher, getContainerVersionId, normalizePublisherResult } from '../nodes/GoogleTagManagerPublisher/GoogleTagManagerPublisher.node';
import {
  buildEditorPayload,
  buildEditorRequest,
  buildAdminPayload,
  buildAdminRequest,
  buildPublisherRequest,
  buildReadRequest,
  hasPublisherBlockingStatus,
  requirePublisherPreviewConfirmation,
} from '../src/gtmApi';

test('keeps the Admin credential scoped to account and container administration', () => {
  const credential = new GoogleTagManagerAdminOAuth2();
  const scope = credential.properties.find((property) => property.name === 'scope');

  assert.equal(credential.name, 'googleTagManagerAdminOAuth2Api');
  assert.equal(credential.displayName, 'Google Tag Manager OAuth2 API - Admin');
  assert.deepEqual(credential.supportedNodes, ['googleTagManagerAdmin']);
  assert.deepEqual(new Set(String(scope?.default).split(' ')), new Set([
    'https://www.googleapis.com/auth/tagmanager.readonly',
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.manage.accounts',
  ]));
  assert.doesNotMatch(String(scope?.default), /containerversions|publish|delete\.containers|manage\.users/);
});

test('exposes only bounded Admin operations and no generic selectors', () => {
  const node = new GoogleTagManagerAdmin();
  const operationValues = node.description.properties.reduce<string[]>((values, property) => {
    if (property.name !== 'adminOperation' || !Array.isArray(property.options)) return values;
    for (const option of property.options) {
      if (option && typeof option === 'object' && 'value' in option && typeof option.value === 'string') values.push(option.value);
    }
    return values;
  }, []);

  assert.equal(node.description.name, 'googleTagManagerAdmin');
  assert.deepEqual(node.description.credentials, [{ name: 'googleTagManagerAdminOAuth2Api', required: true }]);
  assert.equal('usableAsTool' in node.description, false);
  assert.equal(node.description.properties.some((property) => property.name === 'adminResource'), true);
  assert.equal(node.description.properties.some((property) => ['resource', 'operation'].includes(property.name)), false);
  assert.deepEqual(new Set(operationValues), new Set(['create', 'update']));
});

test('builds a guarded GTM container create request', () => {
  const payload = buildAdminPayload('container', {
    containerName: 'Controlled server container',
    usageContext: 'web,server',
    containerNotes: 'Admin smoke test',
    domainNames: '["example.test"]',
  });
  assert.deepEqual(buildAdminRequest('container', 'create', { accountId: '123' }, payload), {
    method: 'POST',
    path: '/accounts/123/containers',
    required: ['accountId'],
    body: {
      name: 'Controlled server container',
      usageContext: ['web', 'server'],
      notes: 'Admin smoke test',
      domainName: ['example.test'],
    },
  });
});

test('builds fingerprint-protected account and container updates', () => {
  const accountPayload = buildAdminPayload('account', {
    accountName: 'Controlled account',
    updateShareData: true,
    shareData: false,
  });
  assert.deepEqual(buildAdminRequest('account', 'update', { accountId: '1', fingerprint: 'a/b' }, accountPayload), {
    method: 'PUT',
    path: '/accounts/1',
    required: ['accountId'],
    body: { name: 'Controlled account', shareData: false },
    query: { fingerprint: 'a/b' },
  });

  const containerPayload = buildAdminPayload('container', { containerName: 'Renamed container' });
  assert.deepEqual(buildAdminRequest('container', 'update', {
    accountId: '1',
    containerId: '2/3',
    fingerprint: 'container-fp',
  }, containerPayload), {
    method: 'PUT',
    path: '/accounts/1/containers/2%2F3',
    required: ['accountId', 'containerId'],
    body: { name: 'Renamed container', usageContext: ['web'] },
    query: { fingerprint: 'container-fp' },
  });
});

test('rejects unsafe or incomplete Admin payloads', () => {
  assert.throws(() => buildAdminPayload('account', {}), /accountName or enable updateShareData/);
  assert.throws(() => buildAdminPayload('container', { containerName: 'x', usageContext: 'desktop' }), /supported GTM values/);
  assert.throws(() => buildAdminPayload('container', { containerName: 'x', domainNames: '{"not":"array"}' }), /JSON array of strings/);
  assert.throws(() => buildAdminRequest('account', 'create', { accountId: '1' }, { name: 'x' }), /Unsupported Admin operation/);
});

test('keeps the Publisher credential isolated to versioning and publication scopes', () => {
  const credential = new GoogleTagManagerPublisherOAuth2();
  const scope = credential.properties.find((property) => property.name === 'scope');

  assert.equal(credential.name, 'googleTagManagerPublisherOAuth2Api');
  assert.equal(credential.displayName, 'Google Tag Manager OAuth2 API - Publisher');
  assert.equal(credential.icon, 'file:google-tag-manager-v2.svg');
  assert.deepEqual(credential.supportedNodes, ['googleTagManagerPublisher']);
  assert.equal(scope?.default, [
    'https://www.googleapis.com/auth/tagmanager.readonly',
    'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
    'https://www.googleapis.com/auth/tagmanager.publish',
  ].join(' '));
  assert.doesNotMatch(String(scope?.default), /edit\.containers|delete\.containers|manage\.accounts|manage\.users/);
});

test('exposes only bounded Publisher operations and requires the Publisher credential', () => {
  const node = new GoogleTagManagerPublisher();
  const operationValues = node.description.properties.reduce<string[]>((values, property) => {
    if (property.name !== 'publisherOperation' || !Array.isArray(property.options)) return values;
    for (const option of property.options) {
      if (option && typeof option === 'object' && 'value' in option && typeof option.value === 'string') {
        values.push(option.value);
      }
    }
    return values;
  }, []);
  const confirmPreview = node.description.properties.find((property) => property.name === 'confirmQuickPreview');
  const confirmCreateVersion = node.description.properties.find((property) => property.name === 'confirmCreateVersion');
  const acknowledgeWorkspaceConsumption = node.description.properties.find((property) => property.name === 'acknowledgeWorkspaceConsumption');
  const confirmPublish = node.description.properties.find((property) => property.name === 'confirmPublish');
  const publishConfirmation = node.description.properties.find((property) => property.name === 'publishConfirmation');

  assert.equal(node.description.name, 'googleTagManagerPublisher');
  assert.deepEqual(node.description.credentials, [{ name: 'googleTagManagerPublisherOAuth2Api', required: true }]);
  assert.equal('usableAsTool' in node.description, false);
  assert.equal(node.description.properties.some((property) => property.name === 'publisherResource'), true);
  assert.equal(node.description.properties.some((property) => ['resource', 'operation'].includes(property.name)), false);
  assert.deepEqual(new Set(operationValues), new Set(['getStatus', 'quickPreview', 'createVersion', 'get', 'publish']));
  assert.equal(confirmPreview?.default, false);
  assert.equal(confirmCreateVersion?.default, false);
  assert.equal(acknowledgeWorkspaceConsumption?.default, false);
  assert.equal(confirmPublish?.default, false);
  assert.equal(publishConfirmation?.default, '');
});

test('builds the Publisher workspace status endpoint', () => {
  assert.deepEqual(buildPublisherRequest('workspace', 'getStatus', {
    accountId: '123',
    containerId: '456',
    workspaceId: '7',
  }), {
    method: 'GET',
    path: '/accounts/123/containers/456/workspaces/7/status',
    required: ['accountId', 'containerId', 'workspaceId'],
  });
});

test('builds the Publisher quick preview endpoint', () => {
  assert.deepEqual(buildPublisherRequest('workspace', 'quickPreview', {
    accountId: '123',
    containerId: '456',
    workspaceId: '7',
  }), {
    method: 'POST',
    path: '/accounts/123/containers/456/workspaces/7:quick_preview',
    required: ['accountId', 'containerId', 'workspaceId'],
  });
});

test('builds the Publisher version get endpoint', () => {
  assert.deepEqual(buildPublisherRequest('version', 'get', {
    accountId: '123',
    containerId: '456',
    versionId: '89',
  }), {
    method: 'GET',
    path: '/accounts/123/containers/456/versions/89',
    required: ['accountId', 'containerId', 'versionId'],
  });
});

test('requires explicit confirmation before a Publisher quick preview', () => {
  assert.throws(
    () => requirePublisherPreviewConfirmation('quickPreview', false),
    /Set Confirm Quick Preview to true/,
  );
  assert.doesNotThrow(() => requirePublisherPreviewConfirmation('getStatus', false));
  assert.doesNotThrow(() => requirePublisherPreviewConfirmation('quickPreview', true));
});

test('builds the guarded Publisher create-version endpoint and payload', () => {
  assert.deepEqual(buildPublisherRequest('workspace', 'createVersion', {
    accountId: '123',
    containerId: '456',
    workspaceId: '7',
    versionName: 'Reviewed release',
    versionNotes: 'Approved draft',
  }), {
    method: 'POST',
    path: '/accounts/123/containers/456/workspaces/7:create_version',
    required: ['accountId', 'containerId', 'workspaceId'],
    body: { name: 'Reviewed release', notes: 'Approved draft' },
  });
});

test('builds the fingerprint-protected Publisher publish endpoint', () => {
  assert.deepEqual(buildPublisherRequest('version', 'publish', {
    accountId: '123',
    containerId: '456',
    versionId: '89',
    fingerprint: 'fp/1',
  }), {
    method: 'POST',
    path: '/accounts/123/containers/456/versions/89:publish?fingerprint=fp%2F1',
    required: ['accountId', 'containerId', 'versionId', 'fingerprint'],
  });
});

test('requires explicit create-version acknowledgement', async () => {
  const { requirePublisherCreateVersionConfirmation } = await import('../src/gtmApi');
  assert.throws(
    () => requirePublisherCreateVersionConfirmation(false, false),
    /Confirm Create Version/,
  );
  assert.throws(
    () => requirePublisherCreateVersionConfirmation(true, false),
    /consume the source workspace/,
  );
  assert.doesNotThrow(() => requirePublisherCreateVersionConfirmation(true, true));
});

test('requires the exact Publisher publish confirmation', async () => {
  const { requirePublisherPublishConfirmation } = await import('../src/gtmApi');
  assert.throws(
    () => requirePublisherPublishConfirmation('89', false, 'PUBLICAR 89'),
    /Confirm Publish/,
  );
  assert.throws(
    () => requirePublisherPublishConfirmation('89', true, 'PUBLICAR 90'),
    /PUBLICAR 89/,
  );
  assert.doesNotThrow(() => requirePublisherPublishConfirmation('89', true, 'PUBLICAR 89'));
});

test('accepts the GTM containerVersionId field during publish verification', () => {
  assert.equal(getContainerVersionId({ containerVersionId: '78' }), '78');
  assert.equal(getContainerVersionId({ versionId: '78' }), '78');
  assert.equal(getContainerVersionId({}), '');
});

test('treats empty merge conflicts and healthy sync status as non-blocking', () => {
  assert.equal(hasPublisherBlockingStatus({ mergeConflict: [] }), false);
  assert.equal(hasPublisherBlockingStatus({ syncStatus: { syncState: 'SYNCED' } }), false);
  assert.equal(hasPublisherBlockingStatus({ mergeConflict: [{ path: 'tags/1' }] }), true);
  assert.equal(hasPublisherBlockingStatus({ syncStatus: { syncError: 'failed to sync' } }), true);
});

test('normalizes Publisher output without returning unpublished GTM configuration', () => {
  const output = normalizePublisherResult('workspace', 'quickPreview', {
    compilerError: false,
    syncStatus: { syncState: 'SYNCED' },
    containerVersion: {
      containerVersionId: '78',
      name: 'Reviewed release',
      fingerprint: 'fp-78',
      tag: [{ name: 'private tag configuration' }],
      trigger: [{ name: 'private trigger configuration' }],
    },
  }, {
    accountId: '1',
    containerId: '2',
    workspaceId: '3',
    requestedAt: '2026-08-02T00:00:00.000Z',
  });

  assert.equal(JSON.stringify(output).includes('private tag configuration'), false);
  assert.equal(JSON.stringify(output).includes('private trigger configuration'), false);
  assert.deepEqual(output.preview, {
    compilerError: false,
    syncStatus: { present: true, blocking: false },
    containerVersion: { containerVersionId: '78', name: 'Reviewed release', fingerprint: 'fp-78' },
  });
  assert.equal((output.audit as Record<string, unknown>).accountId, '1');
});

test('builds the account inventory endpoint', () => {
  assert.deepEqual(buildReadRequest('accountsList', {}), {
    method: 'GET',
    path: '/accounts',
    required: [],
  });
});

test('builds the workspace tag inventory endpoint', () => {
  assert.deepEqual(buildReadRequest('tagsList', {
    accountId: '123',
    containerId: '456',
    workspaceId: '7',
  }), {
    method: 'GET',
    path: '/accounts/123/containers/456/workspaces/7/tags',
    required: ['accountId', 'containerId', 'workspaceId'],
  });
});

test('encodes path segments', () => {
  assert.equal(
    buildReadRequest('containersGet', { accountId: '12 3', containerId: '4/5' }).path,
    '/accounts/12%203/containers/4%2F5',
  );
});

test('rejects missing required IDs', () => {
  assert.throws(() => buildReadRequest('containersList', {}), /accountId is required/);
});

test('builds an Editor workspace create request with a named payload', () => {
  const payload = buildEditorPayload('workspace', {
    name: 'Draft implementation',
    description: 'Safe working area',
  });
  assert.deepEqual(buildEditorRequest('workspace', 'create', {
    accountId: '123',
    containerId: '456',
  }, payload), {
    method: 'POST',
    path: '/accounts/123/containers/456/workspaces',
    required: ['accountId', 'containerId'],
    body: { name: 'Draft implementation', description: 'Safe working area' },
  });
});

test('builds an Editor tag update request with encoded identifiers', () => {
  const payload = buildEditorPayload('tag', {
    name: 'Example tag',
    resourceType: 'html',
    notes: 'Controlled draft change',
    parentFolderId: '12',
    advancedOptions: '{"firingTriggerId":["5"],"paused":false}',
  });
  assert.deepEqual(buildEditorRequest('tag', 'update', {
    accountId: '1',
    containerId: '2',
    workspaceId: '3',
    resourceId: '4/5',
  }, payload), {
    method: 'PUT',
    path: '/accounts/1/containers/2/workspaces/3/tags/4%2F5',
    required: ['accountId', 'containerId', 'workspaceId', 'resourceId'],
    body: {
      name: 'Example tag',
      firingTriggerId: ['5'],
      paused: false,
      notes: 'Controlled draft change',
      parentFolderId: '12',
      type: 'html',
    },
  });
});

test('requires a GTM type for tag, trigger, and variable payloads', () => {
  assert.throws(
    () => buildEditorPayload('tag', { name: 'Untyped tag' }),
    /resourceType is required/,
  );
});

test('rejects unsupported advanced fields instead of forwarding arbitrary payloads', () => {
  assert.throws(
    () => buildEditorPayload('tag', {
      name: 'Unsafe tag',
      resourceType: 'html',
      advancedOptions: '{"path":"accounts/1/containers/2"}',
    }),
    /advancedOptions.path is not supported for tag/,
  );
});

test('rejects a missing workspace for a draft resource', () => {
  const payload = buildEditorPayload('variable', { name: 'Example variable', resourceType: 'v' });
  assert.throws(
    () => buildEditorRequest('variable', 'create', { accountId: '1', containerId: '2' }, payload),
    /workspaceId is required/,
  );
});

test('accepts folder payloads without a GTM type', () => {
  assert.deepEqual(buildEditorPayload('folder', {
    name: 'Implementation folder',
    notes: 'Draft assets',
  }), {
    name: 'Implementation folder',
    notes: 'Draft assets',
  });
});
