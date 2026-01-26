// 1. RECUPERAÇÃO DE DADOS
let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Checkout iniciado...");
    
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    const email = localStorage.getItem('prof_email');

    // Proteção: Se não houver carrinho ou e-mail, redireciona
    if (!carrinho || carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        window.location.href = 'index.html';
        return;
    }

    if (!email) {
        alert("E-mail não encontrado. Por favor, faça login novamente.");
        window.location.href = 'login.html';
        return;
    }

    // Soma o total do carrinho
    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
    // Atualiza a interface
    const valorDisplay = document.getElementById('valor-final');
    if (valorDisplay) {
        valorDisplay.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Renderiza lista de itens no checkout para conferência
    const listaItens = document.getElementById('lista-itens-checkout');
    if (listaItens) {
        listaItens.innerHTML = carrinho.map(i => `
            <div class="flex justify-between text-[11px] text-gray-600 mb-1">
                <span>${i.nome}</span>
                <span class="font-bold">R$ ${i.preco.toFixed(2).replace('.', ',')}</span>
            </div>
        `).join('');
    }

    // Inicia a geração do Pix
    gerarPixReal(total, email, carrinho);
});

// 2. GERAÇÃO DO PIX NO MERCADO PAGO
async function gerarPixReal(total, email, carrinho) {
    const statusText = document.getElementById('pix-code');
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');

    // Prepara os links para o servidor (envia array de links se houver vários produtos)
    const links = carrinho.map(item => item.link);

    try {
        if (loader) loader.classList.remove('hidden');
        if (img) img.classList.add('hidden');

        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email.trim(), 
                total: total,
                produtos: carrinho, // Enviamos o objeto completo para o backend processar
                links: links 
            })
        });

        if (!response.ok) throw new Error("Erro ao processar pagamento no servidor.");

        const data = await response.json();

        if (data.qr_code_base64) {
            paymentId = data.id;
            pixCopiaECola = data.qr_code;

            if (loader) loader.classList.add('hidden');
            if (img) {
                img.src = `data:image/png;base64,${data.qr_code_base64}`;
                img.classList.remove('hidden');
            }
            if (statusText) {
                statusText.innerText = pixCopiaECola;
            }

            iniciarVerificacaoStatus(data.id);
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        if (statusText) statusText.innerText = "Erro ao gerar PIX. Tente recarregar a página.";
    }
}

// 3. VERIFICAÇÃO AUTOMÁTICA (POLLING)
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
            console.log("⏳ Aguardando pagamento...");
        }
    }, 5000); 
}

// 4. FINALIZAÇÃO E REGISTRO
async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        await fetch('https://educamateriais.shop/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // Limpeza de cache para evitar duplicidade
        localStorage.removeItem('edu_cart');
        localStorage.removeItem('link_pendente');
        
        window.location.href = 'meus-materiais.html?sucesso=true';
    } catch (err) {
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

// 5. FUNÇÃO COPIAR
function copyPix() {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const btn = document.getElementById('btn-copy');
        if (btn) {
            const original = btn.innerText;
            btn.innerText = "✅ COPIADO!";
            setTimeout(() => btn.innerText = original, 2000);
        }
    });
}