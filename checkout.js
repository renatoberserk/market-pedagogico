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

    // Efeitos visuais adicionais para a página de pagamento

// Animação quando o código PIX é copiado
function showCopiedMessage() {
    const message = document.createElement('div');
    message.className = 'copied-message';
    message.textContent = 'Código PIX copiado!';
    document.body.appendChild(message);
    
    setTimeout(() => message.classList.add('show'), 10);
    
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
    }, 2000);
}

// Atualize sua função copyPix() para incluir:
function copyPix() {
    const pixCode = document.getElementById('pix-code').textContent;
    navigator.clipboard.writeText(pixCode).then(() => {
        const btn = document.getElementById('btn-copy');
        const originalText = btn.textContent;
        
        // Efeito visual no botão
        btn.classList.add('copied');
        btn.textContent = '✓ COPIADO!';
        showCopiedMessage();
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = originalText;
        }, 2000);
    });
}

// Simulação de confirmação de pagamento (para demonstração)
function simulatePaymentConfirmation() {
    const header = document.getElementById('status-header');
    const statusText = document.getElementById('status-text');
    const pulseDot = document.getElementById('pulse-dot');
    
    setTimeout(() => {
        // Atualiza status
        header.classList.add('pagamento-confirmado');
        statusText.textContent = 'Pagamento Confirmado ✓';
        pulseDot.style.background = '#059669';
        pulseDot.style.animation = 'none';
        
        // Efeito de confetti
        const confetti = document.createElement('div');
        confetti.className = 'confetti active';
        confetti.style.background = 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 20%, rgba(16, 185, 129, 0.1) 21%, transparent 22%)';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3000);
    }, 5000); // Simula confirmação após 5 segundos
}

}