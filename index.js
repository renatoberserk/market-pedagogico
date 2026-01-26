let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
let produtosOriginais = [];

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
        let btnAdmin = isAdmin ? `<button onclick="location.href='admin.html'" style="background:#8b5cf6; color:white; border:none; padding:8px 12px; border-radius:10px; font-weight:bold; cursor:pointer; font-size:12px; margin-right:5px;">👑 Admin</button>` : '';

        authContainer.innerHTML = `
            <div class="flex items-center gap-2">
                ${btnAdmin}
                <button onclick="location.href='meus-materiais.html'" class="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl font-bold text-xs">Meus PDFs</button>
                <span class="text-xs font-bold text-gray-600">${nome.split(' ')[0]}</span>
                <button onclick="logout()" class="text-lg pl-2">🚪</button>
            </div>`;
    }
}

function logout() { localStorage.clear(); location.href = 'index.html'; }

async function carregarProdutosLoja() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
        const dados = await resp.json();
        
        produtosOriginais = dados; 
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro ao carregar:", err);
        container.innerHTML = "<p class='col-span-full text-center text-red-400 font-bold'>Erro ao conectar com o servidor.</p>";
    }
}

// 3. RENDERIZAÇÃO (AGORA COM link_download)
function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = "<p class='col-span-full text-center text-gray-400 py-10'>Nenhum material encontrado.</p>";
        return;
    }

    container.innerHTML = lista.map(p => {
        const nomeLimpo = p.nome.replace(/'/g, "\\'");
        const linkFinal = p.link_download || ""; 
        
        // Reunimos a capa e as fotos extras em uma lista
        const imagens = [p.imagem_url, p.foto1, p.foto2].filter(img => img && img.trim() !== "");

        return `
            <div class="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full group">
                
                <div class="relative mb-3 group/btn overflow-hidden rounded-xl bg-gray-50 h-40 md:h-48">
                    <div id="carousel-${p.id}" class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth h-full no-scrollbar">
                        ${imagens.map(img => `
                            <div class="min-w-full h-full snap-center flex-shrink-0 cursor-pointer" onclick="abrirZoom('${img}')">
                                <img src="${img}" class="w-full h-full object-cover">
                            </div>
                        `).join('')}
                    </div>
                    
                    <span class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[8px] md:text-[10px] px-2 py-0.5 rounded-lg font-bold text-orange-600 shadow-sm z-10 uppercase">
                        ${p.categoria || 'Geral'}
                    </span>

                    ${imagens.length > 1 ? `
                        <button onclick="document.getElementById('carousel-${p.id}').scrollBy({left: -200, behavior: 'smooth'})" 
                            class="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 p-1.5 rounded-full shadow-lg hidden group-hover/btn:flex items-center justify-center text-gray-700 hover:text-orange-500 transition-colors z-20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <button onclick="document.getElementById('carousel-${p.id}').scrollBy({left: 200, behavior: 'smooth'})" 
                            class="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 p-1.5 rounded-full shadow-lg hidden group-hover/btn:flex items-center justify-center text-gray-700 hover:text-orange-500 transition-colors z-20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="3" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    ` : ''}
                </div>

                <div class="flex flex-col flex-grow">
                    <h3 class="font-bold text-gray-800 text-xs md:text-sm mb-1 line-clamp-2 h-8 leading-tight">${p.nome}</h3>
                    
                    <p class="text-[10px] md:text-[12px] text-gray-500 line-clamp-3 mb-3 leading-relaxed">
                        ${p.descricao || 'Material pedagógico completo, pronto para imprimir e usar.'}
                    </p>

                    <div class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                        <div class="flex flex-col">
                            <span class="text-green-600 font-black text-sm md:text-lg leading-none">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                            <span class="text-[8px] md:text-[10px] text-gray-400 line-through">R$ ${(parseFloat(p.preco) * 1.5).toFixed(2)}</span>
                        </div>
                        
                        <button onclick="adicionarAoCarrinho(${p.id}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')" 
                                class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] md:text-xs transition-all active:scale-95 shadow-md shadow-orange-100 uppercase">
                            Comprar
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// FUNÇÃO PARA ABRIR O ZOOM
function abrirZoom(src) {
    const modal = document.getElementById('modal-zoom');
    const img = document.getElementById('img-zoom');
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden'; // Trava o scroll do fundo
    }
}

// FUNÇÃO PARA FECHAR O ZOOM
function fecharZoom() {
    const modal = document.getElementById('modal-zoom');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto'; // Libera o scroll
    }
}




function filtrarProdutos(categoriaAlvo, elemento) {
    if (!produtosOriginais || produtosOriginais.length === 0) return;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-orange-500', 'text-white');
        btn.classList.add('bg-white', 'text-gray-600');
    });
    if (elemento) {
        elemento.classList.add('bg-orange-500', 'text-white');
    }

    if (categoriaAlvo === 'todos') {
        renderizarProdutos(produtosOriginais);
    } else {
        const filtrados = produtosOriginais.filter(p => 
            (p.categoria || "").toLowerCase().trim() === categoriaAlvo.toLowerCase().trim()
        );
        renderizarProdutos(filtrados);
    }
}

function toggleCarrinho() {
    const m = document.getElementById('modal-carrinho');
    if (!m) return;
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
    if (m.style.display === 'flex') renderCarrinho();
}

function adicionarAoCarrinho(id, nome, preco, link) {
    if (link && link !== "") {
        localStorage.setItem('link_pendente', link);
        console.log("🔗 Link capturado com sucesso:", link);
    } else {
        console.warn("⚠️ Atenção: Este produto no banco de dados está sem link_download!");
    }

    carrinho.push({ id, nome, preco, link, uid: Date.now() });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    
    atualizarContadorCarrinho();
    toggleCarrinho();
}

function remover(uid) {
    carrinho = carrinho.filter(i => i.uid !== uid);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderCarrinho();
}

function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    if (contador) contador.innerText = carrinho.length;
}

function renderCarrinho() {
    const cont = document.getElementById('itens-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    let total = 0;

    if (carrinho.length === 0) {
        cont.innerHTML = "<p class='text-center text-gray-400 mt-10'>Carrinho vazio</p>";
        if (totalElement) totalElement.innerText = "R$ 0,00";
        return;
    }

    cont.innerHTML = carrinho.map(i => {
        total += parseFloat(i.preco);
        return `<div class="flex justify-between items-center bg-gray-50 p-3 rounded-2xl mb-3 border border-gray-100 text-left">
                    <div>
                        <p class="m-0 font-bold text-xs text-gray-700">${i.nome}</p>
                        <p class="m-0 text-green-600 font-bold text-xs">R$ ${parseFloat(i.preco).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button onclick="remover(${i.uid})" class="text-red-500 p-1">🗑️</button>
                </div>`;
    }).join('');

    if (totalElement) totalElement.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}