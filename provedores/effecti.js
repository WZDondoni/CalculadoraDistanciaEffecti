function extrairLocalMaisProximo(bloco, titulo) {
    if (!bloco) return { cidade: '', uf: '' };

    const matches = [...bloco.matchAll(/(?:^|[^A-Za-zÀ-ÿ0-9])(?:Local|Cidade|Municipio|Município)\b\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9' .-]+?)\s*-\s*([A-Z]{2})\b/gi)];
    if (!matches.length) return { cidade: '', uf: '' };

    const indiceTitulo = bloco.indexOf(titulo || '');
    let melhor = null;

    for (const match of matches) {
        const indice = match.index ?? 0;
        const distancia = indiceTitulo >= 0 ? Math.abs(indice - indiceTitulo) : indice;
        if (!melhor || distancia < melhor.distancia) {
            melhor = {
                cidade: (match[1] || '').trim(),
                uf: (match[2] || '').toUpperCase(),
                distancia
            };
        }
    }

    return melhor ? { cidade: melhor.cidade, uf: melhor.uf } : { cidade: '', uf: '' };
}

function extrairLocalDoCard(container) {
    if (!container) return { cidade: '', uf: '' };

    for (const topico of container.querySelectorAll('.topic')) {
        const rotulo = (topico.querySelector('.top')?.innerText || '')
            .replace(/\blocation_on\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!/^Local$/i.test(rotulo)) continue;

        const textoLocal = (topico.querySelector('.bottom')?.innerText || '').replace(/\s+/g, ' ').trim();
        const match = textoLocal.match(/^(.+?)\s*-\s*([A-Z]{2})$/i);
        if (match) return { cidade: match[1].trim(), uf: match[2].toUpperCase() };
    }

    return { cidade: '', uf: '' };
}

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
        if (!texto || texto.length < 3 || /^(aviso|avisos|carteira|dados|entrar|login|conversas|selecionar uma conversa)$/i.test(texto)) continue;

        const container = tituloEl.closest('.bidding-container, [class*="card"], article, li, .item, .notice-item, .MuiCard-root, .MuiPaper-root') || tituloEl.parentElement || document.body;
        const detalhes = (container.innerText || tituloEl.parentElement?.innerText || '').replace(/\s+/g, ' ').trim();

        const limpo = texto.replace(/\s+/g, ' ').trim();
        const anotacao = limpo.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim() || '';
        const anotacaoLocal = anotacao.match(/^(.+?)\s*[-/]\s*([A-Z]{2})$/i);
        const cidadeAnotada = anotacaoLocal?.[1]?.trim() || '';
        const partes = limpo.split('/').map(parte => parte.trim()).filter(Boolean);
        const ufTitulo = anotacaoLocal?.[2]?.toUpperCase()
            || partes.at(-1)?.match(/^[A-Z]{2}$/i)?.[0]?.toUpperCase()
            || '';

        const localMaisProximo = extrairLocalDoCard(container);
        const localEncontrado = localMaisProximo.cidade
            ? localMaisProximo
            : extrairLocalMaisProximo(detalhes, limpo);
        const estadoMatch = detalhes.match(/(?:Estado|UF)\s*[:\-]?\s*([A-Z]{2})/i)?.[1]?.toUpperCase() || '';
        const uf = localEncontrado.uf || estadoMatch || ufTitulo;
        const cidadeLocal = localEncontrado.cidade || '';
        let cidade = cidadeLocal || cidadeAnotada || (ufTitulo && partes.length > 1 ? partes.at(-2) : limpo);

        cidade = cidade
            .replace(/^.*PREFEITURA MUNICIPAL DE\s+/gi, '')
            .replace(/^MUNIC[ÍI]PIO DE\s+/gi, '')
            .replace(/^PREFEITURA DE\s+/gi, '')
            .replace(/^.*?\bCIDADE\s+DE\b\s*/gi, '')
            .trim();

        if (!cidade || !uf) continue;
        if (/^(objeto|servico|serviço|local|cidade|municipio|município|perfil de busca|modalidade|data inicial|data final|orgão|órgão)$/i.test(texto)) continue;
        if (/^(objeto|servico|serviço|local|cidade|municipio|município|perfil de busca|modalidade|data inicial|data final|orgão|órgão)$/i.test(cidade)) continue;

        tituloEl.style.whiteSpace = 'normal';
        tituloEl.style.display = 'block';

        const labelDist = document.createElement('div');
        labelDist.className = 'dist-marker';
        labelDist.style.cssText = 'font-size: 12px; color: #666; font-weight: bold; margin-top: 5px;';
        labelDist.innerText = ' ⏳ calculando...';
        tituloEl.appendChild(labelDist);

        try {
            const local = await localizarCidade(cidade, uf, true);
            if (local) {
                const linkMapa = document.createElement('a');
                linkMapa.href = `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lon}#map=16/${local.lat}/${local.lon}`;
                linkMapa.target = '_blank';
                linkMapa.rel = 'noopener noreferrer';
                linkMapa.title = `Abrir local encontrado: ${cidade}, ${uf}`;
                linkMapa.innerText = ' 🗺️';
                linkMapa.style.cssText = 'font-size: 16px; text-decoration: none; margin-left: 6px;';
                tituloEl.appendChild(linkMapa);

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
                linkMapa.title = `Rota: ${cidade}, ${uf} → ${maisPerto.n}`;
            } else {
                labelDist.innerText = `📍 Local não encontrado (${uf})`;
            }
        } catch (e) {
            labelDist.innerText = '📍 Não foi possível calcular a distância rodoviária agora';
        }

        await new Promise(resolve => setTimeout(resolve, 1200));
    }
}
