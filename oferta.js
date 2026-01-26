// VARIÁVEIS GLOBAIS
let pixCopiaECola = "";
let monitoramento = null;
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

/**
 * 1. CARREGA OS DADOS DO PRODUTO DINAMICAMENTE
 * Conecta o que você salvou no ADM com o visual da Landing Page
 */
async function carregarProdutoAtivo() {
    try {
        const response = await fetch('https://educamateriais.shop/api/config-oferta');
        if (!response.ok) throw new Error('Falha ao buscar configurações');
        
        const dados = await response.json();
        
        if (dados) {
            // Mapeamento de dados (suporta múltiplos nomes de colunas para evitar erros)
            PRECO_FINAL = dados.preco || "19.90";
            LINK_DRIVE_FINAL = dados.link_download || dados.link || ""; 
            TITULO_PRODUTO = dados.nome || dados.titulo || "Material Pedagógico";
            
            // Atualiza Título
            const elTitulo = document.getElementById('titulo-produto');
            if (elTitulo) elTitulo.innerText = TITULO_PRODUTO;

            // Atualiza Preço formatado
            const elPreco = document.getElementById('valor-exibido');
            if (elPreco) {
                const valorNumerico = parseFloat(PRECO_FINAL);
                elPreco.innerText = valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            // Atualiza Imagem Principal (Capa)
            const elCapa = document.getElementById('capa-produto');
            if (elCapa) {
                elCapa.src = dados.imagem_url || dados.capa || "https://placehold.co/600x450?text=Educa+Materiais";
            }

            // Fotos extras da galeria (Esconde se estiverem vazias)
            atualizarAmostra('foto1-produto', dados.foto1 || dados.foto_extra1);
            atualizarAmostra('foto2-produto', dados.foto2 || dados.foto_extra2);

            console.log("✅ Oferta configurada com sucesso.");
        }
    } catch (err) {
        console.error("❌ Erro ao carregar oferta:", err);
    }
}

// Função auxiliar para gerenciar as amostras de imagem
function atualizarAmostra(id, src) {
    const img = document.getElementById(id);
    if (!img) return;
    if (src && src.trim() !== "") {
        img.src = src;
        img.parentElement.style.display = "block";
    } else {
        img.parentElement.style.display = "none"; // Esconde o slot se não houver foto
    }
}

/**
 * 2. GERA O PAGAMENTO PIX VIA MERCADO PAGO / API
 */
async function gerarPagamentoPix() {
    const emailInput = document.getElementById('email-cliente');
    const email = emailInput ? emailInput.value.trim() : "";
    const btn = document.getElementById('btn-comprar');

    if (!validarEmail(email)) {
        alert("⚠️ Por favor, informe um e-mail válido.");
        if (emailInput) emailInput.focus();
        return;
    }

    // Estado de carregamento
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 inline text-white" viewBox="0 0 24 24">... (seu svg de loading) ...</svg> GERANDO PIX...`;

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
                qrPlaceholder.innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto shadow-xl rounded-2xl border-4 border-white animate-fade-in">`;
            }
            
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
            window.scrollTo({ top: 100, behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Erro PIX:", err);
        alert("❌ Erro ao gerar pagamento. Verifique sua conexão.");
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

/**
 * 3. MONITORAMENTO E SUCESSO
 */
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
        } catch (e) { /* Silencioso até aprovar */ }
    }, 5000);
}

function sucessoTotal() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    
    const container = document.getElementById('area-pagamento');
    if (container) {
        container.innerHTML = `
            <div class="py-10 text-center fade-in">
                <div class="text-6xl mb-4">✅</div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Sucesso!</h2>
                <p class="text-sm text-slate-500 mb-6">Enviamos o material para seu e-mail, mas você pode baixar agora:</p>
                <a href="${LINK_DRIVE_FINAL}" target="_blank" class="block w-full bg-green-500 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-green-600 transition-all text-center mb-6">
                    📥 BAIXAR AGORA
                </a>
                <p class="text-[10px] text-slate-400">ID da Transação: #${Math.floor(Math.random()*90000)}</p>
            </div>`;
    }
}

// Utilitários
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function copiarPix() {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const btn = document.querySelector('button[onclick="copiarPix()"]');
        const originalText = btn.innerText;
        btn.innerText = "📋 COPIADO!";
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);