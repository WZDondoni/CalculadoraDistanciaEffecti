async function processarEffecti(bases) {
    const titulos = Array.from(document.querySelectorAll('h2'));

    for (const tituloEl of titulos) {
        if (tituloEl.querySelector?.('.dist-marker')) continue;
        if (tituloEl.classList?.contains('dist-marker')) continue;

        const texto = tituloEl.innerText.trim();
        if (!texto) continue;

        const detalhes = (tituloEl.parentElement?.parentElement || tituloEl.parentElement)?.innerText || '';
        const estadoMatch = detalhes.match(/Estado:\s*([A-Z]{2})/i);
        const limpo = texto.replace(/\s+/g, ' ').trim();
        const anotacao = limpo.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim() || '';
        const cidadeAnotada = anotacao.replace(/[-/]\s*[A-Z]{2}$/i, '').trim();
        const partes = (cidadeAnotada || limpo).split('/').map(parte => parte.trim()).filter(Boolean);
        const ufTitulo = anotacao.match(/[-/]\s*([A-Z]{2})$/i)?.[1]?.toUpperCase()
            || partes.at(-1)?.match(/^[A-Z]{2}$/i)?.[0]?.toUpperCase()
            || '';

        const uf = estadoMatch?.[1]?.toUpperCase() || ufTitulo;
        let cidade = ufTitulo && partes.length > 1 ? partes.at(-2) : limpo;

        cidade = cidade
            .replace(/^.*PREFEITURA MUNICIPAL DE\s+/g, '')
            .replace(/^MUNIC[ÍI]PIO DE\s+/g, '')
            .trim();

        if (cidadeAnotada) cidade = cidadeAnotada;
        if (!cidade || !uf) continue;

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
