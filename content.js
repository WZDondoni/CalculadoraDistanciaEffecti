async function iniciarCalculo(recalcular = false) {
    if (recalcular) {
        document.querySelectorAll('.dist-marker').forEach(marker => marker.remove());
    }

    const res = await chrome.storage.local.get(['cidadesReferencia']);
    const bases = res.cidadesReferencia || [];
    if (bases.length === 0) return;

    function dist(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    const localizar = async (cidade, uf) => {
        const consulta = `${cidade}, ${uf}, Brasil`;
        const chave = consulta.toUpperCase();
        const cache = localizar.cache || (localizar.cache = new Map());
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
    };

    const extrairLocal = (titulo, ufDetalhes) => {
        const limpo = titulo
            .replace(/\s+/g, ' ')
            .trim();
        const anotacao = limpo.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim() || '';
        const cidadeAnotada = anotacao.replace(/[-/]\s*[A-Z]{2}$/i, '').trim();
        const partes = (cidadeAnotada || limpo).split('/').map(parte => parte.trim()).filter(Boolean);
        const ufTitulo = anotacao.match(/[-/]\s*([A-Z]{2})$/i)?.[1]?.toUpperCase()
            || partes.at(-1)?.match(/^[A-Z]{2}$/i)?.[0]?.toUpperCase()
            || '';
        const uf = ufDetalhes || ufTitulo;
        let cidade = ufTitulo && partes.length > 1 ? partes.at(-2) : limpo;

        cidade = cidade
            .replace(/^.*PREFEITURA MUNICIPAL DE\s+/g, '')
            .replace(/^MUNIC[ÍI]PIO DE\s+/g, '')
            .trim();

        if (cidadeAnotada) cidade = cidadeAnotada;

        return { cidade, uf };
    };

    // Cada aviso da página possui um h2 e um bloco de detalhes logo abaixo.
    const titulos = document.querySelectorAll('h2');
    for (const h2 of titulos) {
        if (h2.querySelector('.dist-marker')) continue;

        const texto = h2.innerText.trim().toUpperCase();

        const card = h2.parentElement?.parentElement || h2.parentElement;
        const detalhes = card?.innerText || "";
        const estadoMatch = detalhes.match(/Estado:\s*([A-Z]{2})/i);
        const { cidade, uf } = extrairLocal(texto, estadoMatch?.[1]?.toUpperCase() || '');
        if (!cidade || !uf) continue;

        h2.style.whiteSpace = 'normal';
        h2.style.display = 'block';
        const labelDist = document.createElement('div');
        labelDist.className = "dist-marker";
        labelDist.style.cssText = "font-size: 12px; color: #666; font-weight: bold; margin-top: 5px;";
        labelDist.innerText = " ⏳ calculando...";
        h2.appendChild(labelDist);

        try {
            const local = await localizar(cidade, uf);
            if (local) {
                const linkMapa = document.createElement('a');
                linkMapa.href = `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lon}#map=16/${local.lat}/${local.lon}`;
                linkMapa.target = '_blank';
                linkMapa.rel = 'noopener noreferrer';
                linkMapa.title = `Abrir local encontrado: ${cidade}, ${uf}`;
                linkMapa.innerText = ' 🗺️';
                linkMapa.style.cssText = 'font-size: 16px; text-decoration: none; margin-left: 6px;';
                h2.appendChild(linkMapa);

                const distancias = bases.map(b => {
                    const dVal = dist(local.lat, local.lon, b.lat, b.lon);
                    return { d: dVal, n: b.nome };
                });
                const maisPerto = distancias.reduce((menor, atual) => atual.d < menor.d ? atual : menor);
                const resumo = distancias.map(item => `${item.d.toFixed(0)} km de ${item.n}`).join(' | ');
                labelDist.innerText = `📍 ${resumo} | mais próxima: ${maisPerto.n}`;
                labelDist.style.color = "#0056b3";
            } else labelDist.innerText = `📍 Local não encontrado (${uf})`;
        } catch (e) {
            labelDist.innerText = "📍 Não foi possível calcular agora";
        }
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
}

// Escuta o comando do popup
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "CALCULAR") iniciarCalculo(true);
});

// Auto-execução após 4 segundos (tempo do dashboard carregar)
setTimeout(iniciarCalculo, 4000);
new MutationObserver(() => iniciarCalculo()).observe(document.body, { childList: true, subtree: true });