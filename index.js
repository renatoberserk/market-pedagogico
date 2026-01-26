let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
let produtosOriginais = [];
let galeriaAtual = [];
let indiceGaleria = 0;
let produtoSelecionadoNoModal = null; // Para saber qual link salvar ao comprar pelo modal

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
        let btnAdmin = isAdmin ? `<button onclick="location.href='admin.html'" class="bg-purple-600 text-white border-none px-3 py-2 rounded-xl font-bold cursor-pointer text-[12px] mr-1">👑 Admin</button>` : '';

        authContainer.innerHTML = `
            <div class="flex items-center gap-2">
                ${btnAdmin}
                <button onclick="location.href='meus-materiais.html'" class="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl font-bold text-xs">Meus PDFs</button>
                <span class="text-xs font-bold text-gray-600">${nome.split(' ')[0]}</span>
                <button onclick="logout()" class="text-lg pl-2 cursor-pointer">🚪</button>
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

// RENDERIZAÇÃO COM SUPORTE À GALERIA
function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    container.innerHTML = lista.map(p => {
        const nomeLimpo = p.nome.replace(/'/g, "\\'");
        const linkFinal = (p.link_download || "").trim();
        const fotos = [p.imagem_url, p.foto1, p.foto2].filter(f => f && f !== "");
        const fotosJSON = JSON.stringify(fotos).replace(/"/g, '&quot;');

        return `
            <div class="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full">
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-50 h-44 cursor-pointer group" 
                     onclick="abrirGaleria(${fotosJSON}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')">
                    <img src="${p.imagem_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="bg-white/90 p-2 rounded-full text-gray-700 shadow-lg text-xs font-bold">🔍 Ver Detalhes</span>
                    </div>
                </div>

                <div class="flex flex-col flex-grow text-left">
                    <h3 class="font-bold text-gray-800 text-sm mb-1 line-clamp-2 h-10">${p.nome}</h3>
                    <div class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span class="text-green-600 font-black text-base">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                        <button onclick="adicionarAoCarrinho(${p.id}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')" 
                                class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-md transition-all active:scale-95">
                            Comprar
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// FUNÇÕES DA GALERIA PREMIUM
function abrirGaleria(fotos, titulo, preco, link) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    document.getElementById('modal-img').src = galeriaAtual[indiceGaleria];
    document.getElementById('caption').innerText = titulo;
    document.getElementById('modal-galeria').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function mudarFoto(passo) {
    indiceGaleria += passo;
    if (indiceGaleria >= galeriaAtual.length) indiceGaleria = 0;
    if (indiceGaleria < 0) indiceGaleria = galeriaAtual.length - 1;
    document.getElementById('modal-img').src = galeriaAtual[indiceGaleria];
}

// FUNÇÃO ÚNICA DE CARRINHO (REVISADA)
function adicionarAoCarrinho(id, nome, preco, link) {
    if (!link || link === "") {
        alert("Erro: Link do material não encontrado.");
        return;
    }

    // Limpa o carrinho anterior para compra imediata (como solicitado anteriormente)
    // Se quiser múltiplos itens, mude para: carrinho.push(...)
    const novoItem = { id, nome, preco: parseFloat(preco), link, uid: Date.now() };
    carrinho = [novoItem]; 
    
    localStorage.setItem('link_pendente', link);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));

    atualizarContadorCarrinho();
    
    // Feedback e Redirecionamento
    window.location.href = 'checkout.html';
}

function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    if (contador) contador.innerText = carrinho.length;
}

// FECHAR MODAL COM ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharGaleria();
});