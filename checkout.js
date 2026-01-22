let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    // Verifica se o carrinho existe e tem itens
    if (!carrinho || carrinho.length === 0) return window.location.href = 'index.html';

    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
    // Atualiza o valor na tela com formatação brasileira
    const valorDisplay = document.getElementById('valor-final');
    if (valorDisplay) {
        valorDisplay.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    gerarPixReal(total);
});

async function gerarPixReal(total) {
    const email = localStorage.getItem('prof_email');
    const statusText = document.getElementById('pix-code');

    try {
        const response = await fetch('http://191.252.214.27:3000/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, total })
        });

        if (!response.ok) throw new Error("Erro na resposta do servidor");

        const data = await response.json();

        // O segredo está aqui: verificar se o qr_code existe
        if (data.qr_code_base64 && data.qr_code) {
            paymentId = data.id;
            pixCopiaECola = data.qr_code;

            // 1. Remove o Loader
            const loader = document.getElementById('qr-loader');
            if (loader) loader.classList.add('hidden');

            // 2. Renderiza a Imagem (Mudei para image/png que é o padrão MP)
            const img = document.getElementById('qr-code-img');
            img.src = `data:image/png;base64,${data.qr_code_base64}`;
            img.classList.remove('hidden');

            // 3. Exibe o código de texto para o usuário ver
            if (statusText) {
                statusText.innerText = pixCopiaECola;
                statusText.classList.remove('text-gray-400'); // Garante que a cor mude se estiver cinza
            }

            iniciarVerificacaoStatus(data.id);
        } else {
            throw new Error("Dados do Pix incompletos");
        }
    } catch (error) {
        console.error("Erro ao gerar Pix:", error);
        if (statusText) statusText.innerText = "Erro ao gerar código. Tente novamente.";
    }
}

function iniciarVerificacaoStatus(id) {
    // Limpa intervalos anteriores se existirem
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`http://191.252.214.27:3000/verificar-pagamento/${id}`);
            const data = await res.json();

            // Verifica se o status é aprovado
            if (data.status === 'approved' || data.status === 'pago') {
                clearInterval(checkInterval);
                finalizarCompraSucesso();
            }
        } catch (e) {
            console.log("Conexão instável, tentando novamente...");
        }
    }, 5000); 
}

async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        // Registro da venda no banco de dados
        await fetch('http://191.252.214.27:3000/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // Limpeza e Redirecionamento
        localStorage.removeItem('edu_cart');
        window.location.href = 'meus-materiais.html?sucesso=true';
    } catch (err) {
        console.error("Erro ao registrar venda, mas o pagamento foi feito:", err);
        // Mesmo com erro no registro, redirecionamos para que o suporte possa ajudar
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

function copyPix() {
    if (!pixCopiaECola) return alert("Aguarde o código ser gerado.");
    
    const btn = document.getElementById('btn-copy');

    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "✅ COPIADO!";
        
        // Efeito visual de sucesso no botão
        const originalClasses = btn.className;
        btn.classList.add('bg-green-600');
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('bg-green-600');
        }, 2500);
    }).catch(err => {
        // Fallback para navegadores que bloqueiam clipboard
        const input = document.createElement('input');
        input.value = pixCopiaECola;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert("Código Copiado!");
    });
    
}