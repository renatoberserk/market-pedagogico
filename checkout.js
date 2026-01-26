// 1. RECUPERAÇÃO DO LINK COM PROTEÇÃO
// O uso de '|| ""' evita que o .trim() quebre se o localStorage estiver vazio
window.LINK_DRIVE_FINAL = localStorage.getItem('link_pendente') || "";

console.log("🔗 Link recuperado do cache:", window.LINK_DRIVE_FINAL);

let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

// 2. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Checkout iniciado...");
    
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    
    // Se o carrinho sumiu ou está vazio, volta para a loja
    if (!carrinho || carrinho.length === 0) {
        console.warn("🛒 Carrinho não encontrado.");
        window.location.href = 'index.html';
        return;
    }

    // Soma o total do carrinho
    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
    const valorDisplay = document.getElementById('valor-final');
    if (valorDisplay) {
        valorDisplay.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Inicia a geração do Pix passando o total calculado
    gerarPixReal(total);
});

// 3. GERAÇÃO DO PIX NO MERCADO PAGO
async function gerarPixReal(total) {
    const email = localStorage.getItem('prof_email') || "";
    const statusText = document.getElementById('pix-code');
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');
    const btnGerar = document.getElementById('btn-gerar-pix');

    // --- VALIDAÇÃO CRÍTICA PARA EVITAR O ERRO 'NULL' ---
    const linkFinal = window.LINK_DRIVE_FINAL.toString().trim();

    if (!linkFinal || linkFinal === "" || linkFinal === "undefined") {
        console.error("❌ Erro fatal: Link do drive não existe no localStorage.");
        alert("Ops! O material selecionado não foi carregado corretamente. Por favor, tente selecionar o material novamente na loja.");
        if(btnGerar) btnGerar.innerHTML = "ERRO NO PRODUTO";
        return; 
    }

    if (!email || !email.includes('@')) {
        console.error("❌ Erro: Email inválido ou nulo.");
        alert("E-mail não encontrado. Por favor, preencha seus dados novamente.");
        return;
    }

    console.log("📡 Enviando Link para API:", linkFinal);

    // Feedback Visual
    if (loader) loader.classList.remove('hidden');
    if (img) img.classList.add('hidden');

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email.trim(), 
                total: total,
                link: linkFinal // Link exato recuperado do ADM
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detalhes || "Erro 500 no Servidor");
        }

        const data = await response.json();

        if (data.qr_code_base64) {
            console.log("✅ Pix Gerado! Aguardando pagamento...");
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
        }
    } catch (error) {
        console.error("❌ Falha na geração do Pix:", error);
        if (statusText) statusText.innerText = "Erro ao gerar código. Tente recarregar.";
        if (loader) loader.classList.add('hidden');
    }
}

// 4. VERIFICAÇÃO AUTOMÁTICA
function iniciarVerificacaoStatus(id) {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();

            if (data.status === 'approved') {
                console.log("💰 Pagamento aprovado com sucesso!");
                clearInterval(checkInterval);
                finalizarCompraSucesso(); 
            }
        } catch (e) {
            console.log("⏳ Aguardando confirmação...");
        }
    }, 5000); 
}

// 5. FINALIZAÇÃO
async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        console.log("💾 Registrando venda e limpando dados...");
        await fetch('https://educamateriais.shop/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // Limpa o link e o carrinho para evitar lixo no navegador
        localStorage.removeItem('edu_cart');
        localStorage.removeItem('link_pendente');
        
        window.location.href = 'meus-materiais.html?sucesso=true';

    } catch (err) {
        console.error("⚠️ Pagamento aprovado, mas erro ao registrar:", err);
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

// 6. COPIAR PIX
function copyPix() {
    const pixElement = document.getElementById('pix-code');
    const texto = pixElement ? pixElement.innerText : pixCopiaECola;

    if (!texto || texto.includes("Gerando") || texto.includes("Erro")) return;

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btn-copy');
        if (btn) {
            const original = btn.innerText;
            btn.innerText = "✅ COPIADO!";
            btn.classList.add('bg-green-600');
            setTimeout(() => {
                btn.innerText = original;
                btn.classList.remove('bg-green-600');
            }, 2000);
        }
    });
}