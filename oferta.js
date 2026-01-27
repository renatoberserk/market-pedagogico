let pixCopiaECola = "";
let PRECO_FINAL = "";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

// Variáveis para o Carrossel
let slideAtual = 0;
let totalSlides = 0;

document.addEventListener('DOMContentLoaded', carregarProduto);

async function carregarProduto() {
    try {
        // Cache busting com timestamp para garantir que pegue a oferta mais recente
        const res = await fetch(`https://educamateriais.shop/api/get-oferta-ativa?t=${Date.now()}`);
        if (!res.ok) throw new Error("Não foi possível carregar a oferta ativa.");
        
        const dados = await res.json();

        if (dados && dados.nome) {
            TITULO_PRODUTO = dados.nome || "Material Pedagógico";
            PRECO_FINAL = dados.preco || "0.00";
            LINK_DRIVE_FINAL = (dados.link_download || "").trim();

            document.getElementById('titulo-produto').innerText = TITULO_PRODUTO;
            
            const precoNumerico = parseFloat(PRECO_FINAL);
            document.getElementById('valor-exibido').innerText = precoNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            // LÓGICA DO CARROSSEL
            const imagens = [dados.imagem_url, dados.foto_extra1, dados.foto_extra2].filter(url => url && url.trim() !== "");
            totalSlides = imagens.length;
            
            const container = document.getElementById('carousel-container');
            const dots = document.getElementById('carousel-dots');
            
            if (container) {
                container.innerHTML = imagens.map(url => `
                    <img src="${url}" class="w-full h-full object-cover flex-shrink-0" onerror="this.src='sua-imagem-padrao.jpg'">
                `).join('');

                if (dots) {
                    dots.innerHTML = imagens.map((_, i) => `
                        <div class="w-2 h-2 rounded-full bg-white/50 transition-all ${i === 0 ? 'bg-white w-4' : ''}"></div>
                    `).join('');
                }
            }
        } else {
            document.getElementById('titulo-produto').innerText = "Nenhuma oferta ativa no momento.";
        }
    } catch (e) { 
        console.error("Erro na carga da oferta:", e); 
        const elTitulo = document.getElementById('titulo-produto');
        if (elTitulo) elTitulo.innerText = "Erro ao carregar material.";
    }
}

function moverCarrossel(direcao) {
    if (totalSlides <= 1) return;
    slideAtual = (slideAtual + direcao + totalSlides) % totalSlides;
    const container = document.getElementById('carousel-container');
    
    // Suavidade no movimento
    if (container) container.style.transform = `translateX(-${slideAtual * 100}%)`;
    
    const dotsContainer = document.getElementById('carousel-dots');
    if (dotsContainer) {
        const dots = dotsContainer.children;
        Array.from(dots).forEach((dot, i) => {
            dot.className = `w-2 h-2 rounded-full transition-all ${i === slideAtual ? 'bg-white w-4' : 'bg-white/50'}`;
        });
    }
}

async function gerarPagamentoPix() {
    const emailInput = document.getElementById('email-cliente');
    const email = emailInput ? emailInput.value.trim() : "";
    const btn = document.getElementById('btn-comprar');

    if (!email.includes('@')) {
        alert("Por favor, insira um e-mail válido para receber o material.");
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse text-white font-bold">GERANDO PIX...</span>`;

    try {
        const res = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: parseFloat(PRECO_FINAL), 
                titulo: TITULO_PRODUTO, 
                link: LINK_DRIVE_FINAL 
            })
        });
        
        const dados = await res.json();
        if (dados.qr_code_base64) {
            pixCopiaECola = dados.qr_code;
            document.getElementById('etapa-email').style.display = 'none';
            document.getElementById('area-pagamento').classList.remove('hidden');
            
            const qrPlaceholder = document.getElementById('qrcode-placeholder');
            if (qrPlaceholder) {
                qrPlaceholder.innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-52 h-52 mx-auto">`;
            }
            
            iniciarMonitoramento(dados.id);
        }
    } catch (e) { 
        console.error("Erro ao gerar PIX:", e);
        btn.disabled = false; 
        btn.innerText = "TENTAR NOVAMENTE"; 
    }
}

function iniciarMonitoramento(id) {
    const monitor = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            
            if (data.status === 'approved') {
                clearInterval(monitor);
                
                // Dispara os confetes (Certifique-se que o script do confetti está no HTML)
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#f97316', '#16a34a', '#ffffff']
                    });
                }

                document.getElementById('area-pagamento').classList.add('hidden');
                
                const btnDownload = document.getElementById('botao-download-direto');
                if (btnDownload) {
                    btnDownload.href = LINK_DRIVE_FINAL;
                }
                
                const telaSucesso = document.getElementById('tela-sucesso');
                if (telaSucesso) {
                    telaSucesso.classList.remove('hidden');
                }
            }
        } catch (e) {
            console.error("Erro ao monitorar:", e);
        }
    }, 5000);
}

function copiarPix() {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        const btn = document.querySelector('button[onclick="copiarPix()"]');
        const originalText = btn.innerText;
        btn.innerText = "✅ COPIADO!";
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}