let pixCopiaECola = "";
let PRECO_FINAL = "";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

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
            
            // Atualiza a imagem da capa
            const imgCapa = document.getElementById('capa-produto');
            if (dados.imagem_url) {
                imgCapa.src = dados.imagem_url;
            }
        } else {
            document.getElementById('titulo-produto').innerText = "Nenhuma oferta ativa no momento.";
        }
    } catch (e) { 
        console.error("Erro na carga da oferta:", e); 
        document.getElementById('titulo-produto').innerText = "Erro ao carregar material.";
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