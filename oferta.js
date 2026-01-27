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
            TITULO_PRODUTO = dados.nome || dados.titulo;
            PRECO_FINAL = dados.preco;
            LINK_DRIVE_FINAL = dados.link_download || dados.link;

            document.getElementById('titulo-produto').innerText = TITULO_PRODUTO;
            document.getElementById('valor-exibido').innerText = parseFloat(PRECO_FINAL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('capa-produto').src = dados.imagem_url || dados.capa;
        }
    } catch (e) { console.error("Erro ao carregar oferta"); }
}

async function gerarPagamentoPix() {
    const email = document.getElementById('email-cliente').value.trim();
    const btn = document.getElementById('btn-comprar');

    if (!email.includes('@')) return alert("E-mail inválido");
    
    btn.disabled = true;
    btn.innerText = "GERANDO...";

    try {
        const res = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, total: parseFloat(PRECO_FINAL), titulo: TITULO_PRODUTO, link: LINK_DRIVE_FINAL })
        });
        
        const dados = await res.json();
        if (dados.qr_code_base64) {
            pixCopiaECola = dados.qr_code;
            document.getElementById('etapa-email').classList.add('hidden');
            document.getElementById('area-pagamento').classList.remove('hidden');
            document.getElementById('qrcode-placeholder').innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 rounded-xl shadow-lg">`;
            
            iniciarMonitoramento(dados.id);
        }
    } catch (e) { btn.disabled = false; btn.innerText = "TENTAR NOVAMENTE"; }
}

function iniciarMonitoramento(id) {
    const intervalo = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            if (data.status === 'approved') {
                clearInterval(intervalo);
                exibirSucesso();
            }
        } catch (e) {}
    }, 5000);
}

function exibirSucesso() {
    // Redireciona ou mostra o link na tela usando o estilo inline que já funciona
    const area = document.getElementById('area-pagamento');
    area.innerHTML = `
        <div class="text-center py-6">
            <h2 class="text-2xl font-black text-green-600 mb-4">Pagamento Confirmado!</h2>
            <a href="${LINK_DRIVE_FINAL}" target="_blank" 
               style="background:#22c55e; color:white; padding:20px; border-radius:15px; display:block; text-decoration:none; font-weight:bold;">
               📥 BAIXAR MATERIAL AGORA
            </a>
        </div>`;
}

function copiarPix() {
    navigator.clipboard.writeText(pixCopiaECola);
    alert("Código PIX copiado!");
}