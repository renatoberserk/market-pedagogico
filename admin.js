let produtosAdmin = [];

// Garante que o script rode apenas após o HTML carregar
document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosAdmin();
    configurarFormulario();
});

// --- CARREGAMENTO E RENDERIZAÇÃO ---
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
    if (!container) return; // Segurança contra erro de 'null'
    
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

// --- NAVEGAÇÃO ENTRE ABAS ---
function mudarAba(idAba, botao) {
    const secoes = document.querySelectorAll('.aba-conteudo');
    const botoes = document.querySelectorAll('.menu-btn');

    if (!document.getElementById(idAba)) return;

    // 1. Esconde todas as seções
    secoes.forEach(aba => aba.classList.add('hidden'));

    // 2. Mostra a aba selecionada
    document.getElementById(idAba).classList.remove('hidden');

    // 3. Reseta e ativa botões
    botoes.forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('text-slate-500');
    });

    if (botao) {
        botao.classList.add('active-tab');
        botao.classList.remove('text-slate-500');
    }

    // 4. Cargas específicas
    if (idAba === 'aba-usuarios') carregarUsuarios();
    if (idAba === 'aba-faturamento') carregarRelatorios();
}

// --- MODAL ---
function abrirModalCadastro() {
    const modal = document.getElementById('modal-produto');
    const form = document.getElementById('form-produto');
    const titulo = document.getElementById('modal-titulo');

    if (titulo) titulo.innerText = "Novo Produto";
    if (form) form.reset();
    
    const inputId = document.getElementById('edit-id');
    if (inputId) inputId.value = ""; 

    if (modal) modal.style.display = 'flex'; // Usando style para garantir visibilidade
}

function fecharModal() {
    const modal = document.getElementById('modal-produto');
    if (modal) modal.style.display = 'none';
}

function prepararEdicao(id) {
    const p = produtosAdmin.find(item => item.id == id);
    if (!p) return;

    // Preenchimento seguro
    const campos = {
        'modal-titulo': 'Editar Material',
        'edit-id': p.id,
        'edit-nome': p.nome || "",
        'edit-preco': p.preco || "",
        'edit-descricao': p.descricao || "",
        'edit-capa': p.imagem_url || "",
        'edit-foto1': p.foto_extra1 || "",
        'edit-foto2': p.foto_extra2 || "",
        'edit-categoria': p.categoria || "Atividades",
        'edit-link': p.link_download || ""
    };

    for (const [idElemento, valor] of Object.entries(campos)) {
        const el = document.getElementById(idElemento);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.value = valor;
            } else {
                el.innerText = valor;
            }
        }
    }

    const modal = document.getElementById('modal-produto');
    if (modal) modal.style.display = 'flex';
}

// --- AÇÕES (CRUD) ---
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
                alert("✅ Sucesso!");
                fecharModal();
                carregarProdutosAdmin();
            } else {
                alert("❌ Erro ao salvar.");
            }
        } catch (err) {
            alert("💥 Erro na conexão.");
        }
    });
}

async function deletarProduto(id) {
    if (!confirm("Excluir permanentemente?")) return;
    const emailAdmin = localStorage.getItem('prof_email');

    try {
        const res = await fetch(`https://educamateriais.shop/produtos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailAdmin })
        });
        if (res.ok) carregarProdutosAdmin();
    } catch (err) { 
        console.error("Erro ao deletar:", err); 
    }
}

// --- FUNÇÕES DE CARGA DE DADOS (STUBS) ---
function carregarUsuarios() {
    const container = document.getElementById('lista-usuarios');
    if (!container) return;
    container.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-slate-400">Carregando usuários...</td></tr>`;
    // Simulação de delay para teste visual
    setTimeout(() => {
        container.innerHTML = `
            <tr>
                <td class="py-4 font-bold text-slate-700">Professor Exemplo</td>
                <td class="py-4 text-slate-500">contato@exemplo.com</td>
                <td class="py-4"><span class="bg-green-100 text-green-600 px-2 py-1 rounded-full text-[9px] font-bold">ATIVO</span></td>
                <td class="py-4"><button class="text-slate-400 hover:text-red-500">Remover</button></td>
            </tr>
        `;
    }, 500);
}

function carregarRelatorios() {
    const fat = document.getElementById('faturamento-total');
    if (fat) fat.innerText = "R$ 1.250,00"; // Exemplo estático
}