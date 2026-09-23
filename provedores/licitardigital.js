async function processarLicitarDigital(bases) {
    const cabecalho = [...document.querySelectorAll('h1')]
        .find(elemento => /^\s*[^-]+\s*-\s*.+\s*$/i.test((elemento.textContent || '').trim()));

    if (!cabecalho || cabecalho.parentElement?.querySelector('.dist-marker')) return;

    const textoCabecalho = (cabecalho.textContent || '').replace(/\s+/g, ' ').trim();
    const entidade = textoCabecalho.replace(/^[^-]+-\s*/i, '').trim();
    if (!entidade) return;

    const marcador = document.createElement('div');
    marcador.className = 'dist-marker';
    marcador.style.cssText = 'display: block; margin-top: 6px; padding: 6px 8px; border-left: 3px solid #0056b3; background: #f3f7ff; border-radius: 4px; color: #1b3d6d; font-size: 12px; font-weight: 700; line-height: 1.4; width: fit-content;';
    marcador.innerText = '⏳ calculando...';
    cabecalho.parentElement?.appendChild(marcador);

    try {
        const local = await localizarCidade(entidade, '');
        if (!local) {
            marcador.innerText = '📍 Local não encontrado';
            return;
        }

        const linkMapa = document.createElement('a');
        linkMapa.href = `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lon}#map=16/${local.lat}/${local.lon}`;
        linkMapa.target = '_blank';
        linkMapa.rel = 'noopener noreferrer';
        linkMapa.title = `Abrir local encontrado: ${entidade}`;
        linkMapa.innerText = ' 🗺️';
        linkMapa.style.cssText = 'font-size: 16px; text-decoration: none; margin-left: 6px; vertical-align: middle;';
        marcador.appendChild(linkMapa);

        const distancias = bases.map(base => ({
            d: calcularDistanciaKm(local.lat, local.lon, base.lat, base.lon),
            n: base.nome,
            lat: base.lat,
            lon: base.lon
        }));
        const maisPerto = distancias.reduce((menor, atual) => atual.d < menor.d ? atual : menor);
        const resumo = distancias.map(item => `${item.d.toFixed(0)} km de ${item.n}`).join(' | ');
        marcador.firstChild.textContent = `📍 ${resumo} | mais próxima: ${maisPerto.n}`;
        marcador.style.color = '#0056b3';

        const rotaUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${local.lat},${local.lon};${maisPerto.lat},${maisPerto.lon}`;
        linkMapa.href = rotaUrl;
        linkMapa.title = `Rota: ${entidade} → ${maisPerto.n}`;
    } catch (erro) {
        marcador.innerText = '📍 Não foi possível calcular agora';
    }
}
