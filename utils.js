async function calcularDistanciasRodoviarias(origem, bases) {
    if (!Array.isArray(bases) || bases.length === 0) {
        throw new Error('Nenhuma cidade-base cadastrada.');
    }

    const pontos = [origem, ...bases].map(ponto => {
        const lat = Number(ponto?.lat);
        const lon = Number(ponto?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error('Coordenadas inválidas para calcular a rota.');
        }
        return `${lon},${lat}`;
    });
    const chave = `${pontos[0]};${bases.map((base, index) => `${pontos[index + 1]}|${base.nome}`).join(';')}`;
    const cache = calcularDistanciasRodoviarias.cache || (calcularDistanciasRodoviarias.cache = new Map());
    if (cache.has(chave)) return cache.get(chave);

    const consulta = (async () => {
        const destinations = bases.map((_, index) => index + 1).join(';');
        const url = `https://router.project-osrm.org/table/v1/driving/${pontos.join(';')}?sources=0&destinations=${destinations}&annotations=distance`;
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error(`O serviço de rotas respondeu com HTTP ${resposta.status}.`);

        const dados = await resposta.json();
        const distancias = dados?.distances?.[0];
        if (dados?.code !== 'Ok' || !Array.isArray(distancias)) {
            throw new Error(`O serviço de rotas não retornou distâncias válidas (${dados?.code || 'resposta inválida'}).`);
        }

        const resultados = bases.map((base, index) => ({
            d: Number.isFinite(distancias[index]) ? distancias[index] / 1000 : null,
            n: base.nome,
            lat: base.lat,
            lon: base.lon
        }));
        if (!resultados.some(item => Number.isFinite(item.d))) {
            throw new Error('Não há rotas rodoviárias disponíveis para as cidades-base.');
        }
        return resultados;
    })();

    cache.set(chave, consulta);
    try {
        return await consulta;
    } catch (erro) {
        cache.delete(chave);
        throw erro;
    }
}

function calcularScoreLocal(item) {
    const texto = [
        item?.display_name || '',
        item?.address?.city || '',
        item?.address?.town || '',
        item?.address?.municipality || '',
        item?.address?.state || '',
        item?.properties?.name || '',
        item?.properties?.osm_value || '',
        item?.type || '',
        item?.class || ''
    ].join(' ');

    const tipo = String(item?.type || item?.properties?.osm_value || '').toLowerCase();
    const classe = String(item?.class || item?.properties?.osm_key || '').toLowerCase();
    let score = 0;

    if (['townhall', 'government', 'administrative', 'public_building', 'municipality', 'city', 'village', 'boundary'].includes(tipo)) score += 100;
    if (['boundary', 'place', 'amenity'].includes(classe)) score += 40;

    score += aplicarAliasesPublicos(texto);

    if (['school', 'college', 'hospital', 'clinic', 'park', 'stadium'].includes(tipo)) score -= 200;

    return score;
}

function selecionarMelhorLocal(resultados) {
    if (!Array.isArray(resultados) || resultados.length === 0) return null;
    return resultados.reduce((melhor, atual) => {
        const scoreAtual = calcularScoreLocal(atual);
        const scoreMelhor = calcularScoreLocal(melhor);
        return scoreAtual > scoreMelhor ? atual : melhor;
    }, resultados[0]);
}

const ESTADOS_POR_UF = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia',
    CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
    MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
    PA: 'Para', PB: 'Paraiba', PR: 'Parana', PE: 'Pernambuco', PI: 'Piaui',
    RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
    RO: 'Rondonia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'Sao Paulo',
    SE: 'Sergipe', TO: 'Tocantins'
};

function normalizarNomeGeografico(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function correspondeCidadeUf(item, cidade, uf) {
    const address = item?.address || {};
    const properties = item?.properties || item || {};
    const camposLocalidade = [
        address.city,
        address.town,
        address.village,
        address.municipality,
        properties.city,
        properties.town,
        properties.municipality
    ];
    const nomesCidade = [
        item?.name,
        properties.name
    ].map(normalizarNomeGeografico);
    const cidadeNormalizada = normalizarNomeGeografico(cidade);
    const tipo = String(item?.type || properties.type || properties.osm_value || '').toLowerCase();
    const tipoMunicipal = ['administrative', 'municipality', 'city', 'town', 'village'].includes(tipo);
    if (!tipoMunicipal) return false;

    const correspondeLocalidade = camposLocalidade
        .map(normalizarNomeGeografico)
        .includes(cidadeNormalizada);
    const correspondeNomeAdministrativo = nomesCidade.includes(cidadeNormalizada);
    if (!correspondeLocalidade && !correspondeNomeAdministrativo) return false;

    const estadoEsperado = normalizarNomeGeografico(ESTADOS_POR_UF[uf] || uf);
    const estadoEncontrado = normalizarNomeGeografico(
        address.state || properties.state || item?.state
    );
    const codigoEstado = address['ISO3166-2-lvl4'] || properties['ISO3166-2-lvl4'] || '';

    return estadoEncontrado === estadoEsperado || codigoEstado.toUpperCase().endsWith(`-${uf}`);
}

async function localizarCidade(cidade, uf, exigirCorrespondencia = false) {
    const base = (cidade || '').trim();
    if (!base) return null;

    const consultas = new Set();
    const cidadeNormalizada = base
        .replace(/^prefeitura\s+municipal\s+de\s+/i, '')
        .replace(/^municipio\s+de\s+/i, '')
        .replace(/^prefeitura\s+de\s+/i, '')
        .trim();

    const sufixo = uf ? `, ${uf}, Brasil` : ', Brasil';
    consultas.add(`${cidadeNormalizada}${sufixo}`);
    consultas.add(`Municipio de ${cidadeNormalizada}${sufixo}`);
    consultas.add(`Prefeitura Municipal de ${cidadeNormalizada}${sufixo}`);
    consultas.add(`Prefeitura de ${cidadeNormalizada}${sufixo}`);

    const chave = `${Array.from(consultas).sort().join('|').toUpperCase()}|${exigirCorrespondencia ? 'STRICT' : 'FLEXIBLE'}`;
    const cache = localizarCidade.cache || (localizarCidade.cache = new Map());
    if (cache.has(chave)) return cache.get(chave);

    for (const consulta of consultas) {
        const nominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(consulta)}`;

        try {
            const resposta = await fetch(nominatim, { headers: { 'Accept-Language': 'pt-BR' } });
            if (resposta.ok) {
                const dados = await resposta.json();
                const candidatos = exigirCorrespondencia
                    ? dados.filter(item => correspondeCidadeUf(item, cidadeNormalizada, uf))
                    : dados;
                const melhor = selecionarMelhorLocal(candidatos);
                if (melhor) {
                    const local = { lat: parseFloat(melhor.lat), lon: parseFloat(melhor.lon) };
                    cache.set(chave, local);
                    return local;
                }
            }
        } catch (e) {
            continue;
        }
    }

    for (const consulta of consultas) {
        const photon = `https://photon.komoot.io/api/?limit=10&q=${encodeURIComponent(consulta)}`;
        try {
            const resposta = await fetch(photon, { headers: { 'Accept-Language': 'pt-BR' } });
            if (!resposta.ok) continue;
            const dados = await resposta.json();
            const features = dados.features || [];
            const resultados = features.map(item => ({
                ...item.properties,
                lat: item.geometry?.coordinates?.[1],
                lon: item.geometry?.coordinates?.[0],
                type: item.properties?.osm_value,
                class: item.properties?.osm_key,
                display_name: [item.properties?.name, item.properties?.city, item.properties?.state, item.properties?.country].filter(Boolean).join(', ')
            }));
            const candidatos = exigirCorrespondencia
                ? resultados.filter(item => correspondeCidadeUf(item, cidadeNormalizada, uf))
                : resultados;
            const melhor = selecionarMelhorLocal(candidatos);

            if (melhor && Number.isFinite(melhor.lat) && Number.isFinite(melhor.lon)) {
                const local = { lat: parseFloat(melhor.lat), lon: parseFloat(melhor.lon) };
                cache.set(chave, local);
                return local;
            }
        } catch (e) {
            continue;
        }
    }

    cache.set(chave, null);
    return null;
}
