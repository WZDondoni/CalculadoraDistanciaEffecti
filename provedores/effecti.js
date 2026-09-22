async function processarEffecti(bases) {
    const selectors = [
        'h2',
        'h3',
        'h4',
        '[class*="titulo"]',
        '[class*="title"]',
        '[data-testid*="title"]',
        '[data-testid*="titulo"]',
        '[class*="card-title"]',
        '[class*="notice"]'
    ];

    const titulos = Array.from(new Set(selectors.flatMap(sel => [...document.querySelectorAll(sel)])));

    for (const tituloEl of titulos) {
        if (tituloEl.querySelector?.('.dist-marker')) continue;
        if (tituloEl.classList?.contains('dist-marker')) continue;

        const texto = (tituloEl.innerText || '').replace(/\s+/g, ' ').trim();
        if (!texto || texto.length < 3 || /^(aviso|avisos|carteira|dados|entrar|login)$/i.test(texto)) continue;

        const container = tituloEl.closest('[class*="card"], article, li, .item, .notice-item, .MuiCard-root, .MuiPaper-root') || tituloEl.parentElement || document.body;
        const detalhes = (container.innerText || tituloEl.parentElement?.innerText || '').replace(/\s+/g, ' ').trim();

        const estadoMatch = detalhes.match(/(?:Estado|UF)\s*[:\-]?\s*([A-Z]{2})/i)?.[1]?.toUpperCase()
            || detalhes.match(/(?:^|[^A-Za-zÀ-ÿ])(?:Local|Cidade|Municipio|Município)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9' .-]+?)\s*-\s*([A-Z]{2})\b/i)?.[2]?.toUpperCase();
        const limpo = texto.replace(/\s+/g, ' ').trim();
        const anotacao = limpo.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim() || '';
        const cidadeAnotada = anotacao.replace(/[-/]\s*[A-Z]{2}$/i, '').trim();
        const partes = (cidadeAnotada || limpo).split('/').map(parte => parte.trim()).filter(Boolean);
        const ufTitulo = anotacao.match(/[-/]\s*([A-Z]{2})$/i)?.[1]?.toUpperCase()
            || partes.at(-1)?.match(/^[A-Z]{2}$/i)?.[0]?.toUpperCase()
            || '';

        const uf = estadoMatch || ufTitulo;
        const cidadeLocal = detalhes.match(/(?:^|[^A-Za-zÀ-ÿ])(?:Local|Cidade|Municipio|Município)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9' .-]+?)\s*-\s*[A-Z]{2}\b/i)?.[1]?.trim() || '';
        let cidade = ufTitulo && partes.length > 1 ? partes.at(-2) : limpo;

        if (cidadeLocal) {
            cidade = cidadeLocal;
        }

        cidade = cidade
            .replace(/^.*PREFEITURA MUNICIPAL DE\s+/gi, '')
            .replace(/^MUNIC[ÍI]PIO DE\s+/gi, '')
            .replace(/^PREFEITURA DE\s+/gi, '')
            .replace(/^.*?\bCIDADE\s+DE\b\s*/gi, '')
            .trim();

        if (cidadeAnotada) cidade = cidadeAnotada;
        if (!cidade || !uf) continue;
        if (/^(objeto|servico|serviço|local|cidade|municipio|município|perfil de busca|modalidade|data inicial|data final|orgão|órgão)$/i.test(cidade)) continue;

        tituloEl.style.whiteSpace = 'normal';
        tituloEl.style.display = 'block';

        const labelDist = document.createElement('div');
        labelDist.className = 'dist-marker';
        labelDist.style.cssText = 'font-size: 12px; color: #666; font-weight: bold; margin-top: 5px;';
        labelDist.innerText = ' ⏳ calculando...';
        tituloEl.appendChild(labelDist);

        try {
            const local = await localizarCidade(cidade, uf);
            if (local) {
                const linkMapa = document.createElement('a');
                linkMapa.href = `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lon}#map=16/${local.lat}/${local.lon}`;
                linkMapa.target = '_blank';
                linkMapa.rel = 'noopener noreferrer';
                linkMapa.title = `Abrir local encontrado: ${cidade}, ${uf}`;
                linkMapa.innerText = ' 🗺️';
                linkMapa.style.cssText = 'font-size: 16px; text-decoration: none; margin-left: 6px;';
                tituloEl.appendChild(linkMapa);

                const distancias = bases.map(b => ({
                    d: calcularDistanciaKm(local.lat, local.lon, b.lat, b.lon),
                    n: b.nome
                }));

                const maisPerto = distancias.reduce((menor, atual) => atual.d < menor.d ? atual : menor);
                const resumo = distancias.map(item => `${item.d.toFixed(0)} km de ${item.n}`).join(' | ');
                labelDist.innerText = `📍 ${resumo} | mais próxima: ${maisPerto.n}`;
                labelDist.style.color = '#0056b3';
            } else {
                labelDist.innerText = `📍 Local não encontrado (${uf})`;
            }
        } catch (e) {
            labelDist.innerText = '📍 Não foi possível calcular agora';
        }

        await new Promise(resolve => setTimeout(resolve, 1200));
    }
}
