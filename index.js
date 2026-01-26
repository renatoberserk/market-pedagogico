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

// 1. GESTÃO DE SESSÃO
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

// 2. CARREGAMENTO DE DADOS
async function carregarProdutosLoja() {
    try {
        // Adicionando timestamp para evitar cache de produtos antigos
        const resp = await fetch('https://educamateriais.shop/produtos?t=' + new Date().getTime());
        const dados = await resp.json();
        produtosOriginais = dados; 
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro ao carregar loja:", err);
    }
}

// 3. RENDERIZAÇÃO DA VITRINE
function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;
    
    container.innerHTML = lista.map(p => {
        const nomeLimpo = p.nome.replace(/'/g, "\\'");
        const descLimpa = (p.descricao || "").replace(/'/g, "\\'").replace(/\n/g, ' ');
        const linkFinal = (p.link_download || "").trim();
        
        // Mapeando as fotos conforme os nomes novos do banco
        const fotos = [p.imagem_url, p.foto_extra1, p.foto_extra2].filter(f => f && f.trim() !== "");
        const fotosJSON = JSON.stringify(fotos).replace(/"/g, '&quot;');

        return `
            <div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-all group">
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-50 h-44 cursor-pointer" 
                     onclick="abrirGaleria(${fotosJSON}, '${nomeLimpo}', ${p.preco}, '${linkFinal}', '${descLimpa}', '${p.categoria || 'Material'}')">
                    <img src="${p.imagem_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span class="bg-white/90 text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl">Ver detalhes</span>
                    </div>
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

// 4. MODAL DE DETALHES E GALERIA
function abrirGaleria(fotos, titulo, preco, link, descricao, categoria) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    // Preencher informações do Modal
    document.getElementById('modal-titulo-detalhe').innerText = titulo;
    const descElem = document.getElementById('detalhe-descricao');
    if(descElem) descElem.innerText = descricao || "Nenhuma descrição disponível.";
    
    const catElem = document.getElementById('detalhe-categoria');
    if(catElem) catElem.innerText = categoria;

    // Gerar indicadores (barrinhas)
    const indicadores = document.getElementById('galeria-indicadores');
    if(indicadores) {
        indicadores.innerHTML = fotos.map((_, i) => 
            `<div class="h-1 flex-1 rounded-full bg-gray-200"><div id="barrinha-${i}" class="h-full bg-orange-500 rounded-full transition-all duration-300" style="width: 0%"></div></div>`
        ).join('');
    }

    atualizarGaleria();
    document.getElementById('modal-galeria').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function mudarFoto(passo) {
    if (galeriaAtual.length <= 1) return;
    indiceGaleria = (indiceGaleria + passo + galeriaAtual.length) % galeriaAtual.length;
    atualizarGaleria();
}

function atualizarGaleria() {
    const img = document.getElementById('modal-img');
    if (!img) return;
    
    img.style.opacity = '0';
    setTimeout(() => {
        img.src = galeriaAtual[indiceGaleria];
        img.style.opacity = '1';
    }, 150);

    galeriaAtual.forEach((_, i) => {
        const bar = document.getElementById(`barrinha-${i}`);
        if(bar) bar.style.width = i === indiceGaleria ? '100%' : '0%';
    });
}

function fecharGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 5. GESTÃO DO CARRINHO
function adicionarAoCarrinho(id, nome, preco, link) {
    if (carrinho.find(item => item.id === id)) return alert("Item já está no carrinho!");
    carrinho.push({ id, nome, preco: parseFloat(preco), link });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    
    // Pequeno feedback visual ao invés de alert se preferir (opcional)
    alert("Adicionado ao carrinho! 🛒");
}

function atualizarContadorCarrinho() {
    const c = document.getElementById('cart-count');
    if (c) c.innerText = carrinho.length;
}

function toggleCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    if(!modal) return;
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    renderizarItensCarrinho();
}

function renderizarItensCarrinho() {
    const container = document.getElementById('itens-carrinho');
    const totalElem = document.getElementById('total-carrinho');
    if(!container || !totalElem) return;

    let total = 0;
    if (carrinho.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4 text-xs">Carrinho vazio</p>`;
    } else {
        container.innerHTML = carrinho.map(item => {
            total += item.preco;
            return `<div class="flex justify-between items-center py-3 border-b border-gray-50 text-[11px]">
                        <span class="font-bold text-gray-700 max-w-[150px] truncate">${item.nome}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-green-600 font-bold">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                            <button onclick="removerItemCarrinho('${item.id}')" class="text-red-400 hover:text-red-600 text-lg ml-2">×</button>
                        </div>
                    </div>`;
        }).join('');
    }
    totalElem.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removerItemCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderizarItensCarrinho();
}