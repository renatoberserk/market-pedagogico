let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
let produtosOriginais = [];
let fotoAtual = 0;
let fotosNoCarrossel = [];

window.onload = () => {
    verificarSessao();
    carregarProdutosLoja();
    atualizarContadorCarrinho();
};

/* ===============================
   SESSÃO / LOGIN
================================ */
function verificarSessao() {
    const nome = localStorage.getItem('prof_nome');
    const isAdmin = localStorage.getItem('prof_admin') === 'true';
    const authContainer = document.getElementById('header-auth');

    if (!nome || !authContainer) return;

    const btnAdmin = isAdmin
        ? `<button onclick="location.href='admin.html'"
            class="bg-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-[12px] mr-2 hover:bg-purple-700">
            👑 Admin
           </button>`
        : '';

    authContainer.innerHTML = `
        <div class="flex items-center gap-2">
            ${btnAdmin}
            <button onclick="location.href='meus-materiais.html'"
                class="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl font-bold text-xs">
                Meus PDFs
            </button>
            <span class="text-xs font-bold text-gray-600">${nome.split(' ')[0]}</span>
            <button onclick="logout()" class="text-lg pl-2">🚪</button>
        </div>`;
}

function logout() {
    localStorage.clear();
    location.href = 'index.html';
}

/* ===============================
   PRODUTOS
================================ */
async function carregarProdutosLoja() {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
        produtosOriginais = await resp.json();
        renderizarProdutos(produtosOriginais);
    } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        container.innerHTML = `
            <p class="col-span-full text-center text-red-400 font-bold">
                Erro ao conectar com o servidor.
            </p>`;
    }
}

function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;

    if (!lista || lista.length === 0) {
        container.innerHTML = `
            <p class="col-span-full text-center text-gray-400 py-10">
                Nenhum material encontrado.
            </p>`;
        return;
    }

    container.innerHTML = "";

    lista.forEach(p => {
        const card = document.createElement('div');
        card.className =
            "group bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col h-full cursor-pointer";

        const imgFinal = p.imagem_url || 'https://placehold.co/400x300?text=Material';

        card.innerHTML = `
            <div class="relative bg-gray-50 rounded-2xl h-40 md:h-48 mb-3 overflow-hidden">
                <span class="absolute top-2 left-2 bg-white/90 text-[10px] px-2 py-1 rounded-lg font-bold text-orange-600 uppercase">
                    ${p.categoria || 'Geral'}
                </span>
                <img src="${imgFinal}"
                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>

            <div class="flex flex-col flex-grow">
                <h3 class="font-bold text-gray-800 text-sm mb-1 line-clamp-2">${p.nome}</h3>
                <p class="text-[10px] text-gray-400 mb-2 uppercase font-bold">
                    PDF Digital • Pronta Entrega
                </p>

                <div class="mt-auto pt-2 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] text-gray-400 line-through">R$ 47,90</p>
                        <p class="text-orange-500 font-black text-base">
                            R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}
                        </p>
                    </div>

                    <button id="btn-add-${p.id}"
                        class="bg-orange-500 hover:bg-orange-600 text-white p-2.5 rounded-xl active:scale-90 shadow-md">
                        +
                    </button>
                </div>
            </div>
        `;

        card.onclick = () => abrirModal(p);

        const btnAdd = card.querySelector(`#btn-add-${p.id}`);
        btnAdd.onclick = e => {
            e.stopPropagation();
            adicionarAoCarrinho(p.id, p.nome, p.preco, p.link_download);
        };

        container.appendChild(card);
    });
}

/* ===============================
   CARRINHO
================================ */
function adicionarAoCarrinho(id, nome, preco, link) {
    carrinho.push({ id, nome, preco, link, uid: Date.now() });
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    toggleCarrinho();
}

function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    if (contador) contador.innerText = carrinho.length;
}

function toggleCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    if (!modal) return;

    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if (modal.style.display === 'flex') renderCarrinho();
}

function renderCarrinho() {
    const cont = document.getElementById('itens-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    let total = 0;

    if (!carrinho.length) {
        cont.innerHTML = `<p class="text-center text-gray-400 mt-10 italic">Seu carrinho está vazio</p>`;
        totalElement.innerText = "R$ 0,00";
        return;
    }

    cont.innerHTML = carrinho.map(i => {
        total += parseFloat(i.preco);
        return `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-2xl mb-3">
                <div>
                    <p class="font-bold text-xs">${i.nome}</p>
                    <p class="text-green-600 font-bold text-xs">
                        R$ ${parseFloat(i.preco).toFixed(2).replace('.', ',')}
                    </p>
                </div>
                <button onclick="remover(${i.uid})" class="text-red-500">🗑️</button>
            </div>`;
    }).join('');

    totalElement.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function remover(uid) {
    carrinho = carrinho.filter(i => i.uid !== uid);
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
    renderCarrinho();
}

/* ===============================
   MODAL + CARROSSEL
================================ */
function abrirModal(p) {
    const modal = document.getElementById('modal-detalhes');
    if (!modal) return;

    document.getElementById('modal-nome').innerText = p.nome;
    document.getElementById('modal-categoria').innerText = p.categoria || 'Geral';
    document.getElementById('modal-preco').innerText =
        `R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}`;

    document.getElementById('modal-descricao').innerText =
        p.descricao || 'Material pedagógico de alta qualidade, pronto para uso.';

    document.getElementById('modal-btn-comprar-acao').onclick = () => {
        adicionarAoCarrinho(p.id, p.nome, p.preco, p.link_download);
        fecharModal();
    };

    fotosNoCarrossel = [p.imagem_url, p.foto_extra1, p.foto_extra2]
        .filter(url => url && url.length > 10);

    renderizarCarrossel();

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderizarCarrossel() {
    const container = document.getElementById('carrossel-container');
    const indicadores = document.getElementById('indicadores-fotos');
    const botoes = document.getElementById('botoes-carrossel');

    fotoAtual = 0;

    if (!fotosNoCarrossel.length) {
        container.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400">Sem imagens</div>`;
        if (botoes) botoes.style.display = 'none';
        return;
    }

    container.innerHTML = fotosNoCarrossel.map(url => `
        <div class="w-full h-full flex-shrink-0">
            <img src="${url}" class="w-full h-full object-contain">
        </div>
    `).join('');

    indicadores.innerHTML = fotosNoCarrossel.length > 1
        ? fotosNoCarrossel.map((_, i) =>
            `<div class="${i === 0 ? 'w-5 bg-white' : 'w-1.5 bg-white/50'} h-1.5 rounded-full transition-all"></div>`
          ).join('')
        : '';

    if (botoes) botoes.style.display = fotosNoCarrossel.length > 1 ? 'block' : 'none';

    atualizarPosicaoCarrossel();
}

function mudarFoto(dir) {
    fotoAtual += dir;
    if (fotoAtual >= fotosNoCarrossel.length) fotoAtual = 0;
    if (fotoAtual < 0) fotoAtual = fotosNoCarrossel.length - 1;
    atualizarPosicaoCarrossel();
}

function atualizarPosicaoCarrossel() {
    const container = document.getElementById('carrossel-container');
    if (!container) return;

    container.style.transform = `translateX(-${fotoAtual * 100}%)`;

    document.querySelectorAll('#indicadores-fotos div').forEach((dot, i) => {
        dot.className =
            i === fotoAtual
                ? 'h-1.5 w-5 bg-white rounded-full transition-all'
                : 'h-1.5 w-1.5 bg-white/50 rounded-full transition-all';
    });
}

function fecharModal() {
    document.getElementById('modal-detalhes').classList.add('hidden');
    document.body.style.overflow = 'auto';
}
