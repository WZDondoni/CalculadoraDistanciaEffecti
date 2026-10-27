async function processarBllCompras(bases) {
    const paginaTexto = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    if (!paginaTexto) return;

    const regexPromotor = /PROMOTOR\s*[:\-]?\s*([A-ZÀ-Ú0-9 .'-]+?)(?:\s*[-/]\s*([A-Z]{2})\s*)?(?=\s*(?:Nº EDITAL|N° EDITAL|MODALIDADE|FASE|$))/i;
    const matchPromotor = paginaTexto.match(regexPromotor);
    if (!matchPromotor) return;

    let cidadeBase = (matchPromotor[1] || '').trim();
    let ufMatch = (matchPromotor[2] || '').toUpperCase();

    if (!cidadeBase) return;

    cidadeBase = cidadeBase
        .replace(/^MUNIC[ÍI]PIO\s+DE\s+/i, '')
        .replace(/^PREFEITURA\s+MUNICIPAL\s+DE\s+/i, '')
        .replace(/^PREFEITURA\s+DE\s+/i, '')
        .replace(/^MUNICIPIO\s+DE\s+/i, '')
        .trim();

    if (!cidadeBase) return;

    if (!ufMatch) {
        const ufNoTexto = paginaTexto.match(/\b(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)\b/i)?.[1]?.toUpperCase();
        ufMatch = ufNoTexto || '';
    }

    if (!ufMatch) return;

    const alvo = [...document.querySelectorAll('td, div, span, label')]
        .find(el => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return /PROMOTOR/i.test(text) && /MUNICIPIO|MUNICÍPIO|BONITO|DE MINAS/i.test(text) && !el.querySelector?.('.dist-marker');
        });

    if (!alvo || alvo.parentElement?.querySelector('.dist-marker')) return;

    const container = document.createElement('div');
    container.className = 'dist-marker';
    container.style.cssText = 'display: block; margin-top: 6px; padding: 6px 8px; border-left: 3px solid #0056b3; background: #f3f7ff; border-radius: 4px; color: #1b3d6d; font-size: 12px; font-weight: 700; line-height: 1.4; width: fit-content;';

    const labelDist = document.createElement('div');
    labelDist.style.cssText = 'display: block;';
    labelDist.innerText = ' ⏳ calculando...';
    container.appendChild(labelDist);
    alvo.parentElement?.insertBefore(container, alvo.nextSibling);

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

            const distancias = await calcularDistanciasRodoviarias(local, bases);

            const rotasDisponiveis = distancias.filter(item => Number.isFinite(item.d));
            const maisPerto = rotasDisponiveis.reduce((menor, atual) => atual.d < menor.d ? atual : menor);
            const resumo = distancias.map(item => Number.isFinite(item.d)
                ? `${item.d.toFixed(0)} km de ${item.n}`
                : `rota indisponível para ${item.n}`).join(' | ');
            labelDist.innerText = `📍 Distância rodoviária estimada: ${resumo} | mais próxima: ${maisPerto.n}`;
            labelDist.style.color = '#0056b3';

            const rotaUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${local.lat},${local.lon};${maisPerto.lat},${maisPerto.lon}`;
            linkMapa.href = rotaUrl;
            linkMapa.title = `Rota: ${cidadeBase}, ${ufMatch} → ${maisPerto.n}`;
        } else {
            labelDist.innerText = `📍 Local não encontrado (${ufMatch})`;
        }
    } catch (e) {
        labelDist.innerText = '📍 Não foi possível calcular a distância rodoviária agora';
    }
}
