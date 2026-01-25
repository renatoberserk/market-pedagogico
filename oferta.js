// Variáveis Globais
let pixCopiaECola = "";
let monitoramentoPagamento = null;
const ID_PRODUTO_OFERTA = 15; 
const LINK_DOWNLOAD_PDF = "https://educamateriais.shop/downloads/seu-material.pdf"; 

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

    if (!email || !email.includes('@')) {
        alert("Por favor, informe um e-mail válido para receber o material.");
        emailInput.focus();
        return;
    }

    // Feedback visual
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Gerando QR Code...`;
    btn.style.opacity = "0.7";

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                total: 19.90,
                itens: "Combo Alfabetização Criativa"
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64 && dados.id) {
            etapaEmail.classList.add('hidden');
            areaPagamento.classList.remove('hidden');

            qrPlaceholder.innerHTML = `
                <img src="data:image/png;base64,${dados.qr_code_base64}" 
                     class="w-48 h-48 mx-auto shadow-md rounded-lg" 
                     alt="QR Code Pix">
            `;

            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        } else {
            throw new Error("Resposta inválida do servidor.");
        }

    } catch (error) {
        console.error("Erro ao gerar Pix:", error);
        alert("Erro ao gerar o pagamento. Tente novamente.");
        btn.disabled = false;
        btn.innerHTML = "COMPRAR AGORA";
        btn.style.opacity = "1";
    }
}

/**
 * 2. MONITORAMENTO EM TEMPO REAL
 */
function iniciarMonitoramento(pagamentoId) {
    if (monitoramentoPagamento) clearInterval(monitoramentoPagamento);

    monitoramentoPagamento = setInterval(async () => {
        try {
            const response = await fetch(`https://educamateriais.shop/verificar-pagamento/${pagamentoId}`);
            const data = await response.json();

            if (data.status === 'approved') {
                clearInterval(monitoramentoPagamento);
                exibirSucessoEDownload();
            }
        } catch (error) {
            console.warn("Consultando status...");
        }
    }, 5000);
}

/**
 * 3. EXIBE SUCESSO, LIBERA PDF E RECOMENDA LOJA
 */
function exibirSucessoEDownload() {
    const container = document.getElementById('area-pagamento');

    // Efeito de celebração
    if (typeof confetti === "function") {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#22c55e', '#6366f1']
        });
    }
    
    container.innerHTML = `
        <div class="py-4 text-center fade-in">
            <div class="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tighter">Pagamento Aprovado!</h2>
            <p class="text-slate-500 text-sm mb-6">Seu material já foi liberado para download.</p>
            
            <a href="${LINK_DOWNLOAD_PDF}" download 
               class="inline-block w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 mb-8">
                🚀 BAIXAR MATERIAL AGORA
            </a>

            <div class="bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200">
                <p class="text-slate-700 font-bold text-sm mb-2 italic">Gostou da facilidade?</p>
                <p class="text-slate-500 text-xs mb-4">Temos centenas de outros materiais incríveis esperando por você.</p>
                
                <a href="https://educamateriais.shop" 
                   class="inline-flex items-center gap-2 text-orange-600 font-black text-sm uppercase tracking-wider hover:translate-x-1 transition-transform">
                    Conhecer a Loja Completa
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        </div>
    `;

    // Gatilho de download automático
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
        if (btnCopiar) {
            const textoOriginal = btnCopiar.innerText;
            btnCopiar.innerText = "✅ Código Copiado!";
            setTimeout(() => { btnCopiar.innerText = textoOriginal; }, 2000);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema de vendas pronto.");
});