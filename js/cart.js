// 1. Banco de dados fake dos seus materiais
const produtos = [
    { id: 1, nome: "Combo Alfabetização Mágica", preco: 29.90, img: "https://img.freepik.com/vetores-gratis/modelo-de-planilha-de-letras-do-alfabeto_23-2148906649.jpg" },
    { id: 2, nome: "Números e Quantidades", preco: 15.00, img: "https://img.freepik.com/vetores-gratis/planilha-de-numeros-coloridos-para-criancas_23-2148906645.jpg" },
    { id: 3, nome: "Planner do Professor 2026", preco: 45.90, img: "https://img.freepik.com/vetores-gratis/capa-de-planejador-de-professores_23-2148900123.jpg" },
    { id: 4, nome: "Flashcards Animais", preco: 12.90, img: "https://img.freepik.com/vetores-gratis/flashcards-de-animais-fofos_23-2148895012.jpg" }
];

let carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

// 2. Função para adicionar ao carrinho
function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    carrinho.push(produto);
    salvarCarrinho();
    renderizarCarrinho();
    abrirCarrinho(); // Abre a lateral automaticamente ao adicionar
}

// 3. Função para remover do carrinho
function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    salvarCarrinho();
    renderizarCarrinho();
}

// 4. Salvar no navegador
function salvarCarrinho() {
    localStorage.setItem('edu_cart', JSON.stringify(carrinho));
}

// 5. Atualizar o Visual do Carrinho
function renderizarCarrinho() {
    const listaCarrinho = document.getElementById('lista-carrinho');
    const totalCarrinho = document.getElementById('total-carrinho');
    const contadorBadge = document.getElementById('cart-count');

    // Limpa a lista atual
    listaCarrinho.innerHTML = '';
    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;
        listaCarrinho.innerHTML += `
            <div class="flex gap-4 border-b border-gray-50 pb-4">
                <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img src="${item.img}" class="object-cover w-full h-full">
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-gray-800 text-xs uppercase">${item.nome}</h3>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-blue-600 font-bold text-sm">R$ ${item.preco.toFixed(2)}</span>
                        <button onclick="removerDoCarrinho(${index})" class="text-red-400 text-xs hover:underline">Remover</button>
                    </div>
                </div>
            </div>
        `;
    });

    // Atualiza valores
    totalCarrinho.innerText = `R$ ${total.toFixed(2)}`;
    contadorBadge.innerText = carrinho.length;
}

// Funções de Interface
function abrirCarrinho() {
    document.getElementById('carrinho-lateral').classList.remove('translate-x-full');
    document.getElementById('cart-overlay').classList.remove('hidden');
}

function fecharCarrinho() {
    document.getElementById('carrinho-lateral').classList.add('translate-x-full');
    document.getElementById('cart-overlay').classList.add('hidden');
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', renderizarCarrinho);