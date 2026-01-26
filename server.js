// 1. RECUPERAÇÃO DO LINK COM PROTEÇÃO
// O "|| ''" garante que se o localStorage estiver vazio, o código não quebre ao usar .trim()
window.LINK_DRIVE_FINAL = localStorage.getItem('link_pendente') || "";

console.log("🔗 Link recuperado do localStorage:", window.LINK_DRIVE_FINAL);

let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

// 2. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Checkout iniciado...");
    
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    
    // Validação de Carrinho
    if (!carrinho || carrinho.length === 0) {
        console.warn("🛒 Carrinho vazio, redirecionando...");
        window.location.href = 'index.html';
        return;
    }

    // Cálculo do Total
    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
    const valorDisplay = document.getElementById('valor-final');
    if (valorDisplay) {
        valorDisplay.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Dispara a geração automática do Pix
    gerarPixReal(total);
});

// 3. GERAÇÃO DO PIX NO MERCADO PAGO
async function gerarPixReal(total) {
    const email = localStorage.getItem('prof_email') || "";
    const statusText = document.getElementById('pix-code');
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');
    const btnGerar = document.getElementById('btn-gerar-pix');

    // --- BLOQUEIO DE SEGURANÇA (EVITA O ERRO DE NULL) ---
    if (!window.LINK_DRIVE_FINAL || window.LINK_DRIVE_FINAL.trim() === "" || window.LINK_DRIVE_FINAL === "undefined") {
        console.error("❌ ERRO: O link do material está faltando no checkout.");
        alert("Não conseguimos localizar o link do material. Por favor, volte à loja e selecione o produto novamente.");
        if (btnGerar) btnGerar.innerHTML = "ERRO: LINK NÃO ENCONTRADO";
        return; 
    }

    console.log("📡 Enviando link para o servidor:", window.LINK_DRIVE_FINAL.trim());

    if (loader) loader.classList.remove('hidden');
    if (img) img.classList.add('hidden');

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: total,
                link: window.LINK_DRIVE_FINAL.trim() // Agora o .trim() é seguro
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detalhes || "Erro no servidor");
        }

        const data = await response.json();

        if (data.qr_code_base64 && data.qr_code) {
            console.log("✅ Pix gerado com sucesso! ID:", data.id);
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
        console.error("❌ Erro ao gerar Pix:", error);
        if (statusText) statusText.innerText = "Erro ao gerar código. Tente recarregar a página.";
        if (loader) loader.classList.add('hidden');
    }
}

// 4. VERIFICAÇÃO DE PAGAMENTO
function iniciarVerificacaoStatus(id) {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();

            if (data.status === 'approved') {
                console.log("💰 Pagamento aprovado! Finalizando...");
                clearInterval(checkInterval);
                finalizarCompraSucesso(); 
            }
        } catch (e) {
            console.log("⏳ Aguardando confirmação do pagamento...");
        }
    }, 5000); 
}

// 5. REDIRECIONAMENTO APÓS SUCESSO
async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        // Log antes de limpar os dados para garantir que sabemos o que deu certo
        console.log("🎁 Entregando material para:", email);
        console.log("🔗 Link final da entrega:", window.LINK_DRIVE_FINAL);

        await fetch('https://educamateriais.shop/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // Limpa cache de compra
        localStorage.removeItem('edu_cart');
        localStorage.removeItem('link_pendente');
        
        window.location.href = 'meus-materiais.html?sucesso=true';

    } catch (err) {
        console.error("⚠️ Erro ao registrar venda, mas o pagamento foi feito:", err);
        localStorage.removeItem('edu_cart');
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

// 6. FUNÇÃO DE COPIAR (PIX COPIA E COLA)
function copyPix() {
    const pixElement = document.getElementById('pix-code');
    const textoParaCopiar = pixElement ? pixElement.innerText : pixCopiaECola;

    if (!textoParaCopiar || textoParaCopiar.length < 10 || textoParaCopiar.includes("Erro")) {
        alert("Aguarde o QR Code carregar.");
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
        console.error("Erro ao copiar:", err);
    }
    document.body.removeChild(textArea);
}

function animarBotaoSucesso() {
    const btn = document.getElementById('btn-copy');
    if (!btn) return;

    const originalText = btn.innerText;
    btn.innerText = "✅ COPIADO!";
    btn.classList.add('bg-green-600', 'text-white');
    
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-green-600', 'text-white');
    }, 2000);
}