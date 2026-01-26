let produtosAdmin = [];

document.addEventListener('DOMContentLoaded', carregarProdutosAdmin);

async function carregarProdutosAdmin() {
    try {
        const res = await fetch('https://educamateriais.shop/produtos');
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
        <div class="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex flex-col h-full">
            <img src="${p.imagem_url}" class="w-full h-32 object-cover rounded-2xl mb-4 bg-gray-50">
            <div class="flex-grow">
                <h3 class="font-bold text-gray-800 text-sm mb-1 line-clamp-1">${p.nome}</h3>
                <p class="text-orange-500 font-bold text-xs mb-4">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="prepararEdicao('${p.id}')" class="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-[10px] font-bold uppercase hover:bg-orange-500 hover:text-white transition-all">Editar</button>
                <button onclick="deletarProduto('${p.id}')" class="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-all">Excluir</button>
            </div>
        </div>
    `).join('');
}

// SOLUÇÃO PARA O ERRO: Função para Abrir Cadastro (Novo)
function abrirModalCadastro() {
    document.getElementById('modal-titulo').innerText = "Cadastrar Novo Material";
    document.getElementById('form-produto').reset(); // Limpa todos os campos
    document.getElementById('edit-id').value = "";   // Garante que o ID está vazio
    document.getElementById('modal-produto').style.display = 'flex';
}

// Função para Abrir Edição (Existente)
function prepararEdicao(id) {
    const p = produtosAdmin.find(item => item.id == id);
    if (!p) return;

    document.getElementById('modal-titulo').innerText = "Editar Material";
    document.getElementById('edit-id').value = p.id;
    document.getElementById('edit-nome').value = p.nome || "";
    document.getElementById('edit-preco').value = p.preco || "";
    document.getElementById('edit-descricao').value = p.descricao || "";
    document.getElementById('edit-capa').value = p.imagem_url || "";
    document.getElementById('edit-foto1').value = p.foto1 || "";
    document.getElementById('edit-link').value = p.link_download || "";
    
    // Se você tiver o campo categoria no HTML:
    const campoCat = document.getElementById('edit-categoria');
    if(campoCat) campoCat.value = p.categoria || "Atividades";

    document.getElementById('modal-produto').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-produto').style.display = 'none';
}

// SALVAR (POST para novos / PUT para existentes)
document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const emailAdmin = localStorage.getItem('prof_email');

    const dados = {
        email_admin: emailAdmin,
        nome: document.getElementById('edit-nome').value,
        preco: document.getElementById('edit-preco').value,
        descricao: document.getElementById('edit-descricao').value,
        imagem_url: document.getElementById('edit-capa').value,
        foto1: document.getElementById('edit-foto1').value,
        link_download: document.getElementById('edit-link').value,
        categoria: document.getElementById('edit-categoria')?.value || "Atividades"
    };

    // Define se vai criar ou editar baseado na existência do ID
    const url = id ? `https://educamateriais.shop/produtos/${id}` : `https://educamateriais.shop/produtos`;
    const metodo = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await res.json();

        if (resultado.sucesso || resultado.success) {
            alert("✅ Operação realizada com sucesso!");
            fecharModal();
            carregarProdutosAdmin();
        } else {
            alert("❌ Erro: " + (resultado.erro || "Falha na operação"));
        }
    } catch (err) {
        alert("💥 Erro ao conectar com o servidor.");
    }
});

// EXCLUIR PRODUTO
async function deletarProduto(id) {
    if (!confirm("Tem certeza que deseja excluir este material permanentemente?")) return;

    const emailAdmin = localStorage.getItem('prof_email');

    try {
        const res = await fetch(`https://educamateriais.shop/produtos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_admin: emailAdmin })
        });

        if (res.ok) {
            alert("🗑️ Produto removido!");
            carregarProdutosAdmin();
        }
    } catch (err) {
        alert("Erro ao excluir.");
    }
}

// ... (resto do código igual)

function prepararEdicao(id) {
    const p = produtosAdmin.find(item => item.id == id);
    if (!p) return;

    document.getElementById('modal-titulo').innerText = "Editar Material";
    document.getElementById('edit-id').value = p.id;
    document.getElementById('edit-nome').value = p.nome || "";
    document.getElementById('edit-preco').value = p.preco || "";
    document.getElementById('edit-descricao').value = p.descricao || "";
    document.getElementById('edit-capa').value = p.imagem_url || "";
    // Ajustado para os nomes do banco:
    document.getElementById('edit-foto1').value = p.foto_extra1 || "";
    document.getElementById('edit-foto2').value = p.foto_extra2 || ""; 
    document.getElementById('edit-categoria').value = p.categoria || "";
    document.getElementById('edit-link').value = p.link_download || "";

    document.getElementById('modal-produto').style.display = 'flex';
}

document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const emailAdmin = localStorage.getItem('prof_email');

    const dados = {
        email_admin: emailAdmin,
        nome: document.getElementById('edit-nome').value,
        preco: document.getElementById('edit-preco').value,
        descricao: document.getElementById('edit-descricao').value,
        imagem_url: document.getElementById('edit-capa').value,
        foto_extra1: document.getElementById('edit-foto1').value, // Nome do banco
        foto_extra2: document.getElementById('edit-foto2').value, // Nome do banco
        link_download: document.getElementById('edit-link').value,
        categoria: document.getElementById('edit-categoria').value
    };

    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `https://educamateriais.shop/produtos/${id}` : `https://educamateriais.shop/produtos`;

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (res.ok) {
            alert("✅ Atualizado com sucesso!");
            fecharModal();
            carregarProdutosAdmin();
        } else {
            const errData = await res.json();
            alert("❌ Erro: " + errData.erro);
        }
    } catch (err) { alert("Erro de conexão."); }
});