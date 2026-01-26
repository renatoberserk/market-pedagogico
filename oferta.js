let pixCopiaECola = "";
let monitoramento = null;

// VARIÁVEIS QUE VÃO RECEBER OS DADOS DO SERVIDOR
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = "";
let TITULO_PRODUTO = "";

// 1. CARREGA AS CONFIGURAÇÕES DO SERVIDOR
async function carregarProdutoAtivo() {
    try {
        const response = await fetch('https://educamateriais.shop/api/config-oferta');
        const dados = await response.json();
        
        if (dados) {
            PRECO_FINAL = dados.preco || "19.90";
            LINK_DRIVE_FINAL = dados.link || "";
            TITULO_PRODUTO = dados.titulo || "Material Pedagógico";
            
            // Atualiza Título na página
            const elTitulo = document.getElementById('titulo-produto');
            if (elTitulo) elTitulo.innerText = TITULO_PRODUTO;

            // Atualiza Preço na página
            const elPreco = document.getElementById('valor-exibido');
            if (elPreco) {
                elPreco.innerText = `R$ ${PRECO_FINAL.replace('.', ',')}`;
            }

            // Atualiza Imagens
            if (dados.capa) document.getElementById('capa-produto').src = dados.capa;
            
            if (dados.foto1) {
                const f1 = document.getElementById('foto1-produto');
                f1.src = dados.foto1;
                f1.parentElement.classList.remove('hidden');
            }
            if (dados.foto2) {
                const f2 = document.getElementById('foto2-produto');
                f2.src = dados.foto2;
                f2.parentElement.classList.remove('hidden');
            }

            console.log("✅ Interface da oferta carregada.");
        }
    } catch (err) {
        console.error("❌ Erro ao carregar produto:", err);
    }
}

// 2. GERA O PAGAMENTO COM BLINDAGEM DE METADATA
async function gerarPagamentoPix() {
    const email = document.getElementById('email-cliente').value.trim();
    const btn = document.getElementById('btn-comprar');

    if (!email || !email.includes('@')) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Gerando PIX...`;

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: parseFloat(PRECO_FINAL),
                titulo: TITULO_PRODUTO,   // Enviado para o Metadata
                link: LINK_DRIVE_FINAL,   // Enviado para o Metadata
                origem: 'oferta_ativa'    // Orienta o servidor a usar o link oficial
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            // UI Feedback
            document.getElementById('etapa-email').classList.add('hidden');
            const galeria = document.getElementById('galeria-amostras');
            if(galeria) galeria.classList.add('hidden');

            document.getElementById('area-pagamento').classList.remove('hidden');
            document.getElementById('qrcode-placeholder').innerHTML = `
                <img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto shadow-lg rounded-lg">
            `;
            
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        alert("Erro ao gerar pagamento. Tente novamente.");
        btn.disabled = false; 
        btn.innerHTML = "COMPRAR AGORA";
    }
}

// 3. MONITORAMENTO DE STATUS
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
        } catch (e) { console.error("Aguardando confirmação..."); }
    }, 5000);
}

// 4. TELA DE SUCESSO
function sucessoTotal() {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    
    document.getElementById('area-pagamento').innerHTML = `
        <div class="py-8 text-center fade-in">
            <div class="text-6xl mb-4">✅</div>
            <h2 class="text-2xl font-bold text-slate-800">Pagamento Confirmado!</h2>
            <p class="text-slate-500 mb-6 px-4">Enviamos o material para o seu e-mail, mas você já pode baixar agora:</p>
            
            <a href="${LINK_DRIVE_FINAL}" target="_blank" class="inline-block w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-green-700 transition-all active:scale-95 text-center mb-8">
                🚀 ACESSAR MEU MATERIAL
            </a>

            <div class="mt-10 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p class="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">Dica Educa</p>
                <h3 class="text-md font-bold text-slate-800 mb-3">Conheça nossos outros materiais!</h3>
                <a href="https://educamateriais.shop/" class="inline-block w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm">
                    VOLTAR PARA A LOJA
                </a>
            </div>
        </div>`;
}

function copiarPix() {
    navigator.clipboard.writeText(pixCopiaECola);
    alert("Código copiado! Use o 'Pix Copia e Cola' no seu banco.");
}

document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);