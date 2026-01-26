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
document.getElementById('form-produto')?.addEventListener('submit', function (e) {
    e.preventDefault();
    salvarProduto();
});

async function salvarProduto() {
    const nome = document.getElementById('prod-nome').value;
    const preco = document.getElementById('prod-preco').value;
    const categoria = document.getElementById('prod-categoria').value; // Pegando a categoria
    const imagem_url = document.getElementById('prod-img').value;
    const link_download = document.getElementById('prod-link').value;
    const email_admin = localStorage.getItem('prof_email'); // Pegando o e-mail logado

    // O corpo da requisição agora tem TUDO o que o servidor pede
    const dados = {
        email_admin,
        nome,
        preco,
        categoria,
        imagem_url,
        link_download
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
            alert("Sucesso!");
            limparFormulario();
            carregarProdutosAdmin();
        } else {
            alert("Erro: " + (resultado.erro || "Falha ao salvar"));
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
    if (!confirm("Tem certeza que deseja excluir este material permanentemente?")) return;

    try {
        // Buscamos o email do admin que está logado no navegador
        const emailLogado = localStorage.getItem('prof_email');

        const resp = await fetch(`https://educamateriais.shop/produtos/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            // O seu backend exige o email_admin para validar o process.env.ADMIN_EMAIL
            body: JSON.stringify({ email_admin: emailLogado })
        });

        if (resp.ok) {
            alert("Material removido com sucesso!");
            carregarProdutosAdmin(); // Atualiza a lista na tela
        } else {
            const erro = await resp.json();
            alert("Erro ao excluir: " + (erro.erro || "Não autorizado"));
        }
    } catch (err) {
        console.error("Erro na conexão ao tentar excluir:", err);
        alert("Erro de conexão. Verifique se o SSL do domínio está ativo.");
    }
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

async function salvarOfertaGeral() {
    const dados = {
        titulo: document.getElementById('oferta-titulo').value.trim(),
        preco: document.getElementById('oferta-preco').value.replace(',', '.'),
        link: document.getElementById('oferta-link').value.trim(),
        capa: document.getElementById('oferta-capa').value.trim(),
        foto1: document.getElementById('oferta-foto1').value.trim(),
        foto2: document.getElementById('oferta-foto2').value.trim()
    };

    if (!dados.preco || !dados.link || !dados.titulo) {
        alert("⚠️ Título, Preço e Link do Drive são obrigatórios!");
        return;
    }

    try {
        const response = await fetch('https://educamateriais.shop/api/salvar-oferta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            // Mostra o container de sucesso
            document.getElementById('container-link-final').classList.remove('hidden');
            
            // Feedback visual no botão
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = "✅ ATUALIZADO!";
            btn.classList.replace('text-indigo-600', 'text-green-600');
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.replace('text-green-600', 'text-indigo-600');
            }, 3000);
            
            alert("🚀 Site atualizado com sucesso!");
        } else {
            alert("❌ Erro ao salvar no servidor.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ Erro de conexão.");
    }
}

function copiarLinkOferta() {
    const input = document.getElementById('link-final-input');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert("Link da oferta copiado!");
}


// Adicione isso para garantir que o formulário NÃO use o método padrão (GET)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-produto');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault(); // ISSO impede o erro "Cannot GET"

        };
    }
});
window.onload = validarAcesso;

// await salvarProduto();
//             await carregarConfigOferta(); 