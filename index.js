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

// --- SESSÃO ---
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

// --- CARREGAR LOJA ---
async function carregarProdutosLoja() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos?t=' + new Date().getTime());
        produtosOriginais = await resp.json();
        renderizarProdutos(produtosOriginais);
    } catch (err) { console.error("Erro:", err); }
}

function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;
    container.innerHTML = lista.map(p => {
        const nomeLimpo = p.nome.replace(/'/g, "\\'");
        const descLimpa = (p.descricao || "").replace(/'/g, "\\'").replace(/\n/g, ' ');
        const fotos = [p.imagem_url, p.foto_extra1, p.foto_extra2].filter(f => f && f.trim() !== "");
        const fotosJSON = JSON.stringify(fotos).replace(/"/g, '&quot;');
        
        return `
            <div class="bg-white rounded-[2rem] p-3 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-all group">
                <div class="relative mb-3 overflow-hidden rounded-[1.8rem] bg-gray-50 h-44 cursor-pointer" 
                     onclick="abrirGaleria(${fotosJSON}, '${nomeLimpo}', ${p.preco}, '${p.link_download}', '${descLimpa}')">
                    <img src="${p.imagem_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="flex flex-col flex-grow px-1">
                    <h3 class="font-bold text-gray-800 text-xs mb-1 line-clamp-2 h-8">${p.nome}</h3>
                    <div class="mt-auto pt-2 flex items-center justify-between">
                        <span class="text-green-600 font-black text-sm">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                        <button onclick="adicionarAoCarrinho('${p.id}', '${nomeLimpo}', ${p.preco}, '${p.link_download}')" 
                                class="bg-orange-500 text-white p-2 rounded-xl active:scale-90 transition-transform">🛒</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- GALERIA E DETALHES ---
function abrirGaleria(fotos, titulo, preco, link, descricao) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    const elTitulo = document.getElementById('modal-titulo-detalhe');
    const elDesc = document.getElementById('modal-descricao-detalhe');
    const elIndicadores = document.getElementById('galeria-indicadores');

    if (elTitulo) elTitulo.innerText = titulo;
    if (elDesc) elDesc.innerText = descricao || "Material pedagógico completo.";
    if (elIndicadores) {
        elIndicadores.innerHTML = fotos.map((_, i) => 
            `<div class="h-1 flex-1 rounded-full bg-gray-200"><div id="barrinha-${i}" class="h-full bg-orange-500 rounded-full transition-all duration-300" style="width: 0%"></div></div>`
        ).join('');
    }

    atualizarGaleria();
    const modal = document.getElementById('modal-galeria');
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function atualizarGaleria() {
    const img = document.getElementById('modal-img');
    if (img) img.src = galeriaAtual[indiceGaleria];
    galeriaAtual.forEach((_, i) => {
        const bar = document.getElementById(`barrinha-${i}`);
        if (bar) bar.style.width = i === indiceGaleria ? '100%' : '0%';
    });
}

function mudarFoto(passo) {
    if (galeriaAtual.length === 0) return;
    indiceGaleria = (indiceGaleria + passo + galeriaAtual.length) % galeriaAtual.length;
    atualizarGaleria();
}

function fecharGaleria() {
    const modal = document.getElementById('modal-galeria');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// --- CARRINHO (AQUI ESTÁ O QUE CORRIGE O CLIQUE) ---
function toggleCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    if (!modal) return console.error("Modal do carrinho não encontrado!");
    
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    } else {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        renderizarItensCarrinho();
    }
}

function renderizarItensCarrinho() {
    const container = document.getElementById('itens-carrinho');
    const totalElem = document.getElementById('total-carrinho');
    if (!container || !totalElem) return;

    let total = 0;
    if (carrinho.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-10 text-xs">O seu carrinho está vazio.</p>`;
    } else {
        container.innerHTML = carrinho.map(item => {
            total += item.preco;
            return `
                <div class="flex justify-between items-center py-4 border-b border-gray-50">
                    <div class="flex-grow">
                        <p class="font-bold text-gray-800 text-[11px] leading-tight">${item.nome}</p>
                        <p class="text-green-600 font-bold text-[10px]">R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button onclick="removerItemCarrinho('${item.id}')" class="text-red-400 text-xl px-2">×</button>
                </div>`;
        }).join('');
    }
    totalElem.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function adicionarAoCarrinho(id, nome, preco, link) {
    if (carrinho.find(item => item.id === id)) return alert("Já está no carrinho!");
    carrinho.push({ id, nome, preco: parseFloat(preco), link });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    alert("Adicionado! 🛒");
}

function removerItemCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderizarItensCarrinho();
}

function atualizarContadorCarrinho() {
    const c = document.getElementById('cart-count');
    if (c) c.innerText = carrinho.length;
}