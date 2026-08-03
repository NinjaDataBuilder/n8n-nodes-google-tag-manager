# Instalação e operação — Português do Brasil

Este documento é a referência detalhada para instalar o pacote no n8n self-hosted.

## Antes de instalar

- confirme que a instância é self-hosted;
- confirme que você é Owner/Admin;
- faça backup da instância n8n;
- escolha uma versão fixa do pacote;
- instale primeiro em staging;
- confirme que `N8N_COMMUNITY_PACKAGES_ENABLED=true`;
- habilite `N8N_UNVERIFIED_PACKAGES_ENABLED=true` apenas se a política da sua instância exigir isso para pacotes ainda não verificados.

## Instalação pela UI

Use **Settings → Community Nodes → Install** e informe:

```text
@ninjadatabuilder/n8n-nodes-google-tag-manager@0.5.2
```

Aceite o aviso de risco, instale e confirme a presença dos quatro nodes. Se a instalação falhar, registre a mensagem do n8n sem copiar tokens ou variáveis secretas.

## Instalação gerenciada por ambiente

Adicione à configuração do n8n:

```bash
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES_ENABLED=true
N8N_UNVERIFIED_PACKAGES_ENABLED=true
N8N_COMMUNITY_PACKAGES='[{"name":"@ninjadatabuilder/n8n-nodes-google-tag-manager","version":"0.5.2"}]'
```

Reinicie os serviços. A lista é reconciliada no startup; pacotes fora da lista podem ser removidos.

## Instalação local por tarball

Para validar uma versão antes do npm:

```bash
npm ci
npm test
npm pack
```

Instale o tarball na estrutura de nodes comunitários do seu n8n conforme a documentação da versão instalada. Prefira a UI ou o gerenciamento por ambiente para instalações reproduzíveis.

## Verificação

1. Pesquise `Google Tag Manager` no editor.
2. Confirme Read, Editor, Publisher e Admin.
3. Crie a credencial Read pela UI.
4. Execute uma leitura de contas/containers.
5. Confira a saída redigida.
6. Só depois crie credenciais de escrita.

## Credenciais

Os valores OAuth devem ser preenchidos apenas na tela de credenciais do n8n. Use uma credencial por papel. Não reutilize a credencial Admin no Publisher nem a credencial Publisher no Editor.

## Rollback

- UI: desinstale o pacote e reinstale a versão anterior.
- Ambiente: retorne `N8N_COMMUNITY_PACKAGES` à versão anterior e reinicie.
- Tarball: restaure o pacote anterior e reinicie os serviços.
- Após rollback, execute novamente o teste Read antes de habilitar workflows de escrita.

## Limitações

O pacote não gerencia usuários GTM, não exclui containers, não publica automaticamente e não expõe dispatcher HTTP genérico. Admin e Publisher exigem workflows nomeados, manuais e confirmação explícita.

## Referências

- [Documentação n8n — GUI installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation)
- [Documentação n8n — environment variable installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/environment-variable-installation)
- [README em português](../README.pt-BR.md)
- [README em inglês](../README.en.md)
