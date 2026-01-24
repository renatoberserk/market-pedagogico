const emailLogado = localStorage.getItem('prof_email');
let modoEdicaoId = null;

// 1. VERIFICAÇÃO DE ACESSO E INICIALIZAÇÃO
async function validarAcesso() {
    if (!emailLogado) { window.location.href = 'index.html'; return; }
    try {
        const resp = await fetch(`https://educamateriais.shop/verificar-admin?email=${emailLogado}`);
        const data = await resp.json();

        if (data.isAdmin) {
            document.getElementById('painel-admin').style.display = 'block';
            document.getElementById('admin-welcome').innerText = "Modo Administrador Ativo";

            // Inicia o carregamento unificado dos dados
            carregarProdutosAdmin();
            carregarDashboard();
        } else {
            alert("Acesso Negado!");
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error("Erro no acesso:", err);
        window.location.href = 'index.html';
    }
}

// 2. BUSCAR DADOS DO SERVIDOR (DASHBOARD + CLIENTES)
async function carregarDashboard() {
    try {
        // Esta rota agora traz vendas, receitas e a lista de clientes
        const response = await fetch('https://educamateriais.shop/admin/stats');
        const dados = await response.json();

        console.log("Dados recebidos do servidor:", dados);
        atualizarEstatisticasVisual(dados);
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
    }
}

// 3. ATUALIZAR INTERFACE VISUAL (CARDS E TABELA)
function atualizarEstatisticasVisual(dados) {
    // Atualiza os Cards Principais
    document.getElementById('receita-dia').innerText = (dados.hoje || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('receita-mes').innerText = (dados.mes_atual || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-vendas').innerText = dados.total_vendas || 0;

    // --- CORREÇÃO DO CONTADOR DE CLIENTES ---
    // Se a lista de clientes vier preenchida, usamos o tamanho dela para o contador
    const totalClientesElement = document.getElementById('total-clientes');
    if (dados.lista_clientes && totalClientesElement) {
        totalClientesElement.innerText = dados.lista_clientes.length;
    } else if (totalClientesElement) {
        totalClientesElement.innerText = dados.total_clientes || 0;
    }

    // Preenche a tabela de Clientes (Jade, Vanessa, Didi)
    const tabelaBody = document.getElementById('tabela-clientes-recentes');
    if (tabelaBody && dados.lista_clientes) {
        tabelaBody.innerHTML = dados.lista_clientes.map(cliente => `
    <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
        <td class="py-4 text-sm font-bold text-gray-700">${cliente.nome}</td>
        <td class="py-4 text-sm text-gray-500">${cliente.email}</td>
        <td class="py-4 text-xs text-gray-400">
            ${new Date(cliente.data_cadastro).toLocaleDateString('pt-BR')}
        </td>
        <td class="py-4 text-right">
            <button onclick="excluirUsuario('${cliente.email}')" 
                    class="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                🗑️
            </button>
        </td>
    </tr>
`).join('');
    }

    // Comparações de rendimento (Ontem vs Hoje)
    estilizarComparativo(document.getElementById('comparativo-dia'), calcularVariacao(dados.hoje, dados.ontem));
    estilizarComparativo(document.getElementById('comparativo-mes'), calcularVariacao(dados.mes_atual, dados.mes_anterior));
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

// 5. GESTÃO DE PRODUTOS
async function carregarProdutosAdmin() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
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

// 6. SALVAR OU EDITAR PRODUTO
async function salvarProduto() {
    const nome = document.getElementById('prod-nome').value;
    const preco = document.getElementById('prod-preco').value;
    const categoria = document.getElementById('prod-categoria').value; // A nova categoria aqui!
    const imagem_url = document.getElementById('prod-img').value;
    const link_download = document.getElementById('prod-link').value;

    if (!nome || !preco || !link_download) {
        alert("Por favor, preencha os campos obrigatórios!");
        return;
    }

    const dados = { nome, preco, categoria, imagem_url, link_download };

    // Se modoEdicaoId tiver um ID, ele edita (PUT), se não, cria novo (POST)
    const url = modoEdicaoId
        ? `https://educamateriais.shop/produtos/${modoEdicaoId}`
        : 'https://educamateriais.shop/produtos';

    const metodo = modoEdicaoId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert(modoEdicaoId ? "Produto atualizado!" : "Produto criado com sucesso!");
            fecharModal(); // Certifique-se de ter uma função para fechar o modal
            carregarProdutosAdmin(); // Recarrega a lista para mostrar o novo produto
        } else {
            alert("Erro ao salvar produto no servidor.");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

async function excluirUsuario(email) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return;

    try {
        const response = await fetch(`https://educamateriais.shop/admin/usuarios/${email}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailLogado }) // emailLogado já existe no topo do seu script
        });

        const resultado = await response.json();
        if (resultado.sucesso) {
            alert("Usuário excluído!");
            carregarDashboard(); // Recarrega a tabela e o contador automaticamente
        } else {
            alert("Erro ao excluir: " + resultado.erro);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

function prepararEdicao(produto) {
    modoEdicaoId = produto.id;
    
    // Preenchimento com proteção contra campos nulos
    document.getElementById('prod-nome').value = produto.nome || "";
    document.getElementById('prod-preco').value = produto.preco || 0;
    document.getElementById('prod-img').value = produto.imagem_url || "";
    document.getElementById('prod-link').value = produto.link_download || "";
    
    // Verifica se o elemento existe antes de tentar atribuir valor
    const campoCategoria = document.getElementById('prod-categoria');
    if (campoCategoria) {
        campoCategoria.value = produto.categoria || "atividades";
    }

    document.getElementById('modal-titulo').innerText = "Editar Material";
    document.getElementById('modal-produto').style.display = 'flex'; 
}

// Inicialização única
window.onload = validarAcesso;