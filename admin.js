 const emailLogado = localStorage.getItem('prof_email');
        let modoEdicaoId = null; // Armazena o ID se estivermos editando

        // 1. VERIFICAÇÃO DE ACESSO
        async function validarAcesso() {
            if (!emailLogado) { window.location.href = 'index.html'; return; }
            try {
                const resp = await fetch(`http://localhost:3000/verificar-admin?email=${emailLogado}`);
                const data = await resp.json();
                if (data.isAdmin) {
                    document.getElementById('painel-admin').style.display = 'block';
                    document.getElementById('admin-welcome').innerText = "Modo Administrador Ativo";
                    carregarProdutosAdmin();
                } else {
                    alert("Acesso Negado!");
                    window.location.href = 'index.html';
                }
            } catch (err) { window.location.href = 'index.html'; }
        }

        // 2. CARREGAR E EXIBIR PRODUTOS COM BOTÕES DE AÇÃO
        async function carregarProdutosAdmin() {
            const resp = await fetch('http://localhost:3000/produtos');
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
        }

        // 3. PREPARAR FORMULÁRIO PARA EDIÇÃO
        function prepararEdicao(p) {
            modoEdicaoId = p.id;
            document.getElementById('form-title').innerText = "Editando Material";
            document.getElementById('img-prod').value = p.imagem_url || '';
            document.getElementById('nome-prod').value = p.nome;
            document.getElementById('preco-prod').value = p.preco;
            document.getElementById('link-prod').value = p.link_download;
            
            document.getElementById('btn-submit').innerText = "Salvar Alterações";
            document.getElementById('btn-submit').classList.replace('bg-orange-500', 'bg-blue-600');
            document.getElementById('btn-cancelar').classList.remove('hidden');
        }

        function limparFormulario() {
            modoEdicaoId = null;
            document.getElementById('form-produto').reset();
            document.getElementById('form-title').innerText = "Cadastrar Novo PDF";
            document.getElementById('btn-submit').innerText = "Publicar Material";
            document.getElementById('btn-submit').classList.replace('bg-blue-600', 'bg-orange-500');
            document.getElementById('btn-cancelar').classList.add('hidden');
        }

        // 4. AÇÃO DE EXCLUIR
        async function excluirProduto(id) {
            if (!confirm("Deseja realmente excluir este material?")) return;
            const res = await fetch(`http://localhost:3000/produtos/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_admin: emailLogado })
            });
            if (res.ok) { carregarProdutosAdmin(); }
        }

        // 5. SALVAR (NOVO OU EDIÇÃO)
        document.getElementById('form-produto').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                email_admin: emailLogado,
                nome: document.getElementById('nome-prod').value,
                preco: document.getElementById('preco-prod').value,
                link_download: document.getElementById('link-prod').value,
                imagem_url: document.getElementById('img-prod').value
            };

            const url = modoEdicaoId ? `http://localhost:3000/produtos/${modoEdicaoId}` : 'http://localhost:3000/produtos';
            const method = modoEdicaoId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("✅ Operação realizada com sucesso!");
                limparFormulario();
                carregarProdutosAdmin();
            } else {
                alert("❌ Erro no servidor.");
            }
        };

        window.onload = validarAcesso;