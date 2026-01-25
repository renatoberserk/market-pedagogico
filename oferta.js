let PRECO_FINAL = 19.90;
let LINK_DRIVE_FINAL = "";
let pixCopiaECola = "";
let monitoramento = null;

// 1. LER DADOS DA URL AO CARREGAR
function inicializarOferta() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('p')) {
        PRECO_FINAL = params.get('p');
        // Atualiza o preço na tela
        const elPreco = document.querySelector('.text-4xl');
        if (elPreco) elPreco.innerText = `R$ ${PRECO_FINAL.replace('.', ',')}`;
    }
    
    if (params.has('d')) {
        try {
            LINK_DRIVE_FINAL = atob(params.get('d')); // Descodifica o link do drive
        } catch(e) {
            console.error("Erro ao ler link do drive");
        }
    }
}

// 2. GERAR O PIX (Usando sua rota do servidor)
async function gerarPagamentoPix() {
    const email = document.getElementById('email-cliente').value.trim();
    const btn = document.getElementById('btn-comprar');

    if (!email || !email.includes('@')) {
        alert("E-mail inválido.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "Gerando Pix...";

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                total: parseFloat(PRECO_FINAL),
                itens: "Material Pedagógico - Google Drive"
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            document.getElementById('etapa-email').classList.add('hidden');
            document.getElementById('area-pagamento').classList.remove('hidden');
            document.getElementById('qrcode-placeholder').innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto shadow-lg">`;
            pixCopiaECola = dados.qr_code;
            
            // Inicia checagem automática
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        alert("Erro ao processar. Tente novamente.");
        btn.disabled = false;
        btn.innerHTML = "COMPRAR AGORA";
    }
}

// 3. MONITORAR PAGAMENTO
function iniciarMonitoramento(id) {
    monitoramento = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const status = await res.json();
            if (status.status === 'approved') {
                clearInterval(monitoramento);
                entregarProduto();
            }
        } catch (e) {}
    }, 5000);
}

// 4. ENTREGA O LINK DO DRIVE
function entregarProduto() {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    
    document.getElementById('area-pagamento').innerHTML = `
        <div class="text-center py-6 fade-in">
            <div class="text-5xl mb-4 text-green-500 text-center">✅</div>
            <h2 class="text-2xl font-black text-slate-800">Pagamento Confirmado!</h2>
            <p class="text-slate-500 text-sm mb-8">Clique no botão abaixo para acessar seu material no Google Drive.</p>
            
            <a href="${LINK_DRIVE_FINAL}" target="_blank" 
               class="inline-block w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-green-700 transition-all">
                📂 ACESSAR NO GOOGLE DRIVE
            </a>
            
            <p class="mt-8 text-xs text-slate-400">Dica: Salve o link do Drive nos seus favoritos.</p>
        </div>
    `;
}

// Iniciar ao carregar
document.addEventListener('DOMContentLoaded', inicializarOferta);