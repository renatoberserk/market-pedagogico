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
        const linkFinal = (p.link_download || p.link || "").trim(); 
        const imagens = [p.imagem_url, p.foto1, p.foto2].filter(img => img && img.trim() !== "");

        // Gera um ID único para o produto
        const produtoId = `produto-${p.id}`;
        
        return `
            <div class="produto-card bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full group cursor-pointer"
                 onclick="abrirCarrosselProduto('${produtoId}', '${p.nome}', ${JSON.stringify(imagens)}, '${p.descricao || ''}', ${p.preco}, ${p.id})">
                
                <!-- Mostra apenas a primeira imagem na grade -->
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-100 h-40 md:h-48">
                    ${imagens.length > 0 ? `
                        <img src="${imagens[0]}" 
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                             alt="${p.nome}">
                    ` : `
                        <div class="w-full h-full flex items-center justify-center bg-gray-200">
                            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        </div>
                    `}
                    
                    <!-- Indicador de múltiplas imagens -->
                    ${imagens.length > 1 ? `
                        <div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                            </svg>
                            <span>${imagens.length}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="flex flex-col flex-grow text-left">
                    <h3 class="font-bold text-gray-800 text-xs md:text-sm mb-1 line-clamp-2 h-8 leading-tight">${p.nome}</h3>
                    <p class="text-[10px] md:text-[11px] text-gray-500 line-clamp-3 mb-3 leading-relaxed flex-grow">
                        ${p.descricao || 'Material pedagógico completo pronto para aplicação.'}
                    </p>

                    <div class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                        <div class="flex flex-col">
                            <span class="text-green-600 font-black text-sm md:text-lg leading-none">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                        </div>
                        
                        <button onclick="event.stopPropagation(); adicionarAoCarrinho(${p.id}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')" 
                                class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] md:text-xs shadow-md uppercase">
                            Comprar
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Modal de carrossel
let carrosselModal = null;

function criarModalCarrossel() {
    if (carrosselModal) return carrosselModal;
    
    const modalHTML = `
        <div id="modal-carrossel" class="fixed inset-0 z-50 hidden overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <!-- Overlay -->
                <div class="fixed inset-0 bg-black/75 transition-opacity" onclick="fecharCarrossel()"></div>

                <!-- Modal -->
                <div class="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <!-- Header -->
                    <div class="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 class="text-lg font-bold text-gray-900" id="modal-titulo"></h3>
                        <button onclick="fecharCarrossel()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Corpo do modal -->
                    <div class="px-6 py-6">
                        <!-- Carrossel -->
                        <div class="relative mb-6">
                            <div class="carrossel-container overflow-hidden rounded-xl bg-gray-100">
                                <div class="carrossel-track flex transition-transform duration-300" id="carrossel-track"></div>
                            </div>
                            
                            <!-- Botões de navegação -->
                            <button onclick="moverCarrossel(-1)" 
                                    class="carrossel-btn carrossel-prev absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <button onclick="moverCarrossel(1)" 
                                    class="carrossel-btn carrossel-next absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>
                            
                            <!-- Indicadores -->
                            <div class="carrossel-dots absolute bottom-4 left-0 right-0 flex justify-center gap-2" id="carrossel-dots"></div>
                        </div>
                        
                        <!-- Descrição -->
                        <div class="mt-6">
                            <h4 class="font-bold text-gray-800 mb-2">Descrição:</h4>
                            <p class="text-gray-600" id="modal-descricao"></p>
                        </div>
                        
                        <!-- Preço e botão -->
                        <div class="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                            <div>
                                <span class="text-green-600 font-black text-2xl" id="modal-preco"></span>
                            </div>
                            <button onclick="comprarProdutoAtual()" 
                                    class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-md uppercase">
                                Comprar Agora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Adiciona o modal ao corpo
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
    
    carrosselModal = {
        modal: document.getElementById('modal-carrossel'),
        track: document.getElementById('carrossel-track'),
        dots: document.getElementById('carrossel-dots'),
        titulo: document.getElementById('modal-titulo'),
        descricao: document.getElementById('modal-descricao'),
        preco: document.getElementById('modal-preco')
    };
    
    return carrosselModal;
}

// Variáveis globais para o carrossel atual
let carrosselAtual = {
    imagens: [],
    slideAtual: 0,
    produtoId: null,
    preco: 0,
    nome: ''
};

function abrirCarrosselProduto(produtoId, nome, imagens, descricao, preco, idProduto) {
    const modal = criarModalCarrossel();
    
    // Atualiza dados atuais
    carrosselAtual = {
        imagens,
        slideAtual: 0,
        produtoId,
        preco,
        nome,
        idProduto
    };
    
    // Atualiza conteúdo do modal
    modal.titulo.textContent = nome;
    modal.descricao.textContent = descricao || 'Material pedagógico completo pronto para aplicação.';
    modal.preco.textContent = `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}`;
    
    // Limpa e adiciona as imagens
    modal.track.innerHTML = '';
    modal.dots.innerHTML = '';
    
    imagens.forEach((img, index) => {
        // Adiciona slide
        const slide = document.createElement('div');
        slide.className = 'carrossel-slide min-w-full';
        slide.innerHTML = `
            <img src="${img}" 
                 alt="${nome} - Imagem ${index + 1}" 
                 class="w-full h-96 object-cover rounded-xl">
        `;
        modal.track.appendChild(slide);
        
        // Adiciona dot
        const dot = document.createElement('button');
        dot.className = `carrossel-dot w-3 h-3 rounded-full ${index === 0 ? 'bg-orange-500' : 'bg-gray-300'}`;
        dot.onclick = () => irParaSlide(index);
        modal.dots.appendChild(dot);
    });
    
    // Ajusta largura do track
    modal.track.style.width = `${imagens.length * 100}%`;
    
    // Mostra/oculta botões de navegação
    const botoes = document.querySelectorAll('.carrossel-btn');
    botoes.forEach(btn => {
        btn.style.display = imagens.length > 1 ? 'block' : 'none';
    });
    
    // Mostra modal
    modal.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Move para o primeiro slide
    atualizarCarrossel();
}

function moverCarrossel(direcao) {
    if (carrosselAtual.imagens.length <= 1) return;
    
    let novoSlide = carrosselAtual.slideAtual + direcao;
    
    // Loop circular
    if (novoSlide < 0) novoSlide = carrosselAtual.imagens.length - 1;
    if (novoSlide >= carrosselAtual.imagens.length) novoSlide = 0;
    
    carrosselAtual.slideAtual = novoSlide;
    atualizarCarrossel();
}

function irParaSlide(index) {
    carrosselAtual.slideAtual = index;
    atualizarCarrossel();
}

function atualizarCarrossel() {
    const modal = criarModalCarrossel();
    if (!modal || !modal.track) return;
    
    // Move o track
    const offset = -carrosselAtual.slideAtual * 100;
    modal.track.style.transform = `translateX(${offset}%)`;
    
    // Atualiza dots
    const dots = modal.dots.querySelectorAll('.carrossel-dot');
    dots.forEach((dot, index) => {
        dot.className = `carrossel-dot w-3 h-3 rounded-full ${index === carrosselAtual.slideAtual ? 'bg-orange-500' : 'bg-gray-300'}`;
    });
}

function comprarProdutoAtual() {
    if (carrosselAtual.idProduto) {
        // Fecha o modal primeiro
        fecharCarrossel();
        
        // Espera um pouco para a animação do modal fechar
        setTimeout(() => {
            // Chama a função de adicionar ao carrinho
            const linkFinal = ''; // Você precisa obter isso do seu objeto original
            adicionarAoCarrinho(
                carrosselAtual.idProduto,
                carrosselAtual.nome,
                carrosselAtual.preco,
                linkFinal
            );
        }, 300);
    }
}

function fecharCarrossel() {
    const modal = criarModalCarrossel();
    if (modal) {
        modal.modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Estilos CSS para o carrossel
const carrosselCSS = `
    <style>
        #modal-carrossel {
            z-index: 9999;
        }
        
        .carrossel-container {
            position: relative;
            height: 24rem;
        }
        
        .carrossel-track {
            height: 100%;
        }
        
        .carrossel-slide {
            height: 100%;
            padding: 0 4px;
            box-sizing: border-box;
        }
        
        .carrossel-btn {
            transition: all 0.3s ease;
        }
        
        .carrossel-btn:hover {
            transform: scale(1.1);
        }
        
        .carrossel-dot {
            transition: background 0.3s ease;
            cursor: pointer;
        }
        
        .carrossel-dot:hover {
            background: #f97316 !important;
        }
    </style>
`;

// Adiciona estilos ao cabeçalho
if (!document.getElementById('carrossel-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'carrossel-styles';
    styleEl.textContent = carrosselCSS;
    document.head.appendChild(styleEl);
}

// Fecha modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fecharCarrossel();
    }
});

function adicionarAoCarrinho(id, nome, preco, link) {
    console.log("🛒 Tentando comprar:", { id, nome, preco, link });

    // 1. Validação do Link (O link não pode ser vazio para o checkout funcionar)
    if (!link || link === "" || link === "undefined") {
        console.error("❌ Erro: Este produto não tem link de download cadastrado!");
        alert("Desculpe, este material está temporariamente indisponível (link não encontrado).");
        return;
    }

    // 2. Salva no localStorage para o Checkout
    localStorage.setItem('link_pendente', link);
    localStorage.setItem('prof_email', localStorage.getItem('prof_email') || ""); // Mantém o e-mail se existir
    
    const item = { id, nome, preco: parseFloat(preco) };
    let carrinho = [item]; // Como você quer direto para o checkout, limpamos o anterior e colocamos esse
    
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));

    console.log("✅ Dados salvos! Redirecionando para o checkout...");

    // 3. Redireciona
    window.location.href = 'checkout.html';
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