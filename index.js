let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
let produtosOriginais = [];
let galeriaAtual = [];
let indiceGaleria = 0;
let produtoSelecionadoNoModal = null;

window.onload = () => {
    verificarSessao();
    carregarProdutosLoja();
    atualizarContadorCarrinho();
};

function verificarSessao() {
    const nome = localStorage.getItem('prof_nome');
    const isAdmin = localStorage.getItem('prof_admin') === 'true';
    const authContainer = document.getElementById('header-auth');

    if (nome && authContainer) {
        let btnAdmin = isAdmin ? `<button onclick="location.href='admin.html'" class="bg-purple-600 text-white px-3 py-2 rounded-xl font-bold text-[10px] mr-1">👑 Admin</button>` : '';
        authContainer.innerHTML = `
            <div class="flex items-center gap-2">
                ${btnAdmin}
                <button onclick="location.href='meus-materiais.html'" class="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl font-bold text-[10px]">Meus PDFs</button>
                <span class="text-[10px] font-bold text-gray-600 hidden md:inline">${nome.split(' ')[0]}</span>
                <button onclick="logout()" class="text-lg pl-1 cursor-pointer">🚪</button>
            </div>`;
    }
}

function logout() { localStorage.clear(); location.href = 'index.html'; }

async function carregarProdutosLoja() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
        const dados = await resp.json();
        produtosOriginais = dados; 
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro:", err);
        document.getElementById('vitrine-produtos').innerHTML = "<p class='col-span-full text-center text-red-400'>Erro ao conectar com o servidor.</p>";
    }
}

function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    container.innerHTML = lista.map(p => {
        const nomeLimpo = p.nome.replace(/'/g, "\\'");
        const linkFinal = (p.link_download || "").trim();
        const fotos = [p.imagem_url, p.foto1, p.foto2].filter(f => f && f.trim() !== "");
        const fotosJSON = JSON.stringify(fotos).replace(/"/g, '&quot;');

        return `
            <div class="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full">
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-50 h-40 cursor-pointer group" 
                     onclick="abrirGaleria(${fotosJSON}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')">
                    <img src="${p.imagem_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        🔍 Ver Fotos
                    </div>
                </div>
                <div class="flex flex-col flex-grow text-left">
                    <h3 class="font-bold text-gray-800 text-xs md:text-sm mb-1 line-clamp-2 h-10">${p.nome}</h3>
                    <div class="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                        <span class="text-green-600 font-black text-sm">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                        <button onclick="adicionarAoCarrinho(${p.id}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')" 
                                class="bg-orange-500 text-white px-3 py-2 rounded-xl font-bold text-[10px] uppercase transition-all active:scale-95">
                            Comprar
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// LÓGICA DA GALERIA PREMIUM
function abrirGaleria(fotos, titulo, preco, link) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    atualizarGaleria();
    document.getElementById('modal-galeria').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function mudarFoto(passo) {
    indiceGaleria += passo;
    if (indiceGaleria >= galeriaAtual.length) indiceGaleria = 0;
    if (indiceGaleria < 0) indiceGaleria = galeriaAtual.length - 1;
    atualizarGaleria();
}

function atualizarGaleria() {
    const img = document.getElementById('modal-img');
    img.style.opacity = 0;
    setTimeout(() => {
        img.src = galeriaAtual[indiceGaleria];
        img.style.opacity = 1;
        document.getElementById('caption').innerText = `${produtoSelecionadoNoModal.nome} (${indiceGaleria + 1}/${galeriaAtual.length})`;
    }, 150);
}

function fecharGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// CARRINHO E FILTROS
function adicionarAoCarrinho(id, nome, preco, link) {
    if (!link) return alert("Erro: Link não encontrado.");
    localStorage.setItem('link_pendente', link);
    carrinho = [{ id, nome, preco: parseFloat(preco), link, uid: Date.now() }];
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    window.location.href = 'checkout.html';
}

function filtrarProdutos(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.className = "filter-btn whitespace-nowrap px-6 py-2 bg-white text-gray-600 rounded-full font-bold shadow-sm border border-gray-100 text-sm");
    btn.className = "filter-btn active-filter whitespace-nowrap px-6 py-2 rounded-full font-bold shadow-sm transition-all text-sm bg-orange-500 text-white";
    
    if (cat === 'todos') renderizarProdutos(produtosOriginais);
    else renderizarProdutos(produtosOriginais.filter(p => (p.categoria || "").toLowerCase() === cat.toLowerCase()));
}

function atualizarContadorCarrinho() {
    const c = document.getElementById('cart-count');
    if (c) c.innerText = carrinho.length;
}

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
    if (document.getElementById('modal-galeria').style.display === 'flex') {
        if (e.key === 'Escape') fecharGaleria();
        if (e.key === 'ArrowRight') mudarFoto(1);
        if (e.key === 'ArrowLeft') mudarFoto(-1);
    }
});