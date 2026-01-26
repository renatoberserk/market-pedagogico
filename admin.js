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

        if (!produtos || produtos.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-10 italic">Nenhum produto cadastrado.</p>';
            return;
        }

        container.innerHTML = ""; // Limpa para renderizar
        produtos.forEach(p => {
            const item = document.createElement('div');
            item.className = "flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all";
            item.innerHTML = `
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
                    <button class="btn-editar bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 transition shadow-sm">✏️</button>
                    <button onclick="excluirProduto(${p.id})" class="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition shadow-sm">🗑️</button>
                </div>
            `;
            // Forma segura de passar o objeto sem quebrar o JSON no HTML
            item.querySelector('.btn-editar').onclick = () => prepararEdicao(p);
            container.appendChild(item);
        });
    } catch (err) { console.error("Erro ao listar produtos:", err); }
}

// 5. SALVAR OU EDITAR
async function salvarProduto() {
    const dados = {
        email_admin: emailLogado,
        nome: document.getElementById('prod-nome').value,
        preco: document.getElementById('prod-preco').value,
        categoria: document.getElementById('prod-categoria').value,
        imagem_url: document.getElementById('prod-img').value,
        link_download: document.getElementById('prod-link').value,
        descricao: document.getElementById('prod-descricao').value,
        foto_extra1: document.getElementById('prod-foto1').value,
        foto_extra2: document.getElementById('prod-foto2').value
    };

    const url = modoEdicaoId 
        ? `https://educamateriais.shop/produtos/${modoEdicaoId}` 
        : 'https://educamateriais.shop/produtos';

    try {
        const response = await fetch(url, {
            method: modoEdicaoId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await response.json();
        if (response.ok && resultado.sucesso) {
            alert("Produto salvo com sucesso!");
            limparFormulario();
            carregarProdutosAdmin();
        } else {
            alert("Erro: " + (resultado.erro || "Falha ao salvar"));
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

// 6. AUXILIARES
function prepararEdicao(produto) {
    modoEdicaoId = produto.id;
    document.getElementById('prod-nome').value = produto.nome;
    document.getElementById('prod-preco').value = produto.preco;
    document.getElementById('prod-img').value = produto.imagem_url;
    document.getElementById('prod-link').value = produto.link_download;
    document.getElementById('prod-categoria').value = produto.categoria;
    document.getElementById('prod-descricao').value = produto.descricao || "";
    document.getElementById('prod-foto1').value = produto.foto_extra1 || "";
    document.getElementById('prod-foto2').value = produto.foto_extra2 || "";

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
    if (!confirm("Excluir este material?")) return;
    try {
        const resp = await fetch(`https://educamateriais.shop/produtos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailLogado })
        });
        if (resp.ok) { carregarProdutosAdmin(); }
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

async function salvarOfertaGeral(event) {
    if (event) event.preventDefault();
    const btnSalvar = event?.currentTarget;

    const dados = {
        titulo: document.getElementById('oferta-titulo').value.trim(),
        preco: document.getElementById('oferta-preco').value.replace(',', '.'),
        link: document.getElementById('oferta-link').value.trim(),
        capa: document.getElementById('oferta-capa').value.trim(),
        foto1: document.getElementById('oferta-foto1').value.trim(),
        foto2: document.getElementById('oferta-foto2').value.trim()
    };

    try {
        if (btnSalvar) btnSalvar.innerText = "⏳ SALVANDO...";
        const response = await fetch('https://educamateriais.shop/api/salvar-oferta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            document.getElementById('container-link-final')?.classList.remove('hidden');
            alert("🚀 Oferta atualizada!");
        }
    } catch (err) { console.error(err); }
    finally { if (btnSalvar) btnSalvar.innerText = "💾 SALVAR E ATUALIZAR SITE"; }
}

function copiarLinkOferta() {
    const input = document.getElementById('link-final-input');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert("Copiado!");
}

// INICIALIZAÇÃO ÚNICA
window.onload = validarAcesso;