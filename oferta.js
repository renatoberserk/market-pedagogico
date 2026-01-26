let pixCopiaECola = "";
let monitoramento = null;

// VARIÁVEIS QUE VÃO RECEBER OS DADOS DO SERVIDOR
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = "";

// 1. FUNÇÃO QUE BUSCA TUDO (TÍTULO, PREÇO, LINK E IMAGENS)
async function carregarProdutoAtivo() {
    try {
        const response = await fetch('https://educamateriais.shop/api/config-oferta');
        const dados = await response.json();
        
        if (dados) {
            // Atualiza os dados globais
            PRECO_FINAL = dados.preco || "19.90";
            LINK_DRIVE_FINAL = dados.link || "";
            
            // Atualiza o Título
            const elTitulo = document.getElementById('titulo-produto');
            if (elTitulo) elTitulo.innerText = dados.titulo || "Combo Alfabetização Criativa";

            // Atualiza o Preço
            const elPreco = document.getElementById('valor-exibido');
            if (elPreco) {
                elPreco.innerText = `R$ ${PRECO_FINAL.replace('.', ',')}`;
            }

            // ATUALIZA AS IMAGENS (CAPA + AMOSTRAS)
            if (dados.capa) {
                document.getElementById('capa-produto').src = dados.capa;
            }
            if (dados.foto1) {
                const f1 = document.getElementById('foto1-produto');
                f1.src = dados.foto1;
                f1.parentElement.classList.remove('hidden'); // Mostra a div se estiver oculta
            }
            if (dados.foto2) {
                const f2 = document.getElementById('foto2-produto');
                f2.src = dados.foto2;
                f2.parentElement.classList.remove('hidden');
            }

            console.log("✅ Interface atualizada com sucesso");
        }
    } catch (err) {
        console.error("❌ Erro ao carregar produto:", err);
    }
}

async function gerarPagamentoPix() {
    const email = document.getElementById('email-cliente').value.trim();
    const btn = document.getElementById('btn-comprar');

    if (!email || !email.includes('@')) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Aguarde...`;

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: parseFloat(PRECO_FINAL)
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            document.getElementById('etapa-email').classList.add('hidden');
            // Esconde a galeria de amostras para dar foco ao QR Code
            const galeria = document.getElementById('galeria-amostras');
            if(galeria) galeria.classList.add('hidden');

            document.getElementById('area-pagamento').classList.remove('hidden');
            document.getElementById('qrcode-placeholder').innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto">`;
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        alert("Erro ao gerar PIX. Tente novamente.");
        btn.disabled = false; 
        btn.innerHTML = "COMPRAR AGORA";
    }
}

function iniciarMonitoramento(id) {
    if (monitoramento) clearInterval(monitoramento); // Limpa se houver um antigo
    
    monitoramento = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            if (data.status === 'approved') {
                clearInterval(monitoramento);
                sucessoTotal();
            }
        } catch (e) { console.error("Erro na verificação"); }
    }, 5000);
}

function sucessoTotal() {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    
    document.getElementById('area-pagamento').innerHTML = `
        <div class="py-8 text-center fade-in">
            <div class="text-5xl mb-4 text-center">✅</div>
            <h2 class="text-2xl font-black text-slate-800">Pagamento Aprovado!</h2>
            <p class="text-slate-500 mb-6">O material foi enviado para seu e-mail e liberado abaixo:</p>
            
            <a href="${LINK_DRIVE_FINAL}" target="_blank" class="inline-block w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-100 transition-transform active:scale-95 text-center mb-8">
                🚀 ACESSAR MEU MATERIAL
            </a>

            <div class="mt-10 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p class="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">✨ Não Pare por aqui!</p>
                <h3 class="text-lg font-bold text-slate-800 mb-3">Gostou deste material?</h3>
                <a href="https://educamateriais.shop/" class="inline-flex items-center justify-center gap-2 w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-slate-200">
                    <span>VITRINE COMPLETA</span>
                </a>
            </div>
        </div>`;
}

function copiarPix() {
    navigator.clipboard.writeText(pixCopiaECola);
    alert("Código PIX copiado com sucesso!");
}

document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);