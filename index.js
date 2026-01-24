let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

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

async function carregarProdutos() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    try {
        const response = await fetch('https://educamateriais.shop/produtos');
        const produtos = await response.json();

        if (produtos.length === 0) {
            container.innerHTML = "<p class='col-span-full text-center text-gray-400'>Nenhum produto cadastrado.</p>";
            return;
        }

     container.innerHTML = produtos.map(p => {
    const imgFinal = p.imagem_url && p.imagem_url.includes('http')
        ? p.imagem_url
        : `https://placehold.co/400x300/f3f4f6/6366f1?text=Material+Didatico`;

    return `
        <div class="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full">
            <div class="bg-gray-50 rounded-xl h-32 md:h-40 mb-3 overflow-hidden flex items-center justify-center">
                <img src="${imgFinal}" 
                     alt="${p.nome}" 
                     class="w-full h-full object-cover" 
                     onerror="this.src='https://placehold.co/400x300/f3f4f6/a855f7?text=Erro'">
            </div>
            
            <div class="flex flex-col flex-grow">
                <h3 class="font-bold text-gray-800 text-xs md:text-sm mb-1 leading-tight h-8 overflow-hidden line-clamp-2">
                    ${p.nome}
                </h3>
                <p class="text-[8px] md:text-[10px] text-gray-400 mb-3 uppercase font-bold">PDF Digital</p>
                
                <div class="mt-auto flex flex-col gap-2">
                    <span class="text-green-600 font-bold text-sm md:text-base">
                        R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}
                    </span>
                    <button onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g, "\\'")}', ${p.preco})" 
                            class="bg-orange-500 hover:bg-orange-600 text-white w-full py-2 rounded-lg font-bold text-[10px] md:text-xs transition-all active:scale-95">
                        + Adicionar
                    </button>
                </div>
            </div>
        </div>`;
}).join('');
    } catch (error) {
        container.innerHTML = "<p class='col-span-full text-center text-red-400 font-bold'>Erro ao conectar com o servidor.</p>";
    }
}

function toggleCarrinho() {
    const m = document.getElementById('modal-carrinho');
    if (!m) return;
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
    if (m.style.display === 'flex') renderCarrinho();
}

// FUNÇÃO DE ADICIONAR ÚNICA E CORRETA
function adicionarAoCarrinho(id, nome, preco) {
    carrinho.push({ id, nome, preco, uid: Date.now() });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    
    atualizarContadorCarrinho(); // Atualiza o numerozinho
    toggleCarrinho(); // Abre o carrinho para mostrar que adicionou
}

function remover(uid) {
    carrinho = carrinho.filter(i => i.uid !== uid);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderCarrinho();
}

// FUNÇÃO DE CONTADOR ÚNICA (Badge)
function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    if (!contador) return;

    const quantidade = carrinho.length;
    contador.innerText = quantidade;

    if (quantidade > 0) {
        contador.style.display = 'inline-block';
        contador.classList.add('pulse');
        setTimeout(() => contador.classList.remove('pulse'), 200);
    } else {
        contador.style.display = 'none';
    }
}

function renderCarrinho() {
    const cont = document.getElementById('itens-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    let total = 0;

    if (carrinho.length === 0) {
        cont.innerHTML = "<p style='text-align:center; color:#999; margin-top:50px;'>Carrinho vazio</p>";
        if (totalElement) totalElement.innerText = "R$ 0,00";
        return;
    }

    cont.innerHTML = carrinho.map(i => {
        total += parseFloat(i.preco);
        return `<div class="flex justify-between items-center bg-white p-3 rounded-2xl mb-3 border border-gray-100 shadow-sm text-left">
                    <div>
                        <p class="m-0 font-bold text-xs text-gray-700">${i.nome}</p>
                        <p class="m-0 text-green-600 font-bold text-xs">R$ ${parseFloat(i.preco).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button onclick="remover(${i.uid})" class="bg-none border-none text-red-500 cursor-pointer p-1">🗑️</button>
                </div>`;
    }).join('');
    
    if (totalElement) totalElement.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function renderizarProdutos(lista) {
    const container = document.getElementById('lista-produtos');
    
    // Se o container não for encontrado, o código para aqui e não dá erro
    if (!container) {
        console.error("ERRO: O elemento 'lista-produtos' não existe no HTML.");
        return;
    }

    if (lista.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-400 py-10">Nenhum material nesta categoria.</p>';
        return;
    }

container.innerHTML = lista.map(p => `
    <div class="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative flex flex-col h-full">
        <span class="absolute top-6 left-6 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-lg font-bold uppercase shadow-sm z-10">
            ${p.categoria === 'eva' ? 'Modelos em EVA' : (p.categoria || 'Geral')}
        </span>
        
        <div class="w-full h-48 overflow-hidden rounded-2xl mb-4 bg-gray-50">
            <img src="${p.imagem_url || 'https://via.placeholder.com/300x200?text=Sem+Imagem'}" 
                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
        </div>
        
        <h3 class="font-bold text-gray-800 leading-tight mb-auto line-clamp-2">
            ${p.nome}
        </h3>
        
        <div class="flex justify-between items-center mt-4">
            <div>
                <p class="text-[10px] text-gray-400 uppercase font-bold">Investimento</p>
                <p class="text-green-600 font-black text-xl">
                    R$ ${parseFloat(p.preco || 0).toFixed(2)}
                </p>
            </div>
            <button onclick="adicionarAoCarrinho(${p.id})" 
                class="bg-orange-100 text-orange-600 p-3 rounded-2xl hover:bg-orange-500 hover:text-white transition-all shadow-sm">
                <span class="text-lg">🛒</span>
            </button>
        </div>
    </div>
`).join('');
}

// Função para filtrar os produtos por categoria
function filtrarProdutos(categoria, elemento) {
    console.log("Filtrando por:", categoria);

    if (categoria === 'todos') {
        renderizarProdutos(produtosOriginais);
    } else {
        // O .toLowerCase() garante que 'EVA' ou 'eva' sejam lidos da mesma forma
        const filtrados = produtosOriginais.filter(p => 
            p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase()
        );
        renderizarProdutos(filtrados);
    }

    // Estilo visual dos botões (Mantém o clique ativo)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-orange-500', 'text-white', 'active-filter');
        btn.classList.add('bg-white', 'text-gray-600');
    });
    elemento.classList.add('bg-orange-500', 'text-white', 'active-filter');
}

let produtosOriginais = []; // Tem que estar fora da função!

async function carregarProdutosLoja() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
        const dados = await resp.json();
        
        produtosOriginais = dados; // Salva aqui para o filtro usar depois
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro ao carregar:", err);
    }
}

// INICIALIZAÇÃO ÚNICA
window.onload = () => {
    verificarSessao();
    carregarProdutos();
    atualizarContadorCarrinho();
};