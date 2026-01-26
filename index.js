// Variáveis Globais Unificadas
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

// --- AUTENTICAÇÃO E SESSÃO ---
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

// --- CARREGAMENTO DA VITRINE ---
async function carregarProdutosLoja() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
        const dados = await resp.json();
        produtosOriginais = dados; 
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro:", err);
        const vitrine = document.getElementById('vitrine-produtos');
        if(vitrine) vitrine.innerHTML = "<p class='col-span-full text-center text-red-400 font-bold'>Erro ao conectar com o servidor.</p>";
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
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-50 h-40 cursor-pointer group" 
                     onclick="abrirGaleria(${fotosJSON}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')">
                    <img src="${p.imagem_url}" class="w-full h-full object-cover transition-transform group-hover:scale-105">
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

// --- GALERIA DE FOTOS (MOBILE FRIENDLY) ---
function abrirGaleria(fotos, titulo, preco, link) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    const containerIndicadores = document.getElementById('galeria-indicadores');
    if (containerIndicadores) {
        containerIndicadores.innerHTML = fotos.map((_, i) => 
            `<div class="h-1 flex-1 rounded-full bg-gray-200">
                <div id="barrinha-${i}" class="h-full bg-orange-500 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>`
        ).join('');
    }

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
    const title = document.getElementById('modal-titulo-detalhe');
    if (!img) return;

    img.style.opacity = 0;
    setTimeout(() => {
        img.src = galeriaAtual[indiceGaleria];
        img.style.opacity = 1;
        if (title) title.innerText = produtoSelecionadoNoModal.nome;
        
        galeriaAtual.forEach((_, i) => {
            const bar = document.getElementById(`barrinha-${i}`);
            if (bar) bar.style.width = i === indiceGaleria ? '100%' : '0%';
        });
    }, 150);
}

function fecharGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// --- LÓGICA DO CARRINHO ACUMULATIVO ---
function adicionarAoCarrinho(id, nome, preco, link) {
    if (!link) return alert("Erro: Link não disponível.");
    
    // Evita duplicados no carrinho
    if (carrinho.find(item => item.id === id)) {
        alert("Este material já está no seu carrinho! 🛒");
        return;
    }

    carrinho.push({ id, nome, preco: parseFloat(preco), link, uid: Date.now() });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    
    // Feedback visual opcional
    const btn = event.currentTarget;
    if(btn) {
        btn.innerHTML = "✅";
        setTimeout(() => btn.innerHTML = "🛒", 1000);
    }
}

function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    if (contador) contador.innerText = carrinho.length;
}

function toggleCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    const isHidden = modal.style.display === 'none' || modal.style.display === '';
    modal.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) renderCarrinhoLista();
}

function renderCarrinhoLista() {
    const container = document.getElementById('itens-carrinho');
    const totalElem = document.getElementById('total-carrinho');
    let total = 0;

    if (carrinho.length === 0) {
        container.innerHTML = "<p class='text-center text-gray-400 py-8 text-xs'>Carrinho vazio</p>";
        totalElem.innerText = "R$ 0,00";
        return;
    }

    container.innerHTML = carrinho.map(item => {
        total += item.preco;
        return `
            <div class="flex justify-between items-center py-3 border-b border-gray-50 text-left">
                <div class="max-w-[80%]">
                    <p class="text-[11px] font-bold text-gray-700 leading-tight">${item.nome}</p>
                    <p class="text-[10px] text-green-600 font-bold">R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <button onclick="removerItemCarrinho(${item.uid})" class="text-red-400 font-bold px-2">×</button>
            </div>`;
    }).join('');
    totalElem.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removerItemCarrinho(uid) {
    carrinho = carrinho.filter(i => i.uid !== uid);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderCarrinhoLista();
}

// Atalhos de Teclado
document.addEventListener('keydown', (e) => {
    if (document.getElementById('modal-galeria')?.style.display === 'flex') {
        if (e.key === 'Escape') fecharGaleria();
        if (e.key === 'ArrowRight') mudarFoto(1);
        if (e.key === 'ArrowLeft') mudarFoto(-1);
    }
});