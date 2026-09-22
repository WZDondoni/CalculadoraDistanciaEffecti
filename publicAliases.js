const PUBLIC_ALIASES = {
  positive: [
    'prefeitura',
    'prefeitura municipal',
    'municipio',
    'camara municipal',
    'gabinete',
    'secretaria',
    'orgao',
    'órgão',
    'edificio administrativo',
    'prédio administrativo',
    'administrativa',
    'comando',
    'batalhao',
    'quartel',
    'universidade federal',
    'universidade',
    'campus',
    'instituto federal',
    'corpo de bombeiros',
    'policia',
    'ministerio',
    'agencia',
    'agência',
    'autarquia',
    'câmara municipal',
    'secretaria municipal',
    'setor administrativo',
    'sede administrativa',
    'unidade administrativa'
  ],
  negative: [
    'escola',
    'school',
    'colegio',
    'colégio',
    'ensino',
    'faculdade',
    'faculdade de',
    'shopping',
    'parque',
    'estadio',
    'stadium',
    'academia',
    'hospital',
    'clinica',
    'clínica',
    'mercado',
    'terminal',
    'praça',
    'rodoviaria',
    'rodoviária',
    'aeroporto',
    'porto',
    'shopping center'
  ]
};

function aplicarAliasesPublicos(texto) {
  const normalized = (texto || '').toLowerCase();
  let score = 0;

  for (const alias of PUBLIC_ALIASES.positive) {
    if (normalized.includes(alias)) score += 120;
  }

  for (const alias of PUBLIC_ALIASES.negative) {
    if (normalized.includes(alias)) score -= 150;
  }

  return score;
}
