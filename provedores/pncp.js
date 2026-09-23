async function processarPncp(bases) {
    const paragrafoMunicipio = [...document.querySelectorAll('p, div, span')]
        .find(el => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return /^Órgão\/Entidade:\s*.+$/i.test(text) && text.length < 220;
        });

    const paragrafoLocalidade = [...document.querySelectorAll('p, div, span')]
        .find(el => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return /^Localidade da Unidade:\s*.+$/i.test(text) && text.length < 220;
        });

    if ((!paragrafoMunicipio && !paragrafoLocalidade) || (paragrafoMunicipio && paragrafoMunicipio.parentElement?.querySelector('.dist-marker')) || (paragrafoLocalidade && paragrafoLocalidade.parentElement?.querySelector('.dist-marker'))) return;

    const localidadeTexto = (paragrafoLocalidade?.textContent || '').replace(/\s+/g, ' ').trim();
    const entidadeTexto = (paragrafoMunicipio?.textContent || '').replace(/\s+/g, ' ').trim();

    const localidade = localidadeTexto.replace(/^Localidade da Unidade:\s*/i, '').trim();
    const entidade = entidadeTexto.replace(/^Órgão\/Entidade:\s*/i, '').trim();

    const localReferencia = localidade || entidade;
    if (!localReferencia) return;

    const cidadeBase = localReferencia
        .replace(/\s*\/\s*[A-Z]{2}\s*$/i, '')
        .replace(/^\d+[\.,\d\s/-]*\s*[-]\s*/i, '')
        .replace(/\s*[-|].*$/, '')
        .trim();

    const ufMatch = (localReferencia.match(/\b(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)\b/i)?.[1] || '').toUpperCase();
    if (!cidadeBase || !ufMatch) return;

    const container = document.createElement('div');
    container.className = 'dist-marker';
    container.style.cssText = 'display: block; margin-top: 6px; padding: 6px 8px; border-left: 3px solid #0056b3; background: #f3f7ff; border-radius: 4px; color: #1b3d6d; font-size: 12px; font-weight: 700; line-height: 1.4; width: fit-content;';

    const targetEl = paragrafoLocalidade || paragrafoMunicipio;
    const labelDist = document.createElement('div');
    labelDist.style.cssText = 'display: block;';
    labelDist.innerText = ' ⏳ calculando...';
    container.appendChild(labelDist);
    targetEl.parentElement?.insertBefore(container, targetEl.nextSibling);

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
                n: base.nome,
                lat: base.lat,
                lon: base.lon
            }));

            const maisPerto = distancias.reduce((menor, atual) => atual.d < menor.d ? atual : menor);
            const resumo = distancias.map(item => `${item.d.toFixed(0)} km de ${item.n}`).join(' | ');
            labelDist.innerText = `📍 Distância geodésica estimada: ${resumo} | mais próxima: ${maisPerto.n}`;
            labelDist.style.color = '#0056b3';

            const rotaUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${local.lat},${local.lon};${maisPerto.lat},${maisPerto.lon}`;
            linkMapa.href = rotaUrl;
            linkMapa.title = `Rota: ${cidadeBase}, ${ufMatch} → ${maisPerto.n}`;
        } else {
            labelDist.innerText = `📍 Local não encontrado (${ufMatch})`;
        }
    } catch (e) {
        labelDist.innerText = '📍 Não foi possível calcular agora';
    }
}
