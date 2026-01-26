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

    // Estilos CSS para o carrossel
    const carouselStyles = `
        <style>
            .carousel-container {
                position: relative;
                overflow: hidden;
            }
            
            .carousel-track {
                display: flex;
                transition: transform 0.5s ease-in-out;
                height: 100%;
            }
            
            .carousel-slide {
                flex: 0 0 100%;
                height: 100%;
            }
            
            .carousel-nav {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(255, 255, 255, 0.9);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .carousel-nav:hover {
                background: white;
            }
            
            .carousel-prev {
                left: 10px;
            }
            
            .carousel-next {
                right: 10px;
            }
            
            .carousel-container:hover .carousel-nav {
                opacity: 1;
            }
            
            .carousel-dots {
                position: absolute;
                bottom: 10px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
                gap: 6px;
                z-index: 10;
            }
            
            .carousel-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                border: none;
                padding: 0;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .carousel-dot.active {
                background: rgba(255, 255, 255, 0.9);
                transform: scale(1.2);
            }
            
            .carousel-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                cursor: pointer;
                transition: transform 0.3s;
            }
            
            .carousel-image:hover {
                transform: scale(1.02);
            }
        </style>
    `;

    // Adiciona os estilos apenas uma vez
    if (!document.getElementById('carousel-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'carousel-styles';
        styleEl.textContent = carouselStyles;
        document.head.appendChild(styleEl);
    }

    container.innerHTML = lista.map(p => {
        const nomeLimpo = p.nome.replace(/'/g, "\\'");
        const linkFinal = (p.link_download || p.link || "").trim(); 
        // Coleta todas as imagens disponíveis (máximo 3)
        const imagens = [
            p.imagem_url, 
            p.foto1, 
            p.foto2
        ].filter(img => img && img.trim() !== "").slice(0, 3); // Limita a 3 imagens

        const carouselId = `carousel-${p.id}`;
        const hasMultipleImages = imagens.length > 1;

        return `
            <div class="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full group">
                
                <!-- Container do Carrossel -->
                <div class="relative mb-3 overflow-hidden rounded-xl bg-gray-100 h-40 md:h-48 carousel-container" id="${carouselId}-container">
                    <div class="carousel-track" id="${carouselId}">
                        ${imagens.map((img, index) => `
                            <div class="carousel-slide">
                                <img src="${img}" 
                                     alt="${p.nome} - Imagem ${index + 1}" 
                                     class="carousel-image"
                                     onclick="abrirZoom('${img}')">
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Botões de navegação -->
                    ${hasMultipleImages ? `
                        <button class="carousel-nav carousel-prev" 
                                onclick="event.stopPropagation(); moverCarrossel('${carouselId}', -1)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <button class="carousel-nav carousel-next" 
                                onclick="event.stopPropagation(); moverCarrossel('${carouselId}', 1)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                        
                        <!-- Indicadores (dots) -->
                        <div class="carousel-dots">
                            ${imagens.map((_, index) => `
                                <button class="carousel-dot ${index === 0 ? 'active' : ''}" 
                                        onclick="event.stopPropagation(); irParaSlide('${carouselId}', ${index})"
                                        data-slide="${index}"></button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- Informações do produto -->
                <div class="flex flex-col flex-grow text-left">
                    <h3 class="font-bold text-gray-800 text-xs md:text-sm mb-1 line-clamp-2 h-8 leading-tight">
                        ${p.nome}
                    </h3>
                    
                    <p class="text-[10px] md:text-[11px] text-gray-500 line-clamp-3 mb-3 leading-relaxed flex-grow">
                        ${p.descricao || 'Material pedagógico completo pronto para aplicação.'}
                    </p>

                    <!-- Preço e botão de compra -->
                    <div class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                        <div class="flex flex-col">
                            <span class="text-green-600 font-black text-sm md:text-lg leading-none">
                                R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                        
                        <button onclick="adicionarAoCarrinho(${p.id}, '${nomeLimpo}', ${p.preco}, '${linkFinal}')" 
                                class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] md:text-xs shadow-md uppercase transition-colors">
                            Comprar
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');

    // Inicializa os carrosséis após renderizar
    lista.forEach(p => {
        if ([p.imagem_url, p.foto1, p.foto2].filter(img => img && img.trim() !== "").length > 1) {
            inicializarCarrossel(`carousel-${p.id}`);
        }
    });
}

// Funções auxiliares para o carrossel
function inicializarCarrossel(carouselId) {
    const container = document.getElementById(`${carouselId}-container`);
    if (!container) return;

    const track = document.getElementById(carouselId);
    const slides = track.querySelectorAll('.carousel-slide');
    const dots = container.querySelectorAll('.carousel-dot');
    
    // Configura largura do track
    track.style.width = `${slides.length * 100}%`;
    
    // Armazena estado atual no elemento
    container.currentSlide = 0;
}

function moverCarrossel(carouselId, direction) {
    const container = document.getElementById(`${carouselId}-container`);
    const track = document.getElementById(carouselId);
    const slides = track.querySelectorAll('.carousel-slide');
    const dots = container.querySelectorAll('.carousel-dot');
    
    if (!container || !track) return;
    
    // Atualiza slide atual
    let newSlide = container.currentSlide + direction;
    
    // Verifica limites
    if (newSlide < 0) newSlide = slides.length - 1;
    if (newSlide >= slides.length) newSlide = 0;
    
    // Move o track
    track.style.transform = `translateX(-${newSlide * 100}%)`;
    container.currentSlide = newSlide;
    
    // Atualiza dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === newSlide);
    });
}

function irParaSlide(carouselId, slideIndex) {
    const container = document.getElementById(`${carouselId}-container`);
    const track = document.getElementById(carouselId);
    const dots = container.querySelectorAll('.carousel-dot');
    
    if (!container || !track) return;
    
    // Move para o slide específico
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    container.currentSlide = slideIndex;
    
    // Atualiza dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
}

// Opcional: Adicionar navegação automática (descomente se quiser)
// function iniciarCarrosselAutomatico(carouselId, intervalo = 5000) {
//     setInterval(() => {
//         moverCarrossel(carouselId, 1);
//     }, intervalo);
// }

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