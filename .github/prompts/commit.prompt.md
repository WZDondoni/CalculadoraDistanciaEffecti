---
mode: agent
description: 'Resumo das mudanças, revisão do README quando necessário e commit final com mensagem clara e objetiva.'
---

# Prompt: revisão final e commit

Use este prompt quando o usuário pedir para revisar as alterações do projeto, verificar o README, e concluir com commit e push, se solicitado.

## Objetivo

Executar a revisão final do projeto com foco em:
1. listar as mudanças realizadas de forma objetiva;
2. verificar se o README está alinhado com a implementação atual;
3. ajustar o README somente quando houver divergência real;
4. criar uma mensagem de commit clara, profissional e coerente com o que foi alterado;
5. executar commit e, quando solicitado, publicar no remoto.

## Fluxo

1. Verifique o estado atual do repositório com git status e o histórico recente com git log.
2. Identifique os arquivos modificados e resuma o que foi alterado.
3. Compare o que mudou com o conteúdo do README.
4. Atualize o README apenas se houver divergência real.
5. Prepare uma mensagem de commit no padrão adequado:
   - feat: para melhoria funcional
   - fix: para correção
   - docs: para documentação
6. Faça o commit.
7. Se solicitado, execute o push e confirme o resultado.
8. Antes de afirmar sucesso, valide o resultado com o output do git.

## Regras

- Foque em fatos observáveis do código e do git.
- Não invente alterações que não existam.
- Mantenha a mensagem de commit objetiva e representativa.
- Não altere o README sem necessidade.
- Use linguagem profissional e técnica.

## Saída esperada

Ao final, responda com:
- resumo das mudanças realizadas;
- indicação se o README foi ajustado ou já estava consistente;
- mensagem do commit criada;
- confirmação do push, se solicitado.
