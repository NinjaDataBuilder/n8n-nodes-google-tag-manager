# Instalação e operação — Português do Brasil

Este documento é o procedimento operacional para instalar, validar, atualizar, remover e reinstalar o package no n8n self-hosted.

> ✅ Package público: `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.3`
>
> ⚠️ Não use este procedimento no n8n Cloud: Community Nodes não verificados não estão disponíveis lá.

## Antes de instalar

Confirme todos os itens:

- [ ] A instância é self-hosted.
- [ ] Você é Owner ou Admin do n8n.
- [ ] Existe backup recente e rollback conhecido.
- [ ] O package será instalado primeiro em staging.
- [ ] A saída para `https://registry.npmjs.org` está permitida.
- [ ] Você possui acesso ao Google Cloud e ao account/container GTM de teste.
- [ ] Nenhum secret ou dado de cliente será colocado no chat, no Git ou no workflow.

A referência do projeto foi validada com n8n `2.32.5`. Versões mais novas devem ser validadas em staging antes do uso em produção.

## Caminho recomendado: instalação pela UI

### 1. Abra a tela correta

No n8n:

```text
Settings → Community Nodes → Install
```

### 2. Fixe a versão

Informe:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.3
```

Não instale sem versão em produção.

### 3. Confirme o risco e aguarde

Aceite o aviso de Community Node não verificado e aguarde o n8n concluir.

Se o n8n solicitar restart, faça-o somente com backup e rollback disponíveis.

### 4. Confirme a instalação

Em **Settings → Community Nodes**, confira `0.5.3`. No editor, pesquise `Google Tag Manager` e confirme:

- Google Tag Manager;
- Google Tag Manager Editor;
- Google Tag Manager Publisher;
- Google Tag Manager Admin.

A presença do package na lista não é suficiente: execute o smoke test Read.

## Caminho reproduzível: Docker/ambiente

Use esta configuração no ambiente do n8n:

```dotenv
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES_REGISTRY=https://registry.npmjs.org
N8N_COMMUNITY_PACKAGES=[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.3"}]
```

Em um `docker-compose.yml`, preserve o JSON como uma string válida. Valide antes de recriar:

```bash
docker compose config --quiet
docker compose up -d
```

Depois confira readiness e logs:

```bash
curl -fsS http://127.0.0.1:5678/healthz/readiness
docker compose logs --tail=200 n8n
```

Procure por readiness e por uma confirmação de instalação do package. Não considere um container `Up` suficiente: o package precisa estar instalado e carregado.

> ⚠️ Com `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true`, a lista é autoritativa. Packages omitidos podem ser removidos no startup. Capture a lista existente antes de ativar esse mecanismo.

### Checksum opcional

Quando a sua versão do n8n aceitar o campo `checksum`, você pode fixar também o checksum publicado pelo npm:

```text
sha512-3rZKyvCNvuFQew5J8APx7aDrXlkSpBqGzP1KgtgLqsJ3zeZnBEwavUkZLeesFbeBXkioqzE35irl6tZhTWyr9A==
```

Não use token de registry nem registry customizado para este package público.

## OAuth do Google

O OAuth deve ser configurado na tela de credenciais do n8n.

1. Crie ou selecione o projeto adequado no Google Cloud.
2. Configure a tela de consentimento conforme a política da organização.
3. Crie um OAuth Client para aplicação web.
4. Abra a credencial do package no n8n.
5. Copie a redirect URI mostrada pelo próprio n8n.
6. Cadastre essa URI no Google Cloud.
7. Preencha Client ID e Client Secret somente na credencial do n8n.
8. Autorize com a conta Google que possui acesso ao GTM.
9. Não coloque nenhum token no workflow ou na entrada de um node.

Se o OAuth funcionar mas o GTM retornar `403`, revise a permissão da conta Google no account/container. OAuth aprovado não substitui a permissão dentro do GTM.

## Smoke test Read

1. Crie um workflow manual.
2. Adicione o node `Google Tag Manager`.
3. Selecione a credencial `Google Tag Manager OAuth2 API - Read Only`.
4. Faça uma operação de leitura de conta, container ou status.
5. Confira o account ID e container ID antes de executar.
6. Confirme que o resultado não contém token, client secret ou configuração completa desnecessária.
7. Salve o resultado de forma redigida para auditoria.

Somente após esse teste passe para Editor.

## Papéis e escopos

| Papel | Credencial | Escopos principais | Uso inicial |
| --- | --- | --- | --- |
| Read | `Google Tag Manager OAuth2 API - Read Only` | `tagmanager.readonly` | Inventário e auditoria |
| Editor | `Google Tag Manager OAuth2 API - Editor` | `tagmanager.readonly`, `tagmanager.edit.containers` | Draft/workspace |
| Publisher | `Google Tag Manager OAuth2 API - Publisher` | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` | Preview e publicação explícita |
| Admin | `Google Tag Manager OAuth2 API - Admin` | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` | Administração delimitada |

Use uma credencial por papel. Não use Admin como credencial genérica.

## Ordem de adoção

```text
Read → revisar estado → Editor em draft → revisar diff → Publisher preview/version → publicar explicitamente
```

> ⚠️ **Create Version não é preview:** ele cria uma versão real, consome o workspace de origem no GTM e retorna um novo workspace. Revise fingerprint, IDs, nome e impacto antes de habilitar a confirmação.
>
> 🔴 **Confirmação literal de publicação:** `Confirm Publish = true` e `Publish Confirmation = PUBLICAR {versionId}`. Exemplo: `PUBLICAR 123456`. O texto `PUBLISH 123456` será rejeitado.

Workflows de escrita devem permanecer manuais e inativos até a revisão do payload. Não agende publicação e não exponha Publisher/Admin como ferramenta genérica de IA.

## O que não fazer

- Não instalar primeiro em produção.
- Não usar n8n Cloud.
- Não usar `latest` em produção.
- Não reutilizar credenciais entre papéis.
- Não colocar secrets em workflow, Data Table, Git, log ou screenshot.
- Não publicar sem revisar IDs, workspace, version ID e destino.
- Não presumir que o OAuth concede permissão GTM suficiente.
- Não fazer chamadas arbitrárias à API.
- Não habilitar gerenciamento por ambiente sem preservar os packages existentes.
- Não apagar volumes de produção para corrigir uma instalação de Community Node.

## Upgrade e rollback

### UI

1. Faça backup.
2. Teste a nova versão em staging.
3. Execute Read.
4. Abra **Settings → Community Nodes**.
5. Use **Options → Uninstall package** para remover a versão atual.
6. Instale a versão anterior fixada.
7. Execute Read novamente.

### Ambiente

Restaure a versão anterior em `N8N_COMMUNITY_PACKAGES` e recrie somente editor/worker/webhook/runners, conforme a arquitetura. Não reinicie PostgreSQL ou Redis sem uma mudança independente que exija isso.

## Reinstalação de sandbox

O sandbox deve ser separado da produção, usar SQLite, volume próprio e binding local. Um reset completo do sandbox é:

```bash
docker compose down --volumes --remove-orphans
docker compose up -d
```

Esse comando destrói somente o estado descartável do sandbox quando executado dentro do projeto correto. Nunca execute esse comando no diretório Compose da produção.

## Troubleshooting

| Sintoma | Diagnóstico provável | Próxima ação |
| --- | --- | --- |
| Package não aparece | n8n não é self-hosted ou instalação está bloqueada | Verifique tipo de instância e política de Community Nodes |
| `404` no npm | Registry, versão ou rede incorretos | Use `registry.npmjs.org` e `0.5.3` |
| `403` no GTM | Conta sem acesso ao account/container | Corrija a permissão dentro do GTM |
| OAuth não volta ao n8n | Redirect URI ou consentimento incorreto | Use a URI apresentada pelo n8n |
| Package desaparece após restart | Lista declarativa não contém o package | Restaure a entrada em `N8N_COMMUNITY_PACKAGES` |
| n8n não inicia | Env/JSON inválido | Restaure o env anterior e valide `docker compose config` |
| Node aparece mas falha | IDs, workspace ou payload inválidos | Faça Read e teste em draft |

Ao coletar logs para suporte, remova tokens, cookies, client secrets, URLs privadas, IDs sensíveis e dados de cliente.

## Referências

- [README em português](../README.pt-BR.md)
- [README em inglês](../README.en.md)
- [Arquitetura e sandbox](architecture.md)
- [Contrato de permissões](permissions-contract.md)
- [n8n GUI installation](https://docs.n8n.io/integrations/community-nodes/installation/gui-install)
- [n8n environment variable installation](https://docs.n8n.io/integrations/community-nodes/installation/environment-variable-installation)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
