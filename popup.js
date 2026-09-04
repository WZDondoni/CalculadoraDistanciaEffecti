let map, markers = [], cidades = [];

// Ajuste dos ícones do Leaflet para Extensões
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: chrome.runtime.getURL('lib/images/marker-icon-2x.png'),
    iconUrl: chrome.runtime.getURL('lib/images/marker-icon.png'),
    shadowUrl: chrome.runtime.getURL('lib/images/marker-shadow.png'),
});

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([-15.78, -47.93], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    chrome.storage.local.get(['cidadesReferencia'], (res) => {
        if (res.cidadesReferencia) { cidades = res.cidadesReferencia; render(); }
    });

    // Busca
    const input = document.getElementById('searchInput');
    const resDiv = document.getElementById('results');
    input.addEventListener('input', async () => {
        if (input.value.length < 3) { resDiv.style.display = 'none'; return; }
        const data = await buscarCidades(input.value);
        resDiv.innerHTML = "";
        if (data.length > 0) {
            resDiv.style.display = 'block';
            data.forEach(d => {
                const item = document.createElement('div');
                item.className = 'res-item';
                item.innerText = d.display_name;
                item.onclick = () => {
                    const lat = parseFloat(d.lat), lon = parseFloat(d.lon);
                    map.setView([lat, lon], 12);
                    resDiv.style.display = 'none';
                    input.value = "";
                    add(d.display_name.split(',')[0], lat, lon);
                };
                resDiv.appendChild(item);
            });
        }
    });

    map.on('click', e => add("Nova Base", e.latlng.lat, e.latlng.lng));

    document.getElementById('btnCalc').addEventListener('click', calcularNaAba);
});

async function buscarCidades(termo) {
    const consulta = `${termo}, Brasil`;
    try {
        const resposta = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(consulta)}`, {
            headers: { 'Accept-Language': 'pt-BR' }
        });
        if (resposta.ok) {
            const dados = await resposta.json();
            const resultados = (dados.features || []).map(item => ({
                display_name: [item.properties?.name, item.properties?.state, item.properties?.country]
                    .filter(Boolean).join(', '),
                lat: item.geometry.coordinates[1],
                lon: item.geometry.coordinates[0]
            }));
            if (resultados.length > 0) return resultados;
        }
    } catch (e) {
        // Tenta o Nominatim abaixo.
    }

    try {
        const resposta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(consulta)}&countrycodes=br`, {
            headers: { 'Accept-Language': 'pt-BR' }
        });
        return resposta.ok ? await resposta.json() : [];
    } catch (e) {
        return [];
    }
}

async function calcularNaAba() {
    const button = document.getElementById('btnCalc');
    const status = document.getElementById('status');
    button.disabled = true;
    status.textContent = 'Calculando...';

    try {
        const storage = await chrome.storage.local.get(['cidadesReferencia']);
        if (!storage.cidadesReferencia?.length) {
            status.textContent = 'Cadastre pelo menos uma cidade antes de calcular.';
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url?.includes('effecti.com.br')) {
            throw new Error('Abra um aviso da Effecti na aba ativa.');
        }

        try {
            await chrome.tabs.sendMessage(tab.id, { action: "CALCULAR" });
        } catch (error) {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            await chrome.tabs.sendMessage(tab.id, { action: "CALCULAR" });
        }
        status.textContent = 'Cálculo iniciado na página.';
    } catch (error) {
        status.textContent = error.message || 'Não foi possível calcular.';
    } finally {
        button.disabled = false;
    }
}

function add(n, lat, lon) {
    const nome = prompt("Nome da base:", n);
    if (nome) {
        cidades.push({ nome, lat, lon });
        chrome.storage.local.set({ cidadesReferencia: cidades }, render);
    }
}

function render() {
    const list = document.getElementById('cityList');
    list.innerHTML = "";
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    cidades.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'city-item';
        div.innerHTML = `<span>${c.nome}</span>`;
        const btn = document.createElement('button');
        btn.className = 'btn-del'; btn.innerText = "X";
        btn.onclick = () => { cidades.splice(i, 1); chrome.storage.local.set({ cidadesReferencia: cidades }, render); };
        div.appendChild(btn);
        list.appendChild(div);
        markers.push(L.marker([c.lat, c.lon]).addTo(map).bindPopup(c.nome));
    });
}