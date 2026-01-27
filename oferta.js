let pixCopiaECola = "";
let PRECO_FINAL = "";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

// Variáveis novas para o Carrossel
let slideAtual = 0;
let totalSlides = 0;

// Inicia a carga assim que a página abre
document.addEventListener('DOMContentLoaded', carregarProduto);

async function carregarProduto() {
    try {
        // BUSCA O PRODUTO QUE ESTÁ MARCADO COMO OFERTA ATIVA NO ADM
        const res = await fetch(`https://educamateriais.shop/api/get-oferta-ativa?t=${Date.now()}`);
        
        if (!res.ok) throw new Error("Não foi possível carregar a oferta ativa.");
        
        const dados = await res.json();

        if (dados && dados.nome) {
            // Preenche as variáveis globais para o PIX
            TITULO_PRODUTO = dados.nome || "Material Pedagógico";
            PRECO_FINAL = dados.preco || "0.00";
            LINK_DRIVE_FINAL = (dados.link_download || "").trim();

            // Atualiza o HTML com os dados vindos do Banco de Dados
            document.getElementById('titulo-produto').innerText = TITULO_PRODUTO;
            
            // Formata o preço corretamente
            const precoNumerico = parseFloat(PRECO_FINAL);
            document.getElementById('valor-exibido').innerText = precoNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            // --- LÓGICA DO CARROSSEL ---
            // Filtra apenas as imagens que existem no banco
            const imagens = [dados.imagem_url, dados.foto_extra1, dados.foto_extra2].filter(url => url && url.trim() !== "");
            totalSlides = imagens.length;
            
            const container = document.getElementById('carousel-container');
            const dots = document.getElementById('carousel-dots');
            
            if (container) {
                // Renderiza as imagens dentro do container do carrossel
                container.innerHTML = imagens.map(url => `
                    <img src="${url}" class="w-full h-full object-cover flex-shrink-0">
                `).join('');

                // Renderiza os pontinhos indicadores
                if (dots) {
                    dots.innerHTML = imagens.map((_, i) => `
                        <div class="w-2 h-2 rounded-full bg-white/50 transition-all ${i === 0 ? 'bg-white w-4' : ''}"></div>
                    `).join('');
                }
            }
            // ---------------------------

        } else {
            document.getElementById('titulo-produto').innerText = "Nenhuma oferta ativa no momento.";
        }
    } catch (e) { 
        console.error("Erro na carga da oferta:", e); 
        document.getElementById('titulo-produto').innerText = "Erro ao carregar material.";
    }
}

// Função para mover os slides do carrossel
function moverCarrossel(direcao) {
    if (totalSlides <= 1) return; // Não move se só tiver uma foto

    slideAtual = (slideAtual + direcao + totalSlides) % totalSlides;
    const container = document.getElementById('carousel-container');
    
    if (container) {
        container.style.transform = `translateX(-${slideAtual * 100}%)`;
    }
    
    // Atualiza visualmente os pontinhos (dots)
    const dotsContainer = document.getElementById('carousel-dots');
    if (dotsContainer) {
        const dots = dotsContainer.children;
        Array.from(dots).forEach((dot, i) => {
            dot.classList.toggle('bg-white', i === slideAtual);
            dot.classList.toggle('w-4', i === slideAtual);
            dot.classList.toggle('bg-white/50', i !== slideAtual);
            dot.classList.toggle('w-2', i !== slideAtual);
        });
    }
}

async function gerarPagamentoPix() {
    const email = document.getElementById('email-cliente').value.trim();
    const btn = document.getElementById('btn-comprar');

    if (!email.includes('@')) {
        alert("Por favor, insira um e-mail válido para receber o material.");
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse text-white">GERANDO PIX...</span>`;

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
            
            // Esconde etapa do e-mail e mostra o QR Code
            document.getElementById('etapa-email').style.display = 'none';
            document.getElementById('area-pagamento').classList.remove('hidden');
            
            // Insere a imagem do QR Code
            document.getElementById('qrcode-placeholder').innerHTML = `
                <img src="data:image/png;base64,${dados.qr_code_base64}" class="w-52 h-52">
            `;
            
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
                // Redireciona para a página de sucesso com o link do drive
                window.location.href = `sucesso.html?link=${encodeURIComponent(LINK_DRIVE_FINAL)}`;
            }
        } catch (e) {
            console.error("Erro ao monitorar pagamento:", e);
        }
    }, 5000);
}

function copiarPix() {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        alert("Código PIX copiado! Cole no seu banco para pagar.");
    });
}