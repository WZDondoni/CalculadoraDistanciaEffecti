# Calculadora de Distância para Portais Públicos

Extensão para Chrome que calcula a distância entre uma entidade pública e uma ou mais cidades-base cadastradas pelo usuário. A solução cobre os portais Effecti, Portal de Compras Públicas, Licitar Digital e PNCP.

## Visão geral

A extensão identifica o município ou entidade relevante em cada portal suportado, resolve a geolocalização, calcula a distância via fórmula de Haversine e exibe o resultado diretamente no contexto do processo ou edital.

A arquitetura foi estruturada por portal, com separação de responsabilidades em módulos específicos para reduzir acoplamento e facilitar manutenção.

## Funcionalidades

- cadastro de cidades-base
- busca por município no popup
- renderização do mapa no popup
- cálculo da distância para todas as cidades-base
- indicação da cidade-base mais próxima
- suporte a páginas da Effecti, incluindo o layout autenticado da rota Minha Effecti
- suporte a páginas do Portal de Compras Públicas
- suporte a páginas do Licitar Digital
- suporte a editais/procedimentos do PNCP
- inserção do resultado no ponto correto da página, conforme a estrutura do portal
- identificação de município/entidade por campos canônicos e por aliases públicos
- resolução do município relevante no escopo do card, evitando reutilização de geocodificação entre itens distintos
- validação do nome do município e da UF nos resultados geográficos da Effecti para evitar rotas para locais homônimos ou incorretos
- exibição de distância rodoviária estimada, com seleção da cidade-base mais próxima pela rota de carro e abertura da rota no OpenStreetMap
- padronização da rota em todos os portais suportados, incluindo PNCP, Portal de Compras Públicas e Licitar Digital
- melhoria de legibilidade na impressão do texto de distância, sem comprometer a estrutura do portal
- penalização de falsos positivos como escolas, universidades, hospitais e outros pontos não administrativos
- cache de geolocalização e fallback entre serviços externos

## Requisitos

- Chrome, Edge ou Brave com suporte a Manifest V3
- acesso a um portal suportado
- conexão com a internet para consultas de geocodificação

## Instalação local

1. Extraia o arquivo ZIP em uma pasta local.
2. Abra `chrome://extensions` ou `edge://extensions`.
3. Ative o modo de desenvolvedor.
4. Clique em “Carregar sem compactação”.
5. Selecione a pasta que contém o `manifest.json`.

## Fluxo de uso

1. Abra o popup da extensão.
2. Informe o nome da cidade-base.
3. Confirme o cadastro.
4. Acesse uma página suportada.
5. Execute o cálculo pela ação da extensão.
6. Verifique o resultado exibido ao lado do campo municipal/entidade relevante.
7. Use o ícone de mapa para abrir a localização no OpenStreetMap.

## Mecanismo de cálculo

A extensão extrai a referência de município/entidade do portal, normaliza o valor e tenta localizar as coordenadas por geocodificação. Em seguida, consulta a matriz de rotas de carro do OSRM para estimar a distância pelas estradas entre o município e cada cidade-base, selecionando como mais próxima a base com menor distância rodoviária. O resultado depende da cobertura dos mapas e da disponibilidade do serviço de rotas; não representa necessariamente o trajeto real escolhido pelo motorista.

## Estrutura do projeto

```text
manifest.json        configuração da extensão e permissões
popup.html           UI do popup
popup.js             lógica de cadastro e busca de cidades
content.js           dispatcher por plataforma
utils.js             utilitários compartilhados
publicAliases.js     aliases públicos para priorização de entidade relevante
provedores/          módulos por provedor de dados/portal
effecti.js           movido para provedores/effecti.js
portalCompras.js     movido para provedores/portalCompras.js
licitardigital.js    movido para provedores/licitardigital.js
pncp.js              movido para provedores/pncp.js
lib/                 assets do mapa e Leaflet
README.md            documentação do projeto
LICENSE              licença do projeto
```

## Permissões

- `storage`: persistência local das cidades-base
- `activeTab`: acesso à aba ativa para execução do cálculo
- `scripting`: reinjeção de scripts quando necessário
- `host_permissions` para os portais suportados
- `host_permissions` para os serviços de geocodificação (Nominatim e Photon) e roteamento (OSRM)

## Serviços externos

A extensão utiliza:

- Nominatim/OpenStreetMap para resolução geográfica
- Photon como fallback e suporte à busca no popup
- OSRM para estimativa de distância rodoviária entre o município e as cidades-base
- OpenStreetMap para visualização do ponto no mapa

Esses serviços podem sofrer limitação de taxa ou indisponibilidade temporária. O projeto implementa fallback e cache local de sessão para mitigar esse cenário.

## Privacidade

- as cidades-base são armazenadas localmente no navegador
- consultas de geocodificação são encaminhadas aos serviços externos
- não existe backend próprio para coleta de dados do usuário
- links e identificadores de páginas públicas podem conter dados sensíveis; evitar publicação em repositórios públicos

## Solução de problemas

### Popup sem resultados

- confirme que o texto informado contém ao menos 3 caracteres
- verifique conexão com a internet
- recarregue a extensão em `chrome://extensions`

### Cálculo não executado

- confirme a existência de pelo menos uma cidade-base cadastrada
- valide se a aba ativa corresponde a um portal suportado
- para PNCP e Licitar Digital, aguarde o carregamento completo da página e da entidade/órgão relevante
- recarregue a página e a extensão antes de repetir a ação

### Local não encontrado

- o nome da instituição pode não conter município explícito
- o geocoder pode não resolver a entidade com precisão
- confirme se existe dado de UF/estado no contexto do processo
- em casos de edificações públicas, verifique se o nome inclui termos como prefeitura, comando, batalhão, universidade federal, secretaria ou órgão
- em páginas da Effecti com layout autenticado, a extensão prioriza a cidade e a UF do campo “Local … - UF” e valida ambos no resultado geográfico antes de traçar a rota. Se não houver correspondência, não usa coordenadas de outra cidade; só usa uma cidade anotada no título quando ela vem acompanhada da UF.

### Distância divergente da rota

- a extensão estima distância rodoviária pelo OSRM, e o ícone abre a rota no OpenStreetMap; diferenças pequenas podem ocorrer devido a atualização dos dados ou ao percurso selecionado pelo roteador
- se o serviço OSRM estiver indisponível ou não encontrar uma rota, a extensão informa que não foi possível calcular a distância rodoviária, sem substituí-la por uma distância em linha reta
- em páginas de impressão, o texto gerado pela extensão mantém legibilidade adequada sem prejudicar a formatação original

## Desenvolvimento

A extensão é implementada em JavaScript puro, sem build step. A validação local pode ser executada com:

```powershell
node --check .\popup.js
node --check .\content.js
node --check .\utils.js
node --check .\publicAliases.js
node --check .\provedores\effecti.js
node --check .\provedores\portalCompras.js
node --check .\provedores\licitardigital.js
node --check .\provedores\pncp.js
Get-Content .\manifest.json -Raw | ConvertFrom-Json | Out-Null
```

## Limitações conhecidas

- mudanças de estrutura HTML em qualquer portal suportado podem exigir ajustes dos seletores
- geocodificação depende da qualidade e disponibilidade dos serviços externos
- entidades sem município explícito podem exigir resolução por nome completo ou unidade federativa
- a extensão prioriza pontos públicos relevantes, mas ainda depende da qualidade do dado disponível no portal e do geocoder
- a extensão é distribuída e usada localmente; não há publicação na Chrome Web Store

## Licença

Projeto distribuído sob a licença MIT. Mantenha o arquivo de licença e os avisos de copyright.

```text
Copyright (c) 2026 WATILEY ZANELATO DONDONI
```

## Versão

`2.5`
