async function processarPortalCompras(bases) {
    const municipioEl = [...document.querySelectorAll('button')]
        .find(el => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return /^Prefeitura Municipal de\s+.+$/i.test(text) && text.length < 120 && !el.querySelector?.('.dist-marker');
        });

    if (!municipioEl) return;

    const cidadeBase = (municipioEl.textContent || '')
        .replace(/^Prefeitura Municipal de\s+/i, '')
        .replace(/\s*[-|].*$/, '')
        .trim();

    const ufMatch = location.pathname.match(/\/(ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)\b/i)?.[1]?.toUpperCase() || '';

    if (!cidadeBase || !ufMatch) return;
    if (municipioEl.parentElement?.querySelector('.dist-marker')) return;

    const portalContainer = document.createElement('div');
    portalContainer.className = 'dist-marker';
    portalContainer.style.cssText = 'display: block; margin-top: 6px; padding: 6px 8px; border-left: 3px solid #0056b3; background: #f3f7ff; border-radius: 4px; color: #1b3d6d; font-size: 12px; font-weight: 700; line-height: 1.4; width: fit-content;';

    const labelDist = document.createElement('div');
    labelDist.style.cssText = 'display: block;';
    labelDist.innerText = ' ⏳ calculando...';
    portalContainer.appendChild(labelDist);
    municipioEl.parentElement?.insertBefore(portalContainer, municipioEl.nextSibling);

    try {
        const local = await localizarCidade(cidadeBase, ufMatch);
        if (local) {
            const linkMapa = document.createElement('a');
            linkMapa.href = `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lon}#map=16/${local.lat}/${local.lon}`;
            linkMapa.target = '_blank';
            linkMapa.rel = 'noopener noreferrer';
            linkMapa.title = `Abrir local encontrado: ${cidadeBase}, ${ufMatch}`;
            linkMapa.innerText = ' 🗺️';
            linkMapa.style.cssText = 'font-size: 16px; text-decoration: none; margin-left: 6px; vertical-align: middle;';
            portalContainer.appendChild(linkMapa);

            const distancias = bases.map(b => ({
                d: calcularDistanciaKm(local.lat, local.lon, b.lat, b.lon),
                n: b.nome
            }));

            const maisPerto = distancias.reduce((menor, atual) => atual.d < menor.d ? atual : menor);
            const resumo = distancias.map(item => `${item.d.toFixed(0)} km de ${item.n}`).join(' | ');
            labelDist.innerText = `📍 ${resumo} | mais próxima: ${maisPerto.n}`;
            labelDist.style.color = '#0056b3';
        } else {
            labelDist.innerText = `📍 Local não encontrado (${ufMatch})`;
        }
    } catch (e) {
        labelDist.innerText = '📍 Não foi possível calcular agora';
    }
}
