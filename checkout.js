// 1. RECUPERAÇÃO DO LINK
// Isso busca o link que você salvou lá na página da vitrine (index.js)
window.LINK_DRIVE_FINAL = localStorage.getItem('link_pendente');

console.log("🔗 Link recuperado para o checkout:", window.LINK_DRIVE_FINAL);

let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

// 2. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    
    // Verifica se o carrinho existe e tem itens, senão volta para a loja
    if (!carrinho || carrinho.length === 0) {
        window.location.href = 'index.html';
        return;
    }

    // Calcula o total
    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
    // Atualiza o valor na tela com formatação brasileira
    const valorDisplay = document.getElementById('valor-final');
    if (valorDisplay) {
        valorDisplay.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Dispara a geração do Pix
    gerarPixReal(total);
});

// 3. GERAÇÃO DO PIX NO MERCADO PAGO
async function gerarPixReal(total) {
    const email = localStorage.getItem('prof_email');
    const statusText = document.getElementById('pix-code');
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');
    const btnGerar = document.getElementById('btn-gerar-pix');

    // --- TRAVA DE SEGURANÇA ---
    if (!window.LINK_DRIVE_FINAL || window.LINK_DRIVE_FINAL === 'undefined' || window.LINK_DRIVE_FINAL.trim() === "") {
        console.error("❌ Abortado: Tentativa de gerar Pix sem link de produto.");
        alert("Ops! O link do material não foi carregado corretamente. Por favor, volte à loja e selecione o produto novamente.");
        
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.innerHTML = "ERRO: SELECIONE O PRODUTO NOVAMENTE";
        }
        return; 
    }

    if (loader) loader.classList.remove('hidden');
    if (img) img.classList.add('hidden');

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: total,
                link: window.LINK_DRIVE_FINAL 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detalhes || "Erro no servidor");
        }

        const data = await response.json();

        if (data.qr_code_base64 && data.qr_code) {
            paymentId = data.id;
            pixCopiaECola = data.qr_code;

            if (loader) loader.classList.add('hidden');

            if (img) {
                img.src = `data:image/png;base64,${data.qr_code_base64}`;
                img.classList.remove('hidden');
            }

            if (statusText) {
                statusText.innerText = pixCopiaECola;
                statusText.classList.remove('text-gray-400');
            }

            iniciarVerificacaoStatus(data.id);
        } else {
            throw new Error("Resposta do Pix incompleta");
        }
    } catch (error) {
        console.error("Erro ao gerar Pix:", error);
        if (statusText) statusText.innerText = "Erro ao gerar código.";
        if (loader) loader.classList.add('hidden');
    }
}

// 4. VERIFICAÇÃO AUTOMÁTICA DE PAGAMENTO
function iniciarVerificacaoStatus(id) {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();

            if (data.status === 'approved') {
                clearInterval(checkInterval);
                finalizarCompraSucesso(); 
            }
        } catch (e) {
            console.log("Aguardando confirmação...");
        }
    }, 5000); 
}

// 5. FINALIZAÇÃO E LIMPEZA
async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        await fetch('https://educamateriais.shop/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // Limpa os dados de compra para não duplicar
        localStorage.removeItem('edu_cart');
        localStorage.removeItem('link_pendente');
        
        window.location.href = 'meus-materiais.html?sucesso=true';

    } catch (err) {
        console.error("Erro ao registrar venda:", err);
        localStorage.removeItem('edu_cart');
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

// 6. FUNÇÕES DE COPIAR CÓDIGO PIX
function copyPix() {
    const pixElement = document.getElementById('pix-code');
    const textoParaCopiar = pixElement ? pixElement.innerText : pixCopiaECola;

    if (!textoParaCopiar || textoParaCopiar === "Gerando código..." || textoParaCopiar.includes("Erro")) {
        alert("Aguarde o código ser gerado.");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textoParaCopiar).then(() => {
            animarBotaoSucesso();
        }).catch(() => {
            fallbackCopyText(textoParaCopiar);
        });
    } else {
        fallbackCopyText(textoParaCopiar);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        animarBotaoSucesso();
    } catch (err) {
        alert("Copie manualmente o código.");
    }
    document.body.removeChild(textArea);
}

function animarBotaoSucesso() {
    const btn = document.getElementById('btn-copy');
    if (!btn) return;

    const originalText = btn.innerText;
    btn.innerText = "✅ COPIADO!";
    btn.classList.add('bg-green-600');
    
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-green-600');
    }, 2000);
}