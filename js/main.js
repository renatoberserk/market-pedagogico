// --- BANCO DE DADOS DE PRODUTOS ---
const db_produtos = [
    { id: 1, nome: "Combo Alfabetização", preco: 29.90 },
    { id: 2, nome: "Números", preco: 15.00 },
    { id: 3, nome: "Planner 2026", preco: 45.90 },
    { id: 4, nome: "Flashcards", preco: 12.90 }
];

// --- ESTADO DO SITE ---
let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

// --- FUNÇÕES DO MOTOR ---

// 1. Adicionar Item
function adicionarAoCarrinho(id, nome, preco, img) {
    const item = { id, nome, preco, img };
    carrinho.push(item);
    salvarESincronizar();
    
    // Feedback visual: abre o carrinho lateral
    const cart = document.getElementById('carrinho-lateral');
    const overlay = document.getElementById('cart-overlay');
    if(cart) cart.classList.remove('translate-x-full');
    if(overlay) overlay.classList.remove('hidden');
}

// 2. Remover Item
function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    salvarESincronizar();
}

// 3. Salvar no LocalStorage
function salvarESincronizar() {
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
    renderizarCarrinho();
}

// 4. Renderizar (Atualizar o que o usuário vê)
function renderizarCarrinho() {
    const listaUI = document.getElementById('lista-carrinho');
    const badge = document.getElementById('cart-count');
    const totalUI = document.getElementById('total-carrinho');

    if (!listaUI) return; // Se não estiver na página com carrinho, ignora

    listaUI.innerHTML = '';
    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;
        listaUI.innerHTML += `
            <div class="flex items-center gap-3 p-2 bg-white border-b border-gray-100 animate-in fade-in duration-300">
                <img src="${item.img}" class="w-12 h-12 rounded object-cover shadow-sm">
                <div class="flex-1">
                    <p class="text-[10px] font-bold text-gray-700 uppercase">${item.nome}</p>
                    <p class="text-blue-500 font-bold text-sm">R$ ${item.preco.toFixed(2)}</p>
                </div>
                <button onclick="removerDoCarrinho(${index})" class="text-red-300 hover:text-red-500 transition">✕</button>
            </div>
        `;
    });

    if (badge) badge.innerText = carrinho.length;
    if (totalUI) totalUI.innerText = `R$ ${total.toFixed(2)}`;
}

// 5. Verificar Usuário Logado (O toque especial)
function atualizarNomeUsuario() {
    const nomeSalvo = localStorage.getItem('prof_nome');
    const elNome = document.getElementById('nome-professor');
    if (nomeSalvo && elNome) {
        elNome.innerText = `Olá, Prof. ${nomeSalvo.split(' ')[0]}`;
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    renderizarCarrinho();
    atualizarNomeUsuario();
});