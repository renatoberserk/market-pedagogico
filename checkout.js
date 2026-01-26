// No topo do seu checkout.js
// Isso busca o link que você salvou lá na página da vitrine
window.LINK_DRIVE_FINAL = localStorage.getItem('link_pendente');

console.log("🔗 Link recuperado para o checkout:", window.LINK_DRIVE_FINAL);

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
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');
    const btnGerar = document.getElementById('btn-gerar-pix');

    // --- TRAVA DE SEGURANÇA ---
    // Verifica se o link existe, se não é 'undefined' e se não está vazio
    if (!window.LINK_DRIVE_FINAL || window.LINK_DRIVE_FINAL === 'undefined' || window.LINK_DRIVE_FINAL.trim() === "") {
        console.error("❌ Abortado: Tentativa de gerar Pix sem link de produto.");
        alert("Ops! O link do material não foi carregado. Por favor, feche este checkout e clique no produto novamente.");
        
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.innerHTML = "ERRO: SELECIONE O PRODUTO NOVAMENTE";
        }
        return; // Mata a execução aqui
    }

    // Se passou pela trava, inicia o processo visual
    if (loader) loader.classList.remove('hidden');
    if (img) img.classList.add('hidden');
    if (btnGerar) btnGerar.disabled = true; // Evita cliques duplos enquanto processa

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: total,
                link: window.LINK_DRIVE_FINAL // Agora garantimos que este valor existe
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
        
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.innerHTML = "TENTAR NOVAMENTE";
        }
        if (loader) loader.classList.add('hidden');
    }
}

function iniciarVerificacaoStatus(id) {
    if (typeof checkInterval !== 'undefined') clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();

            // O servidor agora retorna data.status direto da API do Mercado Pago
            if (data.status === 'approved') {
                clearInterval(checkInterval);
                finalizarCompraSucesso(); 
            }
        } catch (e) {
            console.log("Aguardando confirmação do pagamento...");
        }
    }, 5000); 
}

async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        // 1. Avisa o servidor para registrar a venda e liberar os arquivos
        await fetch('https://educamateriais.shop/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // 2. LIMPA O CARRINHO (Remove do armazenamento do navegador)
        localStorage.removeItem('edu_cart');
        
        // Opcional: Se você usa uma variável global 'carrinho', limpe-a também
        // carrinho = []; 

        console.log("Carrinho limpo e venda registrada!");

        // 3. Redireciona para a página de sucesso ou de materiais
        window.location.href = 'meus-materiais.html?sucesso=true';

    } catch (err) {
        console.error("Erro ao registrar venda:", err);
        // Mesmo com erro no registro, limpamos o carrinho para evitar compras duplicadas
        localStorage.removeItem('edu_cart');
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

function copyPix() {
    // 1. Tenta pegar o texto do elemento HTML (garantia visual)
    const pixElement = document.getElementById('pix-code');
    const textoParaCopiar = pixElement ? pixElement.innerText : pixCopiaECola;

    if (!textoParaCopiar || textoParaCopiar === "Gerando código..." || textoParaCopiar.includes("Erro")) {
        alert("Aguarde o código ser gerado.");
        return;
    }

    // 2. Tenta usar a API moderna (Clipboard)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textoParaCopiar).then(() => {
            animarBotaoSucesso();
        }).catch(err => {
            fallbackCopyText(textoParaCopiar);
        });
    } else {
        // 3. Fallback para navegadores antigos ou conexões HTTP
        fallbackCopyText(textoParaCopiar);
    }
}

// Função de suporte para copiar (Fallback)
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        animarBotaoSucesso();
    } catch (err) {
        alert("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
    document.body.removeChild(textArea);
}

// Função para dar o feedback visual no botão
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