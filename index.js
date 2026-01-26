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
            <div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-all">
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-50 h-40 cursor-pointer" 
                     onclick="abrirGaleria(${fotosJSON}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')">
                    <img src="${p.imagem_url}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded-lg">🔍 Ver fotos</div>
                </div>
                <div class="flex flex-col flex-grow text-left">
                    <h3 class="font-bold text-gray-800 text-xs mb-1 line-clamp-2 h-8">${p.nome}</h3>
                    <div class="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                        <span class="text-green-600 font-black text-sm">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                        <button onclick="adicionarAoCarrinho('${p.id}', '${nomeLimpo}', ${p.preco}, '${linkFinal}')" 
                                class="bg-orange-500 text-white p-2 rounded-xl active:scale-90 transition-transform">🛒</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function abrirGaleria(fotos, titulo, preco, link) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };
    document.getElementById('galeria-indicadores').innerHTML = fotos.map((_, i) => 
        `<div class="h-1 flex-1 rounded-full bg-gray-200"><div id="barrinha-${i}" class="h-full bg-orange-500 rounded-full transition-all duration-300" style="width: 0%"></div></div>`
    ).join('');
    atualizarGaleria();
    document.getElementById('modal-galeria').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function mudarFoto(passo) {
    indiceGaleria += (indiceGaleria + passo + galeriaAtual.length) % galeriaAtual.length;
    atualizarGaleria();
}

function atualizarGaleria() {
    const img = document.getElementById('modal-img');
    img.src = galeriaAtual[indiceGaleria];
    document.getElementById('modal-titulo-detalhe').innerText = produtoSelecionadoNoModal.nome;
    galeriaAtual.forEach((_, i) => {
        document.getElementById(`barrinha-${i}`).style.width = i === indiceGaleria ? '100%' : '0%';
    });
}

function fecharGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function adicionarAoCarrinho(id, nome, preco, link) {
    if (carrinho.find(item => item.id === id)) return alert("Item já está no carrinho!");
    carrinho.push({ id, nome, preco: parseFloat(preco), link });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    alert("Adicionado ao carrinho! 🛒");
}

function atualizarContadorCarrinho() {
    const c = document.getElementById('cart-count');
    if (c) c.innerText = carrinho.length;
}

function toggleCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    renderizarItensCarrinho();
}

function renderizarItensCarrinho() {
    const container = document.getElementById('itens-carrinho');
    const totalElem = document.getElementById('total-carrinho');
    let total = 0;
    container.innerHTML = carrinho.map(item => {
        total += item.preco;
        return `<div class="flex justify-between items-center py-2 border-b border-gray-50 text-[11px]">
                    <span class="font-bold text-gray-700">${item.nome}</span>
                    <button onclick="removerItemCarrinho('${item.id}')" class="text-red-500 ml-2">×</button>
                </div>`;
    }).join('');
    totalElem.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removerItemCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderizarItensCarrinho();
}