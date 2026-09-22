async function iniciarCalculo(recalcular = false) {
    if (recalcular) {
        document.querySelectorAll('.dist-marker').forEach(marker => marker.remove());
    }

    const res = await chrome.storage.local.get(['cidadesReferencia']);
    const bases = res.cidadesReferencia || [];
    if (bases.length === 0) return;

    const site = location.hostname.includes('effecti.com.br')
        ? 'effecti'
        : location.hostname.includes('portaldecompraspublicas.com.br')
            ? 'portal'
            : location.hostname === 'app2.licitardigital.com.br'
                ? 'licitardigital'
                : location.hostname === 'pncp.gov.br'
                    ? 'pncp'
                    : null;

    if (!site) return;

    if (site === 'effecti') {
        await window.processarEffecti(bases);
        return;
    }

    if (site === 'portal') {
        await window.processarPortalCompras(bases);
        return;
    }

    if (site === 'licitardigital') {
        await window.processarLicitarDigital(bases);
        return;
    }

    if (site === 'pncp') {
        await window.processarPncp(bases);
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'CALCULAR') iniciarCalculo(true);
});

setTimeout(iniciarCalculo, 4000);
window.addEventListener('hashchange', () => setTimeout(() => iniciarCalculo(true), 1500));
new MutationObserver(() => iniciarCalculo()).observe(document.body, { childList: true, subtree: true });