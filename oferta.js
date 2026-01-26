// VARIÁVEIS GLOBAIS
let pixCopiaECola = "";
let monitoramento = null;
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = ""; // Receberá o link exato do ADM
let TITULO_PRODUTO = "";

/**
 * 1. CARREGA OS DADOS DO PRODUTO ATIVO
 * Busca as configurações que você salvou no Painel Admin
 */
async function carregarProdutoAtivo() {
    console.log("⏳ Iniciando carregamento da oferta...");
    try {
        const response = await fetch('https://educamateriais.shop/api/config-oferta');
        if (!response.ok) throw new Error('Falha na comunicação com o servidor');
        
        const dados = await response.json();
        
        if (dados) {
            // CAPTURA DO LINK: Prioriza 'link_download', depois 'link'
            LINK_DRIVE_FINAL = (dados.link_download || dados.link || "").trim();
            PRECO_FINAL = dados.preco || "19.90";
            TITULO_PRODUTO = dados.nome || dados.titulo || "Material Pedagógico";

            // LOG DE SUCESSO NO CARREGAMENTO
            console.log("✅ DADOS RECEBIDOS DO ADM:");
            console.log("👉 Título:", TITULO_PRODUTO);
            console.log("👉 Preço:", PRECO_FINAL);
            console.log("🔗 LINK DE ENTREGA CONFIGURADO:", LINK_DRIVE_FINAL);

            // Validação simples de link
            if (!LINK_DRIVE_FINAL.startsWith('http')) {
                console.warn("⚠️ ATENÇÃO: O link configurado no ADM não parece ser uma URL válida!");
            }

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

// Função auxiliar para galeria de fotos
function atualizarAmostra(id, src) {
    const img = document.getElementById(id);
    if (!img) return;
    if (src && src.trim() !== "") {
        img.src = src;
        img.parentElement.classList.remove('hidden');
    } else {
        img.parentElement.classList.add('hidden');
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

    btn.disabled = true;
    btn.innerHTML = `GERANDO QR CODE...`;

    try {
        console.log("📡 Solicitando PIX para o servidor...");
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: parseFloat(PRECO_FINAL),
                titulo: TITULO_PRODUTO,
                link: LINK_DRIVE_FINAL, // Link enviado para o backend processar o e-mail
                origem: 'landing_page_oferta' 
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            document.getElementById('etapa-email')?.classList.add('hidden');
            document.getElementById('area-pagamento')?.classList.remove('hidden');
            
            const qrPlaceholder = document.getElementById('qrcode-placeholder');
            if (qrPlaceholder) {
                qrPlaceholder.innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto shadow-xl rounded-2xl border-4 border-white">`;
            }
            
            pixCopiaECola = dados.qr_code;
            console.log("✅ PIX Gerado com sucesso. ID:", dados.id);
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        console.error("❌ Erro ao gerar PIX:", err);
        btn.disabled = false;
        btn.innerHTML = "COMPRAR AGORA";
    }
}

/**
 * 3. MONITORAMENTO DO STATUS
 */
function iniciarMonitoramento(id) {
    console.log("⏱️ Monitorando pagamento #" + id);
    if (monitoramento) clearInterval(monitoramento);
    monitoramento = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            if (data.status === 'approved') {
                console.log("💰 PAGAMENTO APROVADO! Liberando link...");
                clearInterval(monitoramento);
                sucessoTotal();
            }
        } catch (e) { /* Aguardando... */ }
    }, 5000);
}

/**
 * 4. TELA FINAL DE ENTREGA
 */
function sucessoTotal() {
    // Log final para auditoria no console
    console.log("🚀 EXECUTANDO ENTREGA FINAL");
    console.log("📦 Produto entregue: " + TITULO_PRODUTO);
    console.log("🔗 Link disponibilizado: " + LINK_DRIVE_FINAL);

    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    
    const container = document.getElementById('area-pagamento');
    if (container) {
        container.innerHTML = `
            <div class="py-10 text-center animate-fade-in">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Pagamento Confirmado!</h2>
                <p class="text-sm text-slate-500 mb-8">Seu material já está disponível para download:</p>
                
                <a href="${LINK_DRIVE_FINAL}" target="_blank" rel="noopener noreferrer" 
                   class="block w-full bg-green-500 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-green-600 transition-all text-center mb-10 text-lg">
                    📥 BAIXAR MATERIAL AGORA
                </a>

                <div class="p-4 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-200">
                    <p class="text-orange-700 font-bold text-xs uppercase mb-1">Dica de Acesso:</p>
                    <p class="text-[11px] text-orange-600">O link acima leva direto ao seu material no Google Drive. Salve este link ou verifique seu e-mail para acessos futuros.</p>
                </div>
            </div>`;
    }
}

// Utilitários auxiliares
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function copiarPix() {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const btn = document.querySelector('button[onclick="copiarPix()"]');
        if (btn) {
            const original = btn.innerText;
            btn.innerText = "✅ COPIADO!";
            setTimeout(() => btn.innerText = original, 2000);
        }
    });
}

// Inicializa a página
document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);