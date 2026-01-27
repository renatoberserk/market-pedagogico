let pixCopiaECola = "";
let PRECO_FINAL = "";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

document.addEventListener('DOMContentLoaded', carregarProduto);

async function carregarProduto() {
    try {
        const res = await fetch(`https://educamateriais.shop/api/config-oferta?t=${Date.now()}`);
        const dados = await res.json();

        if (dados) {
            TITULO_PRODUTO = dados.nome || dados.titulo || "Material Pedagógico";
            PRECO_FINAL = dados.preco || "19.90";
            LINK_DRIVE_FINAL = (dados.link_download || dados.link || "").trim();

            document.getElementById('titulo-produto').innerText = TITULO_PRODUTO;
            document.getElementById('valor-exibido').innerText = parseFloat(PRECO_FINAL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            const imgCapa = document.getElementById('capa-produto');
            if (dados.imagem_url) imgCapa.src = dados.imagem_url;
        }
    } catch (e) { console.error("Erro na carga:", e); }
}

async function gerarPagamentoPix() {
    const email = document.getElementById('email-cliente').value.trim();
    const btn = document.getElementById('btn-comprar');

    if (!email.includes('@')) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse text-white">GERANDO...</span>`;

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
            document.getElementById('qrcode-placeholder').innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-52 h-52">`;
            
            iniciarMonitoramento(dados.id);
        }
    } catch (e) { 
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
                window.location.href = `sucesso.html?link=${encodeURIComponent(LINK_DRIVE_FINAL)}`;
            }
        } catch (e) {}
    }, 5000);
}

function copiarPix() {
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
        alert("Código PIX copiado com sucesso!");
    });
}

async function carregarOfertaAtiva() {
    try {
        // Busca a única oferta marcada como ativa no seu banco
        const res = await fetch(`https://educamateriais.shop/api/get-oferta-ativa`);
        
        if (!res.ok) throw new Error("Erro ao buscar oferta");

        const dados = await res.json();

        // Preenche a página automaticamente
        document.getElementById('titulo-produto').innerText = dados.nome;
        document.getElementById('valor-exibido').innerText = `R$ ${dados.preco}`;
        document.getElementById('capa-produto').src = dados.imagem_url;
        
        // Guarda os dados para o PIX
        LINK_DRIVE_FINAL = dados.link_download;
        PRECO_FINAL = dados.preco;
        TITULO_PRODUTO = dados.nome;

    } catch (e) {
        console.error("Erro:", e);
    }
}