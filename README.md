# Calculadora de Distancias Effecti

Extensao para Google Chrome que calcula a distancia entre os municipios exibidos na Effecti e uma ou mais cidades-base cadastradas pelo usuario.

## Funcionalidades

- Cadastro de uma ou mais cidades-base.
- Pesquisa de cidades por nome.
- Exibicao das cidades cadastradas no mapa.
- Calculo da distancia para todas as cidades-base.
- Indicacao da cidade-base mais proxima.
- Recalculo apos incluir ou remover cidades.
- Identificacao automatica de novos avisos carregados pela pagina da Effecti.

## Requisitos

- Google Chrome com suporte a Manifest V3.
- Acesso a uma pagina da plataforma Effecti.
- Conexao com a internet para consultar coordenadas geograficas.

## Instalacao local

Esta extensao nao precisa ser publicada na Chrome Web Store para ser usada. A instalacao e feita localmente pelo modo de desenvolvedor do Chrome.

### Preparar os arquivos

1. Localize o arquivo `CalculadoraDistanciaEffecti.zip`.
2. Clique nele com o botao direito do mouse.
3. Escolha **Extrair tudo**.
4. Escolha um local facil de encontrar, como a Area de Trabalho.
5. Mantenha a pasta extraida no computador. Nao selecione o arquivo ZIP diretamente no Chrome.

### Carregar no Chrome

1. Abra `chrome://extensions` no Google Chrome.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactacao**.
4. Selecione a pasta extraida que contem diretamente o arquivo `manifest.json`.
5. Confirme que a extensao foi carregada sem erros.

O icone da extensao aparecera na barra do Chrome. Se ele nao aparecer, clique no quebra-cabeca de extensoes e fixe a extensao.

### Atualizar a extensao

Se receber uma nova versao em ZIP:

1. Extraia o novo ZIP em uma nova pasta.
2. Abra `chrome://extensions`.
3. Remova a versao antiga ou clique em **Recarregar** depois de substituir os arquivos.
4. Use a opcao **Carregar sem compactacao** e selecione a nova pasta.

Se os arquivos forem alterados manualmente, basta abrir `chrome://extensions` e clicar em **Recarregar** na extensao.

## Como usar

1. Abra o popup clicando no icone da extensao.
2. Digite pelo menos tres letras no campo de busca.
3. Selecione uma cidade nos resultados.
4. Informe o nome da cidade-base quando solicitado.
5. Repita o processo para adicionar outras cidades.
6. Abra a pagina de avisos da Effecti.
7. Clique em **CALCULAR DISTANCIAS**.
8. Consulte o resultado exibido abaixo de cada municipio.

Exemplo de resultado:

```text
1709 km de Linhares-ES | 1887 km de Guacui-ES | mais proxima: Linhares-ES
```

Para remover uma cidade-base, abra o popup e clique no botao `X` correspondente. O proximo calculo usara somente as cidades que permanecerem cadastradas.

## Funcionamento

A extensao identifica os titulos dos avisos da Effecti, extrai o municipio e o estado, consulta as coordenadas geograficas e calcula a distancia ate cada cidade-base cadastrada.

O calculo usa a formula de Haversine, portanto representa uma distancia geografica aproximada em linha reta. Ele nao representa a distancia ou o tempo de viagem por rodovia.

## Estrutura dos arquivos

```text
manifest.json  Configuracao, permissoes e icones da extensao
popup.html     Interface do popup
popup.js       Busca, cadastro e remocao das cidades-base
content.js     Leitura da pagina Effecti e calculo das distancias
lib/           Leaflet, estilos e imagens do mapa
README.md      Documentacao do projeto
```

## Permissoes

- `storage`: salva as cidades-base no armazenamento local do Chrome.
- `activeTab`: permite atuar na aba ativa quando o usuario solicita o calculo.
- `scripting`: permite reinjetar o script da pagina quando necessario.
- `host_permissions` para Effecti: permite executar a extensao nas paginas da plataforma.
- `host_permissions` para Photon e Nominatim: permitem consultar coordenadas de cidades.

## Servicos externos

A extensao usa servicos de geocodificacao para converter nomes de cidades em coordenadas:

- Photon: servico principal usado para pesquisa e fallback.
- Nominatim/OpenStreetMap: servico alternativo de geocodificacao.
- OpenStreetMap: fornece as imagens do mapa exibido no popup.

Esses servicos podem impor limites de requisicoes ou ficar temporariamente indisponiveis. Por isso, a extensao possui fallback entre Photon e Nominatim e cache durante a sessao da pagina.

## Privacidade

- As cidades-base ficam armazenadas localmente no Chrome.
- Os nomes das cidades pesquisadas sao enviados aos servicos Photon ou Nominatim para obter coordenadas.
- A extensao nao possui servidor proprio nem envia os dados para uma API mantida por este projeto.
- Links de avisos da Effecti podem conter identificadores de acesso. Nao publique esses links em repositorios, documentacao ou chamados de suporte.

## Solucao de problemas

### O popup nao pesquisa cidades

1. Confirme se digitou pelo menos tres letras.
2. Verifique a conexao com a internet.
3. Recarregue a extensao em `chrome://extensions`.
4. Feche e abra novamente o popup.

### O botao nao calcula

1. Confirme que existe pelo menos uma cidade-base cadastrada.
2. Verifique se a aba ativa e uma pagina da Effecti.
3. Atualize a pagina da Effecti.
4. Recarregue a extensao e tente novamente.

### A mensagem informa que o local nao foi encontrado

O servico de geocodificacao pode nao reconhecer o nome informado ou pode estar temporariamente indisponivel. Tente novamente mais tarde ou pesquise a cidade com outro resultado no popup.

### A distancia parece diferente da rota no mapa

Isso e esperado: o calculo usa distancia em linha reta, nao distancia por rodovia.

## Desenvolvimento

Os arquivos usam JavaScript executado diretamente pelo Chrome, sem etapa de compilacao. Para validar alteracoes localmente:

```powershell
node --check .\popup.js
node --check .\content.js
Get-Content .\manifest.json -Raw | ConvertFrom-Json | Out-Null
```

## Limitacoes conhecidas

- Mudancas no layout ou nos seletores HTML da Effecti podem exigir ajustes no `content.js`.
- O resultado depende da disponibilidade e precisao dos servicos de geocodificacao.
- A extensao foi projetada para uso local e ainda nao possui processo de publicacao na Chrome Web Store.

## Versao

Versao atual: `2.1`
