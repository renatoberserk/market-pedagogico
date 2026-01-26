// VARIÁVEIS GLOBAIS
let pixCopiaECola = "";
let monitoramento = null;
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

// 1. CARREGA OS DADOS DO PRODUTO ASSIM QUE A PÁGINA ABRE
async function carregarProdutoAtivo() {
    try {
        // Aproveitamos esta requisição para pegar TUDO o que o servidor sabe sobre a oferta
        const response = await fetch('https://educamateriais.shop/api/config-oferta');
        const dados = await response.json();
        
        if (dados) {
            // Guardamos o link e os dados nas variáveis globais
            // Nota: usamos 'link_download' que é o nome da sua coluna no MySQL
            PRECO_FINAL = dados.preco || "19.90";
            LINK_DRIVE_FINAL = dados.link_download || dados.link || ""; 
            TITULO_PRODUTO = dados.nome || dados.titulo || "Material Pedagógico";
            
            // Atualiza os elementos visuais da página
            const elTitulo = document.getElementById('titulo-produto');
            if (elTitulo) elTitulo.innerText = TITULO_PRODUTO;

            const elPreco = document.getElementById('valor-exibido');
            if (elPreco) {
                elPreco.innerText = `R$ ${parseFloat(PRECO_FINAL).toFixed(2).replace('.', ',')}`;
            }

            // Atualiza a imagem principal (Capa)
            const elCapa = document.getElementById('capa-produto');
            if (elCapa && (dados.imagem_url || dados.capa)) {
                elCapa.src = dados.imagem_url || dados.capa;
            }

            // Fotos extras da galeria (se existirem)
            if (dados.foto1) {
                const f1 = document.getElementById('foto1-produto');
                if(f1) { f1.src = dados.foto1; f1.parentElement.classList.remove('hidden'); }
            }
            if (dados.foto2) {
                const f2 = document.getElementById('foto2-produto');
                if(f2) { f2.src = dados.foto2; f2.parentElement.classList.remove('hidden'); }
            }

            console.log("✅ Dados da oferta carregados. Pronto para venda.");
        }
    } catch (err) {
        console.error("❌ Erro ao carregar configurações da oferta:", err);
    }
}

// 2. GERA O PAGAMENTO PIX
async function gerarPagamentoPix() {
    const emailInput = document.getElementById('email-cliente');
    const email = emailInput ? emailInput.value.trim() : "";
    const btn = document.getElementById('btn-comprar');

    // Validação de E-mail (Fundamental para o Resend enviar o material)
    if (!email || !email.includes('@')) {
        alert("Por favor, informe um e-mail válido para receber o material.");
        if (emailInput) emailInput.focus();
        return;
    }

    // Feedback visual de carregamento
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block mr-2">🌀</span> Gerando QR Code...`;

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: parseFloat(PRECO_FINAL),
                titulo: TITULO_PRODUTO,
                link: LINK_DRIVE_FINAL, // O link que pegamos lá no carregarProdutoAtivo
                origem: 'landing_page_oferta' 
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            // Esconde a parte do e-mail e mostra o PIX
            document.getElementById('etapa-email')?.classList.add('hidden');
            document.getElementById('area-pagamento')?.classList.remove('hidden');
            
            const qrPlaceholder = document.getElementById('qrcode-placeholder');
            if (qrPlaceholder) {
                qrPlaceholder.innerHTML = `
                    <img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto shadow-xl rounded-2xl border-4 border-white">
                `;
            }
            
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        } else {
            throw new Error("Resposta inválida do servidor de pagamento.");
        }
    } catch (err) {
        console.error("Erro PIX:", err);
        alert("Houve um erro ao gerar o pagamento. Tente novamente.");
        btn.disabled = false;
        btn.innerHTML = "COMPRAR AGORA";
    }
}

// 3. MONITORAMENTO DE PAGAMENTO (Checa a cada 5 segundos)
function iniciarMonitoramento(id) {
    if (monitoramento) clearInterval(monitoramento);
    
    monitoramento = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            
            if (data.status === 'approved') {
                clearInterval(monitoramento);
                sucessoTotal();
            }
        } catch (e) { 
            console.log("Aguardando aprovação..."); 
        }
    }, 5000);
}

// 4. TELA DE SUCESSO E ENTREGA
function sucessoTotal() {
    // Se tiver a biblioteca canvas-confetti instalada:
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    
    const areaPagamento = document.getElementById('area-pagamento');
    if (areaPagamento) {
        areaPagamento.innerHTML = `
            <div class="py-10 text-center animate-bounce-short">
                <div class="text-7xl mb-6">🎉</div>
                <h2 class="text-3xl font-black text-slate-800 mb-2">Pagamento Confirmado!</h2>
                <p class="text-slate-500 mb-8">O material foi enviado para o seu e-mail, mas você pode baixar agora mesmo:</p>
                
                <a href="${LINK_DRIVE_FINAL}" target="_blank" class="inline-block w-full bg-green-500 text-white py-6 rounded-3xl font-black text-xl shadow-2xl hover:bg-green-600 transition-all active:scale-95 text-center mb-10">
                    📥 BAIXAR MATERIAL AGORA
                </a>

                <div class="p-6 bg-orange-50 rounded-3xl border-2 border-dashed border-orange-200">
                    <p class="text-orange-600 font-bold mb-2 text-sm uppercase">Obrigado pela confiança!</p>
                    <a href="https://educamateriais.shop/" class="text-slate-800 font-bold underline decoration-orange-400">Ver outros materiais na loja</a>
                </div>
            </div>`;
    }
}

// 5. FUNÇÃO COPIAR PIX
function copiarPix() {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola);
    
    const btnCopy = document.getElementById('btn-copy-pix');
    if (btnCopy) {
        const originalText = btnCopy.innerText;
        btnCopy.innerText = "✅ COPIADO!";
        btnCopy.classList.add('bg-green-600');
        setTimeout(() => {
            btnCopy.innerText = originalText;
            btnCopy.classList.remove('bg-green-600');
        }, 2000);
    } else {
        alert("Código Pix Copiado!");
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);