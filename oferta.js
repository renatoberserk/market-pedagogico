// VARIÁVEIS GLOBAIS
let pixCopiaECola = "";
let monitoramento = null;
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = ""; 
let TITULO_PRODUTO = "";

/**
 * 1. CARREGA OS DADOS DO PRODUTO ATIVO
 */
async function carregarProdutoAtivo() {
    console.log("⏳ Iniciando carregamento da oferta...");
    try {
        // Adicionado timestamp para evitar cache do navegador
        const response = await fetch(`https://educamateriais.shop/api/config-oferta?t=${Date.now()}`);
        if (!response.ok) throw new Error('Falha na comunicação com o servidor');
        
        const dados = await response.json();
        
        if (dados) {
            LINK_DRIVE_FINAL = (dados.link_download || dados.link || "").trim();
            PRECO_FINAL = dados.preco || "19.90";
            TITULO_PRODUTO = dados.nome || dados.titulo || "Material Pedagógico";

            console.log("✅ DADOS RECEBIDOS:", { TITULO_PRODUTO, PRECO_FINAL, LINK_DRIVE_FINAL });

            // Atualiza Interface Visual
            const elTitulo = document.getElementById('titulo-produto');
            if (elTitulo) elTitulo.innerText = TITULO_PRODUTO;

            const elPreco = document.getElementById('valor-exibido');
            if (elPreco) {
                elPreco.innerText = parseFloat(PRECO_FINAL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            const elCapa = document.getElementById('capa-produto');
            if (elCapa) {
                elCapa.src = dados.imagem_url || dados.capa || "https://placehold.co/600x450?text=Educa+Materiais";
            }

            atualizarAmostra('foto1-produto', dados.foto1 || dados.foto_extra1);
            atualizarAmostra('foto2-produto', dados.foto2 || dados.foto_extra2);
        }
    } catch (err) {
        console.error("❌ Erro crítico ao carregar oferta:", err);
    }
}

/**
 * 2. GERAÇÃO DE PAGAMENTO PIX
 */
async function gerarPagamentoPix() {
    const emailInput = document.getElementById('email-cliente');
    const email = emailInput ? emailInput.value.trim() : "";
    const btn = document.getElementById('btn-comprar');

    if (!validarEmail(email)) {
        alert("⚠️ Informe um e-mail válido para receber o acesso.");
        return;
    }

    // Validação de segurança: Não deixa gerar PIX se o link de entrega estiver vazio
    if (!LINK_DRIVE_FINAL) {
        alert("⚠️ Erro na oferta: Link de entrega não configurado. Contate o suporte.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse">GERANDO QR CODE...</span>`;

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: parseFloat(PRECO_FINAL),
                titulo: TITULO_PRODUTO,
                link: LINK_DRIVE_FINAL,
                origem: 'landing_page_oferta' 
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            document.getElementById('etapa-email')?.classList.add('hidden');
            document.getElementById('area-pagamento')?.classList.remove('hidden');
            
            const qrPlaceholder = document.getElementById('qrcode-placeholder');
            if (qrPlaceholder) {
                qrPlaceholder.innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto shadow-xl rounded-2xl border-4 border-white transition-all">`;
            }
            
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        console.error("❌ Erro ao gerar PIX:", err);
        btn.disabled = false;
        btn.innerHTML = "COMPRAR AGORA";
        alert("Erro ao conectar com o meio de pagamento. Tente novamente.");
    }
}

/**
 * 3. MONITORAMENTO DO STATUS
 */
function iniciarMonitoramento(id) {
    let tentativas = 0;
    const maxTentativas = 240; // Monitora por 20 minutos (240 * 5s)

    if (monitoramento) clearInterval(monitoramento);
    
    monitoramento = setInterval(async () => {
        tentativas++;
        if (tentativas > maxTentativas) {
            clearInterval(monitoramento);
            console.log("⌛ Tempo de espera do pagamento expirado.");
            return;
        }

        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            if (data.status === 'approved') {
                clearInterval(monitoramento);
                sucessoTotal();
            }
        } catch (e) { /* Silencioso para não poluir o console */ }
    }, 5000);
}

/**
 * 4. TELA FINAL DE ENTREGA
 */
function sucessoTotal() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 }, colors: ['#f97316', '#ffffff', '#22c55e'] });
    }
    
    const container = document.getElementById('area-pagamento');
    if (container) {
        // Garantimos que o link existe antes de renderizar
        const linkHTML = LINK_DRIVE_FINAL 
            ? `<a href="${LINK_DRIVE_FINAL}" target="_blank" rel="noopener noreferrer" 
                  class="block w-full bg-green-500 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-green-600 transition-all text-center mb-10 text-lg hover:scale-105 active:scale-95">
                  📥 BAIXAR MATERIAL AGORA
               </a>`
            : `<p class="text-red-500 font-bold p-4">Erro ao resgatar link. Verifique seu e-mail!</p>`;

        container.innerHTML = `
            <div class="py-10 text-center animate-bounce-short">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Pagamento Confirmado!</h2>
                <p class="text-sm text-slate-500 mb-8">Obrigado por confiar na Educa Materiais. Baixe aqui:</p>
                
                ${linkHTML}

                <div class="p-4 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-200">
                    <p class="text-orange-700 font-bold text-[10px] uppercase mb-1">Dica de Acesso:</p>
                    <p class="text-[11px] text-orange-600 leading-tight">Enviamos também uma cópia para seu e-mail cadastrado.</p>
                </div>
            </div>`;
    }
}

function copiarPix() {
    if (!pixCopiaECola) return;
    
    const fazerCopia = (texto) => {
        const btn = document.querySelector('button[onclick="copiarPix()"]');
        const original = btn ? btn.innerText : "COPIAR PIX";
        
        if (btn) {
            btn.innerText = "✅ COPIADO!";
            btn.classList.replace('bg-slate-800', 'bg-green-600');
            setTimeout(() => {
                btn.innerText = original;
                btn.classList.replace('bg-green-600', 'bg-slate-800');
            }, 2500);
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pixCopiaECola).then(fazerCopia);
    } else {
        // Fallback para navegadores antigos/mobile inseguro
        const textArea = document.createElement("textarea");
        textArea.value = pixCopiaECola;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        fazerCopia();
    }
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);