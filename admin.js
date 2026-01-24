const emailLogado = localStorage.getItem('prof_email');
let modoEdicaoId = null;

// 1. VERIFICAÇÃO DE ACESSO
async function validarAcesso() {
    if (!emailLogado) { window.location.href = 'index.html'; return; }
    try {
        const resp = await fetch(`https://educamateriais.shop/verificar-admin?email=${emailLogado}`);
        const data = await resp.json();

        if (data.isAdmin) {
            document.getElementById('painel-admin').style.display = 'block';
            document.getElementById('admin-welcome').innerText = "Modo Administrador Ativo";

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

// 2. BUSCAR DADOS DO SERVIDOR (DASHBOARD)
async function carregarDashboard() {
    try {
        const response = await fetch('https://educamateriais.shop/admin/stats');
        const dados = await response.json();
        atualizarEstatisticasVisual(dados);
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
    }
}

// 3. ATUALIZAR INTERFACE (CARDS E TABELA)
function atualizarEstatisticasVisual(dados) {
    document.getElementById('receita-dia').innerText = (dados.hoje || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('receita-mes').innerText = (dados.mes_atual || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-vendas').innerText = dados.total_vendas || 0;

    const totalClientesElement = document.getElementById('total-clientes');
    if (totalClientesElement) {
        totalClientesElement.innerText = dados.lista_clientes ? dados.lista_clientes.length : (dados.total_clientes || 0);
    }

    const tabelaBody = document.getElementById('tabela-clientes-recentes');
    if (tabelaBody && dados.lista_clientes) {
        tabelaBody.innerHTML = dados.lista_clientes.map(cliente => `
            <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="py-4 text-sm font-bold text-gray-700">${cliente.nome}</td>
                <td class="py-4 text-sm text-gray-500">${cliente.email}</td>
                <td class="py-4 text-xs text-gray-400">${new Date(cliente.data_cadastro).toLocaleDateString('pt-BR')}</td>
                <td class="py-4 text-right">
                    <button onclick="excluirUsuario('${cliente.email}')" class="bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    estilizarComparativo(document.getElementById('comparativo-dia'), calcularVariacao(dados.hoje, dados.ontem));
    estilizarComparativo(document.getElementById('comparativo-mes'), calcularVariacao(dados.mes_atual, dados.mes_anterior));
}

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

// 4. GESTÃO DE PRODUTOS (LISTAGEM)
async function carregarProdutosAdmin() {
    try {
        const resp = await fetch('https://educamateriais.shop/produtos');
        const produtos = await resp.json();
        const container = document.getElementById('lista-admin');
        if (!container) return;

        container.innerHTML = produtos.length ? produtos.map(p => `
            <div class="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all">
                <div class="flex items-center gap-4">
                    <img src="${p.imagem_url || 'https://via.placeholder.com/50'}" class="w-12 h-12 rounded-lg object-cover shadow-sm">
                    <div class="max-w-[150px] md:max-w-xs text-left">
                        <h4 class="font-bold text-gray-800 truncate">${p.nome}</h4>
                        <div class="flex items-center gap-2 mt-1">
                            <p class="text-xs text-green-600 font-bold">R$ ${parseFloat(p.preco).toFixed(2)}</p>
                            <span class="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">${p.categoria || 'Geral'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick='prepararEdicao(${JSON.stringify(p)})' class="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 transition shadow-sm">✏️</button>
                    <button onclick="excluirProduto(${p.id})" class="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition shadow-sm">🗑️</button>
                </div>
            </div>
        `).join('') : '<p class="text-gray-400 text-center py-10 italic">Nenhum produto cadastrado.</p>';
    } catch (err) { console.error("Erro ao listar produtos:", err); }
}

// 5. SALVAR OU EDITAR (AÇÃO DO FORMULÁRIO)
// Adicione este Listener para o formulário funcionar ao clicar no botão submit
document.getElementById('form-produto')?.addEventListener('submit', function(e) {
    e.preventDefault();
    salvarProduto();
});

async function salvarProduto() {
    const nome = document.getElementById('prod-nome').value;
    const preco = document.getElementById('prod-preco').value;
    const categoria = document.getElementById('prod-categoria').value;
    const imagem_url = document.getElementById('prod-img').value;
    const link_download = document.getElementById('prod-link').value;

    if (!nome || !preco || !link_download) {
        alert("Por favor, preencha os campos obrigatórios!");
        return;
    }

    const dados = { nome, preco, categoria, imagem_url, link_download };
    const url = modoEdicaoId ? `https://educamateriais.shop/produtos/${modoEdicaoId}` : 'https://educamateriais.shop/produtos';
    const metodo = modoEdicaoId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert(modoEdicaoId ? "Produto atualizado!" : "Produto criado com sucesso!");
            limparFormulario();
            carregarProdutosAdmin();
        } else {
            alert("Erro ao salvar produto.");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

// 6. AUXILIARES (EDIÇÃO E EXCLUSÃO)
function prepararEdicao(produto) {
    modoEdicaoId = produto.id;

    const setCampo = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.value = valor || "";
    };

    setCampo('prod-nome', produto.nome);
    setCampo('prod-preco', produto.preco);
    setCampo('prod-img', produto.imagem_url);
    setCampo('prod-link', produto.link_download);
    setCampo('prod-categoria', produto.categoria);

    document.getElementById('btn-submit').innerText = "Atualizar Material";
    document.getElementById('form-title').innerText = "Editando Material";
    document.getElementById('btn-cancelar')?.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormulario() {
    modoEdicaoId = null;
    document.getElementById('form-produto').reset();
    document.getElementById('btn-submit').innerText = "Publicar Material";
    document.getElementById('form-title').innerText = "Cadastrar Novo PDF";
    document.getElementById('btn-cancelar')?.classList.add('hidden');
}

async function excluirProduto(id) {
    if(!confirm("Excluir este material permanentemente?")) return;
    try {
        const resp = await fetch(`https://educamateriais.shop/produtos/${id}`, { method: 'DELETE' });
        if(resp.ok) carregarProdutosAdmin();
    } catch (err) { console.error(err); }
}

async function excluirUsuario(email) {
    if (!confirm(`Excluir usuário ${email}?`)) return;
    try {
        const response = await fetch(`https://educamateriais.shop/admin/usuarios/${email}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailLogado })
        });
        if (response.ok) carregarDashboard();
    } catch (error) { console.error(error); }
}

window.onload = validarAcesso;