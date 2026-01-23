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
        const response = await fetch('https://educamateriais.shop /criar-pagamento-pix', {
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
            const res = await fetch(`https://educamateriais.shop /verificar-pagamento/${id}`);
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
        // 1. Avisa o servidor para registrar a venda e liberar os arquivos
        await fetch('https://educamateriais.shop /registrar-venda', {
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