function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

async function localizarCidade(cidade, uf) {
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

    const chave = Array.from(consultas).sort().join('|').toUpperCase();
    const cache = localizarCidade.cache || (localizarCidade.cache = new Map());
    if (cache.has(chave)) return cache.get(chave);

    for (const consulta of consultas) {
        const nominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=br&q=${encodeURIComponent(consulta)}`;

        try {
            const resposta = await fetch(nominatim, { headers: { 'Accept-Language': 'pt-BR' } });
            if (resposta.ok) {
                const dados = await resposta.json();
                const melhor = selecionarMelhorLocal(dados);
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
            const melhor = selecionarMelhorLocal(features.map(item => ({
                ...item.properties,
                lat: item.geometry?.coordinates?.[1],
                lon: item.geometry?.coordinates?.[0],
                type: item.properties?.osm_value,
                class: item.properties?.osm_key,
                display_name: [item.properties?.name, item.properties?.city, item.properties?.state, item.properties?.country].filter(Boolean).join(', ')
            })));

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
