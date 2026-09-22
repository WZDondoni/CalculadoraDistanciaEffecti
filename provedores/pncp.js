async function processarPncp(bases) {
    const paragrafoMunicipio = [...document.querySelectorAll('p, div, span')]
        .find(el => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return /^Órgão\/Entidade:\s*.+$/i.test(text) && text.length < 220;
        });

    if (!paragrafoMunicipio || paragrafoMunicipio.parentElement?.querySelector('.dist-marker')) return;

    const texto = (paragrafoMunicipio.textContent || '').replace(/\s+/g, ' ').trim();
    const municipio = texto.replace(/^Órgão\/Entidade:\s*/i, '').trim();
    if (!municipio) return;

    const cidadeBase = municipio
        .replace(/^\d+[\.,\d\s/-]*\s*[-]\s*/i, '')
        .replace(/\s*[-|].*$/, '')
        .trim();

    const ufMatch = municipio.match(/\b([A-Z]{2})\b/)?.[1]?.toUpperCase() || '';
    if (!cidadeBase || !ufMatch) return;

    const container = document.createElement('div');
    container.className = 'dist-marker';
    container.style.cssText = 'display: block; margin-top: 6px; padding: 6px 8px; border-left: 3px solid #0056b3; background: #f3f7ff; border-radius: 4px; color: #1b3d6d; font-size: 12px; font-weight: 700; line-height: 1.4; width: fit-content;';

    const labelDist = document.createElement('div');
    labelDist.style.cssText = 'display: block;';
    labelDist.innerText = ' ⏳ calculando...';
    container.appendChild(labelDist);
    paragrafoMunicipio.parentElement?.insertBefore(container, paragrafoMunicipio.nextSibling);

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
            container.appendChild(linkMapa);

            const distancias = bases.map(base => ({
                d: calcularDistanciaKm(local.lat, local.lon, base.lat, base.lon),
                n: base.nome
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
