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
        const response = await fetch(`https://educamateriais.shop/api/config-oferta?t=${Date.now()}`);
        if (!response.ok) throw new Error('Falha na comunicação com o servidor');
        
        const dados = await response.json();
        
        if (dados) {
            LINK_DRIVE_FINAL = (dados.link_download || dados.link || "").trim();
            PRECO_FINAL = dados.preco || "19.90";
            TITULO_PRODUTO = dados.nome || dados.titulo || "Material Pedagógico";

            // Atualização da Interface
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

    if (!LINK_DRIVE_FINAL) {
        alert("⚠️ Erro na oferta: Link de entrega não configurado.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span style="opacity: 0.7">GERANDO QR CODE...</span>`;

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
                qrPlaceholder.innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" style="width: 200px; height: 200px; margin: 0 auto; display: block; border-radius: 16px; border: 4px solid white; box-shadow: 0 10px 15px rgba(0,0,0,0.1);">`;
            }
            
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        console.error("❌ Erro ao gerar PIX:", err);
        btn.disabled = false;
        btn.innerHTML = "COMPRAR AGORA";
        alert("Erro ao conectar com o meio de pagamento.");
    }
}

/**
 * 3. MONITORAMENTO
 */
function iniciarMonitoramento(id) {
    let tentativas = 0;
    const maxTentativas = 120; // 10 minutos (120 * 5s)

    if (monitoramento) clearInterval(monitoramento);
    
    monitoramento = setInterval(async () => {
        tentativas++;
        if (tentativas > maxTentativas) {
            clearInterval(monitoramento);
            return;
        }

        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            if (data.status === 'approved') {
                clearInterval(monitoramento);
                sucessoTotal();
            }
        } catch (e) { }
    }, 5000);
}

/**
 * 4. SUCESSO E ENTREGA
 */
function sucessoTotal() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    
    const container = document.getElementById('area-pagamento');
    if (container) {
        const linkHTML = LINK_DRIVE_FINAL 
            ? `<a href="${LINK_DRIVE_FINAL}" target="_blank" rel="noopener noreferrer" 
                  style="background-color: #22c55e; color: white; padding: 20px; border-radius: 20px; font-weight: 900; display: block; text-align: center; text-decoration: none; margin-bottom: 20px; font-size: 18px; box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3);">
                  📥 BAIXAR MATERIAL AGORA
               </a>`
            : `<p style="color: #ef4444; font-weight: bold;">Erro no link. Verifique seu e-mail.</p>`;

        container.innerHTML = `
            <div style="padding: 30px 0; text-align: center;">
                <div style="font-size: 50px; margin-bottom: 10px;">✅</div>
                <h2 style="font-size: 22px; font-weight: 900; color: #1e293b; margin-bottom: 5px;">Pago com Sucesso!</h2>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 25px;">Seu material foi liberado abaixo:</p>
                ${linkHTML}
                <div style="padding: 15px; background: #fff7ed; border-radius: 15px; border: 2px dashed #fed7aa;">
                    <p style="color: #ea580c; font-size: 11px; font-weight: bold; margin: 0;">O link também foi enviado para seu e-mail!</p>
                </div>
            </div>`;
    }
}

/**
 * UTILITÁRIOS
 */
function copiarPix() {
    if (!pixCopiaECola) return;
    
    const btn = document.querySelector('.btn-copiar-pix') || document.querySelector('button[onclick="copiarPix()"]');
    const originalText = btn ? btn.innerText : "COPIAR CÓDIGO PIX";

    const feedback = () => {
        if (btn) {
            btn.innerText = "✅ COPIADO!";
            btn.style.backgroundColor = "#22c55e";
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = "";
            }, 2500);
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pixCopiaECola).then(feedback);
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = pixCopiaECola;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            feedback();
        } catch (err) {
            alert("Pressione e segure para copiar o código.");
        }
        document.body.removeChild(textArea);
    }
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function atualizarAmostra(id, src) {
    const img = document.getElementById(id);
    if (!img) return;
    if (src && src.trim() !== "") {
        img.src = src;
        img.parentElement.style.display = "block";
    } else {
        img.parentElement.style.display = "none";
    }
}