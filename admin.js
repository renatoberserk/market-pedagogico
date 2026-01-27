// Forçar o login do admin para teste (substitua pelo seu e-mail real do .env)
localStorage.setItem('prof_email', 'elitonnrenato@gmail.com');

let produtosAdmin = [];

// Inicia o painel
document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosAdmin();
    configurarFormulario();
});

// --- 1. PRODUTOS (VITRINE ADMIN) ---
async function carregarProdutosAdmin() {
    try {
        const res = await fetch(`https://educamateriais.shop/produtos?t=${new Date().getTime()}`);
        produtosAdmin = await res.json();
        renderizarAdmin();
    } catch (err) { 
        console.error("Erro ao carregar produtos:", err); 
    }
}

function renderizarAdmin() {
    const container = document.getElementById('lista-admin');
    if (!container) return;
    
    container.innerHTML = produtosAdmin.map(p => `
        <div class="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
            <img src="${p.imagem_url}" class="w-full h-40 object-cover rounded-2xl mb-4 bg-slate-50">
            <div class="flex-grow">
                <h3 class="font-bold text-slate-800 text-sm mb-1 line-clamp-1">${p.nome}</h3>
                <p class="text-orange-500 font-bold text-xs mb-4">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
                <div class="bg-slate-50 p-3 rounded-xl mb-4">
                    <p class="text-[10px] text-slate-400 uppercase font-black mb-1">Preview Descrição:</p>
                    <p class="text-[11px] text-slate-600 line-clamp-2 italic">${p.descricao || 'Sem descrição cadastrada.'}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="prepararEdicao('${p.id}')" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-orange-500 hover:text-white transition-all">Editar</button>
                <button onclick="deletarProduto('${p.id}')" class="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-all">Excluir</button>
            </div>
        </div>
    `).join('');
}

// --- 2. GESTÃO DE USUÁRIOS ---
async function carregarUsuarios() {
    const corpoTabela = document.getElementById('lista-usuarios-corpo');
    const contador = document.getElementById('contagem-usuarios');
    const emailAdmin = localStorage.getItem('prof_email');

    if (!corpoTabela) return;
    corpoTabela.innerHTML = `<tr><td colspan="2" class="p-10 text-center text-slate-400 text-xs">Carregando...</td></tr>`;

    try {
        const res = await fetch(`https://educamateriais.shop/admin/usuarios?email_admin=${emailAdmin}`);
        const dados = await res.json();

        if (contador) contador.innerText = dados.total || 0;

        if (!dados.lista || dados.lista.length === 0) {
            corpoTabela.innerHTML = `<tr><td colspan="2" class="p-10 text-center text-slate-400 text-xs">Nenhum usuário encontrado.</td></tr>`;
            return;
        }

        corpoTabela.innerHTML = dados.lista.map(u => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                <td class="p-6">
                    <p class="font-bold text-slate-700 text-sm">${u.nome}</p>
                    <p class="text-slate-400 text-[11px]">${u.email}</p>
                </td>
                <td class="p-6 text-right space-x-2">
                    <button onclick="editarUsuario('${u.email}', '${u.nome}')" class="text-blue-500 hover:bg-blue-50 px-3 py-2 rounded-lg font-bold text-[10px] uppercase transition-all">Editar</button>
                    <button onclick="deletarUsuario('${u.email}')" class="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg font-bold text-[10px] uppercase transition-all">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erro ao carregar usuários:", err);
    }
}

async function deletarUsuario(email) {
    if (!confirm(`Deseja excluir permanentemente o usuário ${email}?`)) return;
    const emailAdmin = localStorage.getItem('prof_email');

    try {
        const res = await fetch(`https://educamateriais.shop/admin/usuarios/${email}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailAdmin })
        });

        const resultado = await res.json();
        if (resultado.sucesso) {
            alert("✅ Usuário removido!");
            carregarUsuarios();
        } else {
            alert("❌ Erro: " + (resultado.erro || "Falha ao deletar"));
        }
    } catch (err) {
        alert("💥 Erro de conexão ao deletar.");
    }
}

async function editarUsuario(email, nomeAtual) {
    const novoNome = prompt("Novo nome para o usuário:", nomeAtual);
    if (!novoNome || novoNome === nomeAtual) return;

    const emailAdmin = localStorage.getItem('prof_email');

    try {
        const res = await fetch(`https://educamateriais.shop/admin/usuarios/${email}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: novoNome, email_admin: emailAdmin })
        });

        if (res.ok) {
            alert("✅ Nome atualizado!");
            carregarUsuarios();
        }
    } catch (err) {
        alert("💥 Erro ao editar.");
    }
}

// --- 3. NAVEGAÇÃO E RELATÓRIOS ---
function mudarAba(idAba, botao) {
    const secoes = document.querySelectorAll('.aba-conteudo');
    const botoes = document.querySelectorAll('.menu-btn');

    if (!document.getElementById(idAba)) return;

    secoes.forEach(aba => aba.classList.add('hidden'));
    document.getElementById(idAba).classList.remove('hidden');

    botoes.forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('text-slate-500');
    });

    if (botao) {
        botao.classList.add('active-tab');
        botao.classList.remove('text-slate-500');
    }

    if (idAba === 'aba-usuarios') carregarUsuarios();
    if (idAba === 'aba-faturamento') carregarRelatorios();
}

function carregarRelatorios() {
    const fat = document.getElementById('faturamento-total');
    if (fat) fat.innerText = "R$ 1.250,00"; // Aqui você faria o fetch de vendas depois
}
// --- 4. CRUD PRODUTOS (MODAL) ---
function abrirModalCadastro() {
    const modal = document.getElementById('modal-produto');
    const form = document.getElementById('form-produto');
    
    if (form) form.reset();
    
    // 1. Garante que o ID de edição suma (para ser um novo cadastro)
    document.getElementById('edit-id').value = ""; 
    
    // 2. IMPORTANTE: Garante que o checkbox de oferta comece desmarcado
    const campoOferta = document.getElementById('edit-oferta-ativa');
    if (campoOferta) campoOferta.checked = false;

    document.getElementById('modal-titulo').innerText = "Novo Produto";
    
    if (modal) {
        modal.classList.remove('hidden'); // Caso use Tailwind
        modal.style.display = 'flex';
    }
}

function fecharModal() {
    const modal = document.getElementById('modal-produto');
    if (modal) modal.style.display = 'none';
}


function prepararEdicao(id) {
    const p = produtosAdmin.find(item => item.id == id);
    if (!p) return;

    document.getElementById('modal-titulo').innerText = "Editar Material";
    document.getElementById('edit-id').value = p.id;
    document.getElementById('edit-nome').value = p.nome || "";
    document.getElementById('edit-preco').value = p.preco || "";
    document.getElementById('edit-descricao').value = p.descricao || "";
    document.getElementById('edit-capa').value = p.imagem_url || "";
    document.getElementById('edit-foto1').value = p.foto_extra1 || "";
    document.getElementById('edit-foto2').value = p.foto_extra2 || ""; 
    document.getElementById('edit-categoria').value = p.categoria || "Atividades";
    document.getElementById('edit-link').value = p.link_download || "";
    
    // CORREÇÃO AQUI: Define se o checkbox inicia marcado ou não
    // Se p.oferta_ativa for 1, o checkbox fica marcado (true)
    document.getElementById('edit-oferta-ativa').checked = (p.oferta_ativa == 1);

    const modal = document.getElementById('modal-produto');
    if (modal) {
        modal.classList.remove('hidden'); // Se estiver usando classes do Tailwind
        modal.style.display = 'flex';     // Garantia extra
    }
}

function configurarFormulario() {
    const form = document.getElementById('form-produto');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const emailAdmin = localStorage.getItem('prof_email');

        const dados = {
            email_admin: emailAdmin,
            nome: document.getElementById('edit-nome').value,
            preco: document.getElementById('edit-preco').value,
            descricao: document.getElementById('edit-descricao').value,
            imagem_url: document.getElementById('edit-capa').value,
            foto_extra1: document.getElementById('edit-foto1').value,
            foto_extra2: document.getElementById('edit-foto2').value,
            link_download: document.getElementById('edit-link').value,
            categoria: document.getElementById('edit-categoria').value
        };

        const url = id ? `https://educamateriais.shop/produtos/${id}` : `https://educamateriais.shop/produtos`;
        const metodo = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (res.ok) {
                alert("✅ Salvo com sucesso!");
                fecharModal();
                carregarProdutosAdmin();
            } else {
                alert("❌ Erro ao salvar.");
            }
        } catch (err) {
            alert("💥 Erro de conexão.");
        }
    });
}

async function deletarProduto(id) {
    if (!confirm("Excluir material permanentemente?")) return;
    const emailAdmin = localStorage.getItem('prof_email');

    try {
        await fetch(`https://educamateriais.shop/produtos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailAdmin })
        });
        carregarProdutosAdmin();
    } catch (err) { console.error(err); }
}

async function carregarRelatorios() {
    const emailAdmin = localStorage.getItem('prof_email');
    
    try {
        const res = await fetch(`https://educamateriais.shop/admin/stats?email_admin=${emailAdmin}`);
        const d = await res.json();

        const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Preencher os Cards
        document.getElementById('fat-hoje').innerText = formatar(d.hoje);
        document.getElementById('fat-ontem').innerText = formatar(d.ontem);
        document.getElementById('fat-mes').innerText = formatar(d.mes_atual);
        document.getElementById('fat-ano').innerText = formatar(d.mes_anterior); // Usei para comparar

        // Lógica de Comparação (Crescimento)
        const diff = d.mes_atual - d.mes_anterior;
        const porcentagem = d.mes_anterior > 0 ? (diff / d.mes_anterior) * 100 : 100;
        
        const infoComparacao = document.getElementById('comparacao-resultado');
        if (infoComparacao) {
            infoComparacao.innerHTML = diff >= 0 
                ? `<span class="text-green-500 font-bold">▲ ${porcentagem.toFixed(1)}%</span> mais que o mês passado`
                : `<span class="text-red-500 font-bold">▼ ${Math.abs(porcentagem).toFixed(1)}%</span> menos que o mês passado`;
        }

        renderizarGraficoSimples(d.ontem, d.hoje); // Gráfico básico com dados reais
    } catch (err) {
        console.error("Erro ao processar estatísticas:", err);
    }
}