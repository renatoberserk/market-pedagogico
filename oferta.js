// Variáveis Globais
let pixCopiaECola = "";
let monitoramentoPagamento = null;
const ID_PRODUTO_OFERTA = 15; // O ID do material no seu banco de dados
const LINK_DOWNLOAD_PDF = "https://educamateriais.shop/downloads/seu-material.pdf"; // Link real do arquivo

/**
 * 1. GERA O PAGAMENTO PIX
 */
async function gerarPagamentoPix() {
    const emailInput = document.getElementById('email-cliente');
    const email = emailInput.value.trim();
    const btn = document.getElementById('btn-comprar');
    const etapaEmail = document.getElementById('etapa-email');
    const areaPagamento = document.getElementById('area-pagamento');
    const qrPlaceholder = document.getElementById('qrcode-placeholder');

    // Validação básica de e-mail
    if (!email || !email.includes('@')) {
        alert("Por favor, informe um e-mail válido para receber o material.");
        emailInput.focus();
        return;
    }

    // Feedback visual de carregamento
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Gerando QR Code...`;
    btn.style.opacity = "0.7";

    try {
        // Chamada para sua rota existente
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                total: 19.90, // Valor da sua oferta única
                itens: "Combo Alfabetização Criativa"
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64 && dados.id) {
            // Esconde formulário de e-mail e mostra área do Pix
            etapaEmail.classList.add('hidden');
            areaPagamento.classList.remove('hidden');

            // Renderiza a imagem do QR Code
            qrPlaceholder.innerHTML = `
                <img src="data:image/png;base64,${dados.qr_code_base64}" 
                     class="w-48 h-48 mx-auto shadow-md rounded-lg" 
                     alt="QR Code Pix">
            `;

            // Salva o código copia e cola
            pixCopiaECola = dados.qr_code;

            // INICIA O MONITORAMENTO DO PAGAMENTO (Usando o ID retornado)
            iniciarMonitoramento(dados.id);
        } else {
            throw new Error("Erro na estrutura de resposta do servidor.");
        }

    } catch (error) {
        console.error("Erro ao gerar Pix:", error);
        alert("Não foi possível gerar o pagamento. Tente novamente.");
        btn.disabled = false;
        btn.innerHTML = "Gerar QR Code PIX";
        btn.style.opacity = "1";
    }
}

/**
 * 2. MONITORAMENTO EM TEMPO REAL
 */
function iniciarMonitoramento(pagamentoId) {
    console.log("Monitorando pagamento:", pagamentoId);
    
    // Limpa intervalos antigos se existirem
    if (monitoramentoPagamento) clearInterval(monitoramentoPagamento);

    monitoramentoPagamento = setInterval(async () => {
        try {
            // Usa sua rota de verificação existente
            const response = await fetch(`https://educamateriais.shop/verificar-pagamento/${pagamentoId}`);
            const data = await response.json();

            if (data.status === 'approved') {
                clearInterval(monitoramentoPagamento);
                exibirSucessoEDownload();
            }
        } catch (error) {
            console.warn("Erro ao consultar status, tentando novamente...");
        }
    }, 5000); // Checa a cada 5 segundos
}

/**
 * 3. EXIBE MENSAGEM DE SUCESSO E LIBERA O ARQUIVO
 */
function exibirSucessoEDownload() {
    const container = document.getElementById('area-pagamento');

    confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#f97316', '#22c55e', '#6366f1']
});
    
    container.innerHTML = `
        <div class="py-8 text-center animate-bounce">
            <div class="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 class="text-2xl font-black text-gray-800">Pagamento Aprovado!</h2>
            <p class="text-gray-500 text-sm mt-2">Seu material já foi liberado.</p>
            
            <a href="${LINK_DOWNLOAD_PDF}" download 
               class="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-105">
                🚀 Baixar Meu Material Agora
            </a>
        </div>
    `;

    // Download automático após 2 segundos
    setTimeout(() => {
        const link = document.createElement('a');
        link.href = LINK_DOWNLOAD_PDF;
        link.download = "Material-Didatico-Educa.pdf";
        link.click();
    }, 2000);
}

/**
 * 4. FUNÇÃO COPIAR PIX
 */
function copiarPix() {
    if (!pixCopiaECola) return;
    
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const btnCopiar = document.querySelector('button[onclick="copiarPix()"]');
        const textoOriginal = btnCopiar.innerText;
        
        btnCopiar.innerText = "✅ Código Copiado!";
        setTimeout(() => {
            btnCopiar.innerText = textoOriginal;
        }, 2000);
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de oferta carregado e pronto.");
});