# NinjaDataBuilder Google Tag Manager para n8n

Nodes delimitados da API v2 do Google Tag Manager e credenciais OAuth separadas por função para n8n self-hosted.

> **Status da distribuição pública:** o repositório está sendo preparado para publicação. O pacote ainda não foi publicado no npm. Após a publicação, o nome do pacote será `@ninjadatabuilder/n8n-nodes-google-tag-manager`.

## 1. O que você precisa

- uma instância **self-hosted** do n8n;
- permissão de Owner ou Admin no n8n para instalar community nodes;
- community packages habilitados na instância;
- acesso ao Google Cloud para criar/autorizar o OAuth do GTM;
- backup ou procedimento de rollback antes de instalar em produção.

Nodes comunitários não verificados não estão disponíveis no n8n Cloud. A referência deste projeto foi validada no n8n `2.32.5`; valide primeiro em staging.

## 2. Instalação pela interface do n8n

Depois que a primeira versão pública estiver no npm:

1. Abra **Settings → Community Nodes**.
2. Selecione **Install**.
3. Informe `@ninjadatabuilder/n8n-nodes-google-tag-manager`.
4. Para fixar uma versão, use, por exemplo, `@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2`.
5. Leia e aceite o aviso de risco de código comunitário não verificado.
6. Selecione **Install**.
7. Aguarde o n8n concluir a instalação e confirme que os nodes aparecem no editor.

A instalação pela interface exige Owner ou Admin e funciona em n8n self-hosted.

## 3. Instalação por ambiente/Docker

Para instâncias gerenciadas por configuração, o n8n pode reconciliar os pacotes no startup:

```bash
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES='[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.2"}]'
```

Depois, reinicie editor, worker e webhook conforme sua arquitetura.

> Ao habilitar `N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true`, o n8n remove pacotes comunitários que não estejam na lista. Preserve todos os pacotes existentes antes de ativar esse modo.

Para ambientes de maior controle, prefira fixar a versão e, quando aplicável, o checksum SHA-512 do tarball.

## 4. Verificação pós-instalação

No n8n:

1. Crie um workflow manual.
2. Pesquise por **Google Tag Manager**.
3. Confirme a presença dos nodes Read, Editor, Publisher e Admin.
4. Abra **Settings → Community Nodes** e confirme a versão instalada.
5. Execute primeiro uma operação somente de leitura.
6. Verifique que a saída é resumida e não contém configuração GTM completa.

Não considere a instalação validada apenas porque o pacote apareceu na lista: faça uma execução controlada com uma credencial de teste.

## 5. Credenciais e escopos

Crie credenciais separadas na UI do n8n. Nunca coloque client secret, refresh token, senha ou token em chat, workflow, Data Table, código-fonte ou Git.

| Função | Credencial | Escopos principais |
| --- | --- | --- |
| Read | `Google Tag Manager OAuth2 API` | `tagmanager.readonly` |
| Editor | `Google Tag Manager OAuth2 API - Editor` | `tagmanager.readonly`, `tagmanager.edit.containers` |
| Publisher | `Google Tag Manager OAuth2 API - Publisher` | `tagmanager.readonly`, `tagmanager.edit.containerversions`, `tagmanager.publish` |
| Admin | `Google Tag Manager OAuth2 API - Admin` | `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts` |

O pacote não transforma um escopo OAuth em autorização para todas as operações da API. Cada node possui uma allow-list própria.

## 6. Ordem recomendada de adoção

1. Read: inventário e auditoria.
2. Editor: alterações nomeadas em workspace de draft, sempre com confirmação.
3. Publisher: preview, criação de versão e publicação explícita.
4. Admin: criação/atualização de conta ou container somente após revisão do alvo.

Mantenha workflows de escrita manuais e inativos até a revisão do payload. Não use Admin ou Publisher como ferramenta genérica de IA.

## 7. Atualização, downgrade e desinstalação

- Faça backup antes de atualizar.
- Fixe a versão em produção.
- Para downgrade, desinstale a versão atual e reinstale a versão anterior.
- Para desinstalar pela UI: **Settings → Community Nodes → Options → Uninstall package**.
- Em Docker, restaure o pacote anterior na variável `N8N_COMMUNITY_PACKAGES` e reinicie.
- Após qualquer mudança, execute o smoke test Read antes de reabrir workflows de escrita.

## 8. Desenvolvimento local

```bash
git clone https://github.com/NinjaDataBuilder/n8n-nodes-google-tag-manager.git
cd n8n-nodes-google-tag-manager
npm ci
npm test
npm audit --omit=dev
npm pack --dry-run
```

O tarball deve ser instalado primeiro em staging. Não instale diretamente em uma instância de produção sem backup e rollback.

## 9. Limites de segurança

O pacote não oferece:

- dispatcher HTTP genérico;
- gestão de usuários/permissões do GTM;
- exclusão de containers;
- publicação automática ou agendada;
- exposição dos nodes Admin/Publisher como ferramenta genérica de IA;
- armazenamento de tokens ou payloads secretos em campos do workflow.

Problemas de segurança devem ser reportados conforme [SECURITY.md](SECURITY.md), sem incluir segredos ou dados de clientes.

## Links

- [Guia de instalação detalhado](docs/installation.pt-BR.md)
- [Guia em inglês](README.en.md)
- [Contrato de permissões](docs/permissions-contract.md)
- [Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [Instalação de community nodes no n8n](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation)
