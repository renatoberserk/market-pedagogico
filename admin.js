document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const emailAdmin = localStorage.getItem('prof_email'); // Recupera o e-mail do admin logado

    const dados = {
        email_admin: emailAdmin, // Enviando para passar na segurança do seu backend
        nome: document.getElementById('edit-nome').value,
        preco: document.getElementById('edit-preco').value,
        descricao: document.getElementById('edit-descricao').value,
        imagem_url: document.getElementById('edit-capa').value,
        foto1: document.getElementById('edit-foto1').value,
        link_download: document.getElementById('edit-link').value,
        categoria: document.getElementById('edit-categoria').value // Verifique se tem esse campo no HTML
    };

    try {
        const res = await fetch(`https://educamateriais.shop/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await res.json();

        if (resultado.sucesso) {
            alert("✅ Produto atualizado com sucesso!");
            fecharModal();
            carregarProdutosAdmin(); // Recarrega a lista
        } else {
            alert("❌ Erro: " + (resultado.erro || "Falha ao atualizar"));
        }
    } catch (err) {
        console.error("Erro na requisição:", err);
        alert("💥 Erro de conexão com o servidor.");
    }
});