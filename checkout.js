let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    if (!carrinho || carrinho.length === 0) return window.location.href = 'index.html';

    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
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

        if (data.qr_code_base64 && data.qr_code) {
            paymentId = data.id;
            pixCopiaECola = data.qr_code;

            // Interface
            document.getElementById('qr-loader')?.classList.add('hidden');
            const img = document.getElementById('qr-code-img');
            if (img) {
                img.src = `data:image/png;base64,${data.qr_code_base64}`;
                img.classList.remove('hidden');
            }

            if (statusText) {
                statusText.innerText = pixCopiaECola;
                statusText.classList.remove('text-gray-400');
            }

            iniciarVerificacaoStatus(data.id);
        }
    } catch (error) {
        console.error("Erro:", error);
        if (statusText) statusText.innerText = "Erro ao gerar código. Tente novamente.";
    }
}

function iniciarVerificacaoStatus(id) {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`http://191.252.214.27:3000/verificar-pagamento/${id}`);
            const data = await res.json();

            if (data.status === 'approved' || data.status === 'pago') {
                clearInterval(checkInterval);
                executarEfeitoSucesso(); // Novo efeito visual
                setTimeout(finalizarCompraSucesso, 2000); // Aguarda o efeito antes de redirecionar
            }
        } catch (e) {
            console.log("Aguardando confirmação...");
        }
    }, 5000); 
}

// Unificação da função de cópia com efeitos visuais
function copyPix() {
    if (!pixCopiaECola) return alert("Aguarde o código ser gerado.");
    
    const btn = document.getElementById('btn-copy');

    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const originalText = btn.innerText;
        
        // Efeito no botão
        btn.innerText = "✅ COPIADO!";
        btn.classList.add('bg-green-600', 'scale-105');
        
        // Mensagem flutuante (Toast)
        showToast("Código PIX copiado!");

        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('bg-green-600', 'scale-105');
        }, 2500);
    });
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg z-50 transition-opacity duration-300';
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.opacity = '0', 2000);
    setTimeout(() => toast.remove(), 2300);
}

function executarEfeitoSucesso() {
    const statusText = document.getElementById('status-text');
    const pulseDot = document.getElementById('pulse-dot');
    
    if (statusText) statusText.textContent = 'Pagamento Confirmado ✓';
    if (pulseDot) {
        pulseDot.style.background = '#059669';
        pulseDot.style.animation = 'none';
    }
    showToast("Pagamento aprovado! Redirecionando...");
}

async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        await fetch('http://191.252.214.27:3000/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        localStorage.removeItem('edu_cart');
        window.location.href = 'meus-materiais.html?sucesso=true';
    } catch (err) {
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}