# NinjaDataBuilder Google Tag Manager para n8n

Nodes delimitados da API v2 do Google Tag Manager e credenciais OAuth separadas por papel para **n8n self-hosted**.

> ✅ **Sim, qualquer pessoa pode instalar:** o package público é `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2`.
>
> ⚠️ **Limite importante:** este é um Community Node não verificado. O caminho suportado é n8n self-hosted; Community Nodes não verificados não ficam disponíveis no n8n Cloud.

## Resposta rápida

| Pergunta | Resposta |
| --- | --- |
| Posso instalar pelo npm? | Sim, pelo n8n ou pelo mecanismo de ambiente do n8n. |
| Preciso baixar o código-fonte? | Não. Para usar, basta instalar o package público. |
| Preciso de n8n Cloud? | Não. O alvo é self-hosted. |
| Posso começar publicando GTM? | Não. Comece com Read e uma operação somente de leitura. |
| Preciso de OAuth? | Sim. A autorização deve ser feita na tela de credenciais do n8n. |
| Preciso usar Admin? | Não. Use o menor papel capaz de realizar a tarefa. |

## O que este package oferece

| Papel | Para que serve | Postura padrão |
| --- | --- | --- |
| **Read** | Inventário, auditoria, leitura de contas, containers, workspaces, recursos, versões e status | Somente leitura |
| **Editor** | Alterações nomeadas em workspace de draft | Exige confirmação |
| **Publisher** | Preview, criação de versão revisada e publicação de uma versão explícita | Manual e confirmado |
| **Admin** | Administração delimitada de conta/container | Credencial separada e confirmação explícita |

Cada papel possui credencial e escopos OAuth próprios. O package usa uma lista de operações permitidas; ele não oferece um dispatcher HTTP arbitrário.

## O que você precisa antes de começar

- uma instância n8n **self-hosted**;
- permissão Owner ou Admin no n8n para instalar Community Nodes;
- acesso de saída ao `registry.npmjs.org`;
- acesso ao Google Cloud para configurar o OAuth;
- uma conta Google com permissão no account/container GTM desejado;
- staging, backup e rollback antes de instalar em produção.

> 🔒 **Segredos:** client secret, refresh token, access token e senha devem ser digitados somente na tela de credenciais do n8n. Nunca os coloque em workflow, Data Table, Git, screenshot, issue ou chat.

## Instalação pela interface do n8n

Esta é a opção recomendada para a primeira instalação.

### 1. Abra o gerenciador de Community Nodes

No n8n, abra:

```text
Settings → Community Nodes → Install
```

A instalação pela interface exige Owner ou Admin e está disponível em n8n self-hosted.

### 2. Informe o package fixado

Cole exatamente:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2
```

Fixar a versão evita que uma atualização futura altere o comportamento sem revisão.

### 3. Aceite o aviso e instale

Leia o aviso de código comunitário não verificado, confirme a instalação e aguarde o n8n concluir.

Se o n8n solicitar reinício, reinicie somente depois de confirmar que existe uma rota de retorno e que a instância possui backup.

### 4. Confirme os nodes

No editor, pesquise por `Google Tag Manager` e confirme a presença de:

- `Google Tag Manager`;
- `Google Tag Manager Editor`;
- `Google Tag Manager Publisher`;
- `Google Tag Manager Admin`.

Em **Settings → Community Nodes**, confirme a versão `0.5.2`.

## Instalação por Docker ou ambiente

Use esta opção quando a instalação precisa ser reproduzível e administrada pela configuração do deployment.

```dotenv
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES_REGISTRY=https://registry.npmjs.org
N8N_COMMUNITY_PACKAGES=[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.2"}]
```

Depois, recrie ou reinicie os serviços n8n conforme a arquitetura: editor, worker, webhook e runners quando existirem.

> ⚠️ `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true` torna a lista declarativa autoritativa. Packages instalados anteriormente pela UI e ausentes da lista podem ser removidos no startup. Preserve a lista existente antes de habilitar esse modo.

Para controle adicional, use também o checksum SHA-512 publicado no registry. Não use registry npm customizado neste package público.

## Configuração do OAuth no Google

O package usa OAuth2 do Google. Os detalhes visuais podem variar conforme a versão do n8n e a política da organização Google, mas o fluxo seguro é:

1. abra o Google Cloud Console;
2. selecione ou crie um projeto apropriado;
3. configure a tela de consentimento OAuth conforme a política da organização;
4. crie um cliente OAuth para uma aplicação web;
5. abra a credencial no n8n e copie a URL de redirecionamento exibida pelo próprio n8n;
6. cadastre essa URL como redirect URI autorizado no Google Cloud;
7. cole Client ID e Client Secret somente na tela de credenciais do n8n;
8. salve e autorize com a conta Google que realmente possui acesso ao GTM;
9. confirme que o account e o container escolhidos pertencem ao escopo de acesso dessa conta.

O package não recebe tokens por parâmetros de workflow. O n8n deve armazená-los no seu credential store.

## Crie primeiro a credencial Read

Use a credencial:

```text
Google Tag Manager OAuth2 API - Read Only
```

Escopo principal:

```text
https://www.googleapis.com/auth/tagmanager.readonly
```

Faça um workflow manual e execute uma leitura de contas, containers ou status. O primeiro objetivo é provar três coisas:

1. o package está carregado;
2. o OAuth funciona;
3. a conta Google possui acesso ao GTM correto.

Um erro `403` normalmente indica uma permissão GTM insuficiente, mesmo quando o OAuth foi autorizado com sucesso.

## Ordem segura para os outros papéis

### Editor

Use:

```text
Google Tag Manager OAuth2 API - Editor
```

Escopos principais:

```text
tagmanager.readonly
tagmanager.edit.containers
```

Use somente para mudanças nomeadas em um workspace de draft. Revise account ID, container ID, workspace ID, recurso, payload e resultado antes de confirmar.

### Publisher

Use:

```text
Google Tag Manager OAuth2 API - Publisher
```

Escopos principais:

```text
tagmanager.readonly
tagmanager.edit.containerversions
tagmanager.publish
```

O fluxo deve ser:

```text
ler estado → revisar workspace → preview → criar versão explícita → revisar versão → publicar explicitamente
```

> ⚠️ **Create Version não é preview:** ele cria uma versão real, consome o workspace de origem no GTM e retorna um novo workspace. Só execute depois de revisar fingerprint, IDs, nome e impacto.
>
> 🔴 **Publicação exige texto literal:** preencha `Confirm Publish = true` e escreva exatamente `PUBLICAR {versionId}`. Exemplo: `PUBLICAR 123456`. `PUBLISH 123456` não é aceito.

Não agende publicação e não use Publisher como ferramenta genérica de IA.

### Admin

Use:

```text
Google Tag Manager OAuth2 API - Admin
```

Escopos principais:

```text
tagmanager.readonly
tagmanager.edit.containers
tagmanager.manage.accounts
```

Admin é para administração delimitada de conta/container. Não deve ser a credencial padrão de um workflow comum.

## O que não fazer

- Não instale primeiro em produção.
- Não use n8n Cloud esperando suporte a este Community Node não verificado.
- Não instale sem backup e sem rollback.
- Não use `latest` em produção; fixe `@0.5.2`.
- Não coloque secrets em campos do workflow, Data Tables, Git, logs ou screenshots.
- Não reutilize a credencial Admin no Publisher.
- Não reutilize a credencial Publisher no Editor.
- Não ative Publisher/Admin automaticamente ou por schedule.
- Não publique uma versão sem revisar o diff, workspace, version ID e destino.
- Não altere um container de produção apenas porque a leitura funcionou.
- Não presuma que um escopo OAuth concede permissões GTM que o usuário não possui.
- Não use API endpoint, método, path ou payload arbitrário: o package não foi desenhado para isso.
- Não habilite gerenciamento por ambiente sem preservar todos os packages já instalados.
- Não compartilhe tokens para pedir ajuda; remova ou redija os valores antes de enviar logs.

## Upgrade, rollback e reinstalação

### Upgrade controlado

1. Faça backup.
2. Instale a nova versão primeiro em staging.
3. Execute o smoke test Read.
4. Compare comportamento e logs.
5. Só então atualize produção.

### Rollback pela UI

1. Abra **Settings → Community Nodes**.
2. Escolha **Options → Uninstall package**.
3. Reinstale a versão anterior fixada.
4. Reinicie se solicitado.
5. Execute novamente o teste Read.

### Rollback por ambiente

Restaure a entrada anterior em `N8N_COMMUNITY_PACKAGES` e recrie somente os serviços n8n afetados. Não remova volumes do PostgreSQL, Redis ou n8n para corrigir uma falha de package.

### Reinstalação limpa de sandbox

A reinstalação limpa pertence ao sandbox, não à produção:

```bash
docker compose down --volumes --remove-orphans
docker compose up -d
```

Use isso somente no projeto e volume dedicados ao sandbox. O comando destrói o SQLite e o estado da instância descartável.

## Troubleshooting rápido

| Sintoma | Causa provável | Ação segura |
| --- | --- | --- |
| Package não aparece | Instância não é self-hosted, instalação desabilitada ou restart pendente | Verifique Community Nodes, política da instância e logs do n8n |
| `404` no package | Registry, versão ou rede incorretos | Use npm oficial e a versão `0.5.2`; não publique novamente a mesma versão |
| `403` no GTM | Usuário Google sem acesso ao account/container | Corrija a permissão no GTM; não amplie escopo automaticamente |
| OAuth não conclui | Redirect URI ou consentimento incorreto | Use a redirect URI mostrada pelo n8n e não envie secrets no chat |
| Node carrega, mas operação falha | IDs, workspace ou payload inválidos | Faça Read, revise IDs e teste em draft |
| Package some após restart | Lista declarativa não contém o package | Preserve e corrija `N8N_COMMUNITY_PACKAGES` |
| n8n não inicia após mudança | Configuração/env inválida | Restaure o env anterior e reinicie somente os serviços n8n |

## Limites de segurança

O package não oferece:

- dispatcher HTTP genérico;
- gestão de usuários/permissões do GTM;
- exclusão de containers;
- publicação automática ou agendada;
- exposição genérica de Admin/Publisher para IA;
- armazenamento de tokens ou payloads secretos em campos do workflow.

Problemas de segurança devem ser reportados conforme [SECURITY.md](SECURITY.md), sem incluir secrets, dados de clientes ou exports reais.

## Referências

- [README principal](README.md)
- [Instalação detalhada](docs/installation.pt-BR.md)
- [Guia em inglês](README.en.md)
- [Arquitetura, ambientes e sandbox](docs/architecture.md)
- [Contrato de permissões](docs/permissions-contract.md)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [Instalação de Community Nodes no n8n](https://docs.n8n.io/integrations/community-nodes/installation/gui-install)
