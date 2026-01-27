let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
let produtosOriginais = []; // Aqui guardamos tudo o que vem do banco
let galeriaAtual = [];
let indiceGaleria = 0;
let produtoSelecionadoNoModal = null;

window.onload = () => {
    verificarSessao();
    carregarProdutosLoja();
    atualizarContadorCarrinho();
};

// --- CARREGAR PRODUTOS ---
async function carregarProdutosLoja() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos?t=' + new Date().getTime());
        const dados = await resp.json();
        produtosOriginais = dados; // Salva a lista completa para poder filtrar depois
        renderizarProdutos(produtosOriginais);
    } catch (err) { console.error("Erro:", err); }
}

// --- FUNÇÃO DE FILTRO (O QUE ESTAVA FALTANDO) ---
function filtrarProdutos(categoria, botao) {
    // 1. Lógica de filtro
    let filtrados = [];
    if (categoria === 'todos') {
        filtrados = produtosOriginais;
    } else {
        filtrados = produtosOriginais.filter(p => p.categoria === categoria);
    }
    renderizarProdutos(filtrados);

    // 2. Estilo visual dos botões (Feedback)
    const botoes = document.querySelectorAll('button[onclick*="filtrarProdutos"]');
    botoes.forEach(btn => {
        btn.classList.remove('bg-orange-500', 'text-white');
        btn.classList.add('bg-white', 'text-gray-500', 'border-gray-100');
    });

    botao.classList.remove('bg-white', 'text-gray-500');
    botao.classList.add('bg-orange-500', 'text-white', 'shadow-sm');
}

// --- RENDERIZAR VITRINE ---
function renderizarProdutos(lista) {
    const container = document.getElementById('vitrine-produtos');
    if (!container) return;
    
    if (lista.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center py-20 text-gray-400">Nenhum material encontrado nesta categoria.</p>`;
        return;
    }

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
                    <h3 class="font-bold text-gray-800 text-[11px] mb-1 line-clamp-2 h-8">${p.nome}</h3>
                    <div class="mt-auto pt-2 flex items-center justify-between">
                        <span class="text-green-600 font-black text-xs">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
                        <button onclick="adicionarAoCarrinho('${p.id}', '${nomeLimpo}', ${p.preco}, '${p.link_download}')" 
                                class="bg-orange-500 text-white p-2 rounded-xl active:scale-90 transition-transform">🛒</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- MODAL E GALERIA ---
function abrirGaleria(fotos, titulo, preco, link, descricao) {
    galeriaAtual = fotos;
    indiceGaleria = 0;
    produtoSelecionadoNoModal = { id: Date.now(), nome: titulo, preco: preco, link: link };

    const elTitulo = document.getElementById('modal-titulo-detalhe');
    const elDesc = document.getElementById('modal-descricao-detalhe');
    const elIndicadores = document.getElementById('galeria-indicadores');

    if (elTitulo) elTitulo.innerText = titulo;
    if (elDesc) elDesc.innerText = descricao || "Material em PDF de alta qualidade.";
    if (elIndicadores) {
        elIndicadores.innerHTML = fotos.map((_, i) => 
            `<div class="h-1 flex-1 rounded-full bg-gray-200"><div id="barrinha-${i}" class="h-full bg-orange-500 rounded-full transition-all duration-300" style="width: 0%"></div></div>`
        ).join('');
    }

    atualizarGaleria();
    document.getElementById('modal-galeria').style.display = 'flex';
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
    if (galeriaAtual.length <= 1) return;
    indiceGaleria = (indiceGaleria + passo + galeriaAtual.length) % galeriaAtual.length;
    atualizarGaleria();
}

function fecharGaleria() {
    document.getElementById('modal-galeria').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// --- CARRINHO ---
function toggleCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    if (!modal) return;
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
        container.innerHTML = `<p class="text-gray-400 text-center py-10 text-[10px]">Vazio</p>`;
    } else {
        container.innerHTML = carrinho.map(item => {
            total += item.preco;
            return `
                <div class="flex justify-between items-center py-3 border-b border-gray-50">
                    <p class="font-bold text-gray-700 text-[10px] truncate max-w-[140px]">${item.nome}</p>
                    <div class="flex items-center gap-2">
                        <span class="text-green-600 font-bold text-[10px]">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                        <button onclick="removerItemCarrinho('${item.id}')" class="text-red-400 text-lg">×</button>
                    </div>
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


function fazerLogout() {
    // 1. Limpa os dados de sessão
    localStorage.removeItem('user_email');
    localStorage.removeItem('prof_email');
    localStorage.removeItem('user_nome');

    // 2. Feedback visual
    console.log("Sessão encerrada");

    // 3. Redireciona para a página de login/cadastro (ela mesma, para resetar)
    window.location.href = 'login.html'; 
}

// Aproveitando para adicionar a função switchTab que você usa no HTML
function switchTab(modo) {
    const isLogin = modo === 'login';
    document.getElementById('wrapper-nome').classList.toggle('hidden', isLogin);
    document.getElementById('wrapper-whats').classList.toggle('hidden', isLogin);
    document.getElementById('tab-login').classList.toggle('tab-active', isLogin);
    document.getElementById('tab-cadastro').classList.toggle('tab-active', !isLogin);
    document.getElementById('btn-submit').innerText = isLogin ? 'Entrar Agora' : 'Criar minha Conta';
}


function configurarSaudacao() {
    const container = document.getElementById('saudacao-usuario');
    const nomeUsuario = localStorage.getItem('prof_nome') || 'Educador(a)';
    
    const hora = new Date().getHours();
    let saudacao = "";

    if (hora >= 5 && hora < 12) {
        saudacao = "☀️ Bom dia";
    } else if (hora >= 12 && hora < 18) {
        saudacao = "🌤️ Boa tarde";
    } else {
        saudacao = "🌙 Boa noite";
    }

    // Monta a frase final
    container.innerHTML = `
        <span>${saudacao},</span>
        <span class="text-slate-800 font-bold">${nomeUsuario}!</span>
        <span class="text-orange-500">✨</span>
    `;
}

// Chame esta função junto com a sua função sazonal
document.addEventListener('DOMContentLoaded', () => {
    atualizarMensagemSazonal();
    configurarSaudacao();
});


function atualizarMensagemSazonal() {
    const agora = new Date();
    const mes = agora.getMonth() + 1; 
    const dia = agora.getDate();
    const container = document.getElementById('mensagem-sazonal');
    if (!container) return;

    let msg = "";
    let css = "";

    // CALENDÁRIO SAZONAL EDUCA MATERIAIS
    if (mes === 1 && dia >= 10 || mes === 2 && dia <= 15) {
        msg = "🎒 Volta às Aulas! Organize seu ano letivo com nossos planejamentos exclusivos! ✏️";
        css = "bg-blue-600 text-white font-black shadow-lg shadow-blue-200";
    } 
    else if (mes === 3 || (mes === 4 && dia <= 12)) {
        msg = "🐰 Páscoa Pedagógica: Atividades lúdicas para encantar seus pequenos! 🍫";
        css = "bg-purple-500 text-white font-bold border-b-4 border-purple-700";
    }
    else if (mes === 5 && dia <= 12) {
        msg = "🌸 Especial Dia das Mães: Lembrancinhas e atividades emocionantes! 💝";
        css = "bg-pink-500 text-white font-bold italic";
    }
    else if (mes === 6) {
        msg = "🔥 Arraiá de Ofertas! Materiais juninos prontinhos para imprimir! 🌽";
        css = "bg-orange-500 text-white font-bold border-y-2 border-yellow-300";
    }
    else if (mes === 8 && dia <= 14) {
        msg = "👔 Dia dos Pais: Encontre o material perfeito para esta data especial! 🏆";
        css = "bg-cyan-700 text-white font-bold";
    }
    else if (mes === 9 && dia >= 20 || (mes === 10 && dia <= 12)) {
        msg = "🎈 Semana da Criança: Diversão e aprendizado garantidos! Confira o Kit Kids. 🍦";
        css = "bg-yellow-400 text-slate-800 font-black uppercase tracking-tight";
    }
    else if (mes === 10 && dia >= 13 && dia <= 15) {
        msg = "🍎 Feliz Dia dos Professores! Descontos especiais para quem transforma o futuro! 📚";
        css = "bg-emerald-500 text-white font-black animate-pulse shadow-lg";
    }
    else if (mes === 11) {
        msg = "🖤 BLACK FRIDAY: A maior queima de materiais pedagógicos do ano! 🚀";
        css = "bg-slate-900 text-yellow-400 font-black italic border-2 border-yellow-400";
    }
    else if (mes === 12) {
        msg = "🎄 Natal na Escola: Deixe sua sala de aula mágica com nossos painéis! 🎅";
        css = "bg-red-600 text-white font-bold shadow-md";
    }
    else {
        // MENSAGEM PADRÃO (Dias sem data comemorativa)
        msg = "✨ Novidades toda semana! Clique e confira os lançamentos pedagógicos. ✨";
        css = "bg-slate-100 text-slate-600 text-sm font-medium";
    }

    container.innerHTML = `<div class="fade-in">${msg}</div>`;
    container.className = `w-full text-center py-3 px-4 transition-all duration-700 ${css}`;
}

document.addEventListener('DOMContentLoaded', atualizarMensagemSazonal);























function renderizarBotoesHeader() {
    const authContainer = document.getElementById('header-auth');
    const isAdmin = localStorage.getItem('prof_admin') === 'true';
    const estaLogado = localStorage.getItem('prof_email');

    if (!estaLogado) return; // Se não estiver logado, não mostra nada

    let htmlBotoes = '';

    // 1. Botão Meus Arquivos (Para todos os logados)
    htmlBotoes += `
        <button onclick="location.href='meus-materiais.html'" 
            class="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-2xl border border-blue-100 flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all font-bold text-xs shadow-sm">
            <span>📚</span> Meus Materiais
        </button>
    `;

    // 2. Botão Admin (Apenas para você)
    if (isAdmin) {
        htmlBotoes += `
            <button onclick="location.href='admin.html'" 
                class="bg-purple-50 text-purple-600 px-4 py-2.5 rounded-2xl border border-purple-100 flex items-center gap-2 hover:bg-purple-600 hover:text-white transition-all font-bold text-xs shadow-sm">
                <span>👑</span> Admin
            </button>
        `;
    }

    authContainer.innerHTML = htmlBotoes;
}

// Chame a função quando a página carregar
document.addEventListener('DOMContentLoaded', renderizarBotoesHeader);


// --- AUTH / SESSÃO ---
function verificarSessao() {
    const nome = localStorage.getItem('prof_nome');
    const isAdmin = localStorage.getItem('prof_admin') === 'true';
    const authContainer = document.getElementById('header-auth');

    if (nome && authContainer) {
        // GARANTIA: Forçamos a div a ser um flexbox com espaço entre botões
        authContainer.className = "flex items-center gap-3";

        // Botão Meus Materiais
        let htmlBotoes = `
            <button onclick="location.href='meus-materiais.html'" 
                class="bg-blue-600 text-white px-3 py-2 rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-sm hover:bg-blue-700 transition-all whitespace-nowrap">
                Meus Materiais 📚
            </button>
        `;

        // Se for admin, adiciona também o botão de Admin
        if (isAdmin) {
            htmlBotoes += `
                <button onclick="location.href='admin.html'" 
                    class="bg-purple-600 text-white px-3 py-2 rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-sm hover:bg-purple-700 transition-all whitespace-nowrap">
                    👑 Admin
                </button>
            `;
        }

        authContainer.innerHTML = htmlBotoes;
    }
}
document.addEventListener('DOMContentLoaded', verificarSessao);

// Chame a função para ela ser executada assim que a página abrir
verificarSessao();

function logout() { 
    localStorage.clear(); 
    location.href = 'login.html'; // Redireciona para o login ao sair
}

