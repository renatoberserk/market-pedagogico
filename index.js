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

async function carregarProdutosLoja() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos?t=' + new Date().getTime());
        produtosOriginais = await resp.json();
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro ao carregar produtos:", err);
    }
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
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[10px]">
                        VER DETALHES
                    </div>
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

function abrirGaleria(fotos, titulo, preco, link, descricao) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    // Preencher Textos com proteção (if)
    const elTitulo = document.getElementById('modal-titulo-detalhe');
    const elDesc = document.getElementById('modal-descricao-detalhe');
    const elIndicadores = document.getElementById('galeria-indicadores');

    if (elTitulo) elTitulo.innerText = titulo;
    if (elDesc) elDesc.innerText = descricao || "Material pedagógico de alta qualidade.";

    // Preencher Indicadores com proteção
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

function adicionarAoCarrinho(id, nome, preco, link) {
    if (carrinho.find(item => item.id === id)) return alert("Já está no carrinho!");
    carrinho.push({ id, nome, preco: parseFloat(preco), link });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    const c = document.getElementById('cart-count');
    if (c) c.innerText = carrinho.length;
    alert("Adicionado! 🛒");
}

function atualizarContadorCarrinho() {
    const c = document.getElementById('cart-count');
    if (c) c.innerText = carrinho.length;
}

function verificarSessao() {
    const nome = localStorage.getItem('prof_nome');
    const authContainer = document.getElementById('header-auth');
    if (nome && authContainer) {
        authContainer.innerHTML = `<button onclick="location.href='meus-materiais.html'" class="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl font-bold text-[10px]">Meus PDFs</button>`;
    }
}