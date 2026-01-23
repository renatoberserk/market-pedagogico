const emailLogado = localStorage.getItem('prof_email');
let modoEdicaoId = null;

// 1. VERIFICAÇÃO DE ACESSO E INICIALIZAÇÃO
async function validarAcesso() {
    if (!emailLogado) { window.location.href = 'index.html'; return; }
    try {
        const resp = await fetch(`http://191.252.214.27:3000/verificar-admin?email=${emailLogado}`);
        const data = await resp.json();

        if (data.isAdmin) {
            document.getElementById('painel-admin').style.display = 'block';
            document.getElementById('admin-welcome').innerText = "Modo Administrador Ativo";

            // Inicia o carregamento dos dados
            carregarProdutosAdmin();
            carregarDashboard(); // <--- NOVO: Carrega as estatísticas financeiras
        } else {
            alert("Acesso Negado!");
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error("Erro no acesso:", err);
        window.location.href = 'index.html';
    }
}

// 2. BUSCAR DADOS DO SERVIDOR (DASHBOARD)
async function carregarDashboard() {
    try {
        const response = await fetch('http://191.252.214.27:3000/admin/stats');
        const dados = await response.json();
        atualizarEstatisticasVisual(dados);
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
    }
}

// 3. ATUALIZAR INTERFACE VISUAL
function atualizarEstatisticasVisual(dados) {
    // Log para você ver no console (F12) se o servidor está enviando o número correto
    console.log("Dados recebidos do servidor:", dados);

    // Conversão segura para números
    const hoje = parseFloat(dados.hoje) || 0;
    const mesAtual = parseFloat(dados.mes_atual) || 0;
    const ontem = parseFloat(dados.ontem) || 0;
    const mesAnterior = parseFloat(dados.mes_anterior) || 0;

    // Atualiza os Cards Principais
    document.getElementById('receita-dia').innerText = hoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('receita-mes').innerText = mesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-vendas').innerText = dados.total_vendas || 0;
    
    // Se aqui continuar aparecendo 0, verifique o passo 2 abaixo
    document.getElementById('total-clientes').innerText = dados.total_clientes || 0;

    // Renderiza as variações (Rendimento/Queda)
    estilizarComparativo(document.getElementById('comparativo-dia'), calcularVariacao(hoje, ontem));
    estilizarComparativo(document.getElementById('comparativo-mes'), calcularVariacao(mesAtual, mesAnterior));
}

// 4. FUNÇÕES DE CÁLCULO E ESTILO
function calcularVariacao(atual, anterior) {
    if (anterior <= 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
}

function estilizarComparativo(elemento, variacao) {
    if (!elemento) return;
    if (variacao > 0) {
        elemento.innerText = `↑ +${variacao.toFixed(1)}% rendimento`;
        elemento.className = "text-[10px] font-bold p-1 rounded-lg inline-block bg-green-50 text-green-600";
    } else if (variacao < 0) {
        elemento.innerText = `↓ ${Math.abs(variacao).toFixed(1)}% queda`;
        elemento.className = "text-[10px] font-bold p-1 rounded-lg inline-block bg-red-50 text-red-600";
    } else {
        elemento.innerText = "Estável";
        elemento.className = "text-[10px] font-bold p-1 rounded-lg inline-block bg-gray-100 text-gray-500";
    }
}

// 5. GESTÃO DE PRODUTOS (RESTANTE DO SEU CÓDIGO...)
async function carregarProdutosAdmin() {
    try {
        const resp = await fetch('http://191.252.214.27:3000/produtos');
        const produtos = await resp.json();
        const container = document.getElementById('lista-admin');

        container.innerHTML = produtos.length ? produtos.map(p => `
            <div class="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all">
                <div class="flex items-center gap-4">
                    <img src="${p.imagem_url || 'https://via.placeholder.com/50'}" class="w-12 h-12 rounded-lg object-cover shadow-sm">
                    <div class="max-w-[150px] md:max-w-xs text-left">
                        <h4 class="font-bold text-gray-800 truncate">${p.nome}</h4>
                        <p class="text-xs text-green-600 font-bold">R$ ${parseFloat(p.preco).toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick='prepararEdicao(${JSON.stringify(p)})' class="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 transition">✏️</button>
                    <button onclick="excluirProduto(${p.id})" class="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition">🗑️</button>
                </div>
            </div>
        `).join('') : '<p class="text-gray-400">Nenhum produto cadastrado.</p>';
    } catch (err) { console.error("Erro ao listar produtos:", err); }
}

// Mantenha suas funções prepararEdicao, limparFormulario, excluirProduto e o onsubmit aqui...

window.onload = validarAcesso;