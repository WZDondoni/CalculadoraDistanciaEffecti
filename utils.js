function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function localizarCidade(cidade, uf) {
    const consulta = `${cidade}, ${uf}, Brasil`;
    const chave = consulta.toUpperCase();
    const cache = localizarCidade.cache || (localizarCidade.cache = new Map());
    if (cache.has(chave)) return cache.get(chave);

    const nominatim = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`;
    const photon = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(consulta)}`;

    try {
        const resposta = await fetch(nominatim, { headers: { 'Accept-Language': 'pt-BR' } });
        if (resposta.ok) {
            const dados = await resposta.json();
            if (dados.length > 0) {
                const local = { lat: parseFloat(dados[0].lat), lon: parseFloat(dados[0].lon) };
                cache.set(chave, local);
                return local;
            }
        }
    } catch (e) {
        // Tenta o segundo serviço abaixo.
    }

    const resposta = await fetch(photon, { headers: { 'Accept-Language': 'pt-BR' } });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const coordenadas = dados.features?.[0]?.geometry?.coordinates;
    if (!coordenadas) return null;

    const local = { lat: parseFloat(coordenadas[1]), lon: parseFloat(coordenadas[0]) };
    cache.set(chave, local);
    return local;
}
