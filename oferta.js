let pixCopiaECola = "";
let monitoramento = null;

// VARIÁVEIS QUE VÃO RECEBER OS DADOS DO SERVIDOR
let PRECO_FINAL = "19.90";
let LINK_DRIVE_FINAL = "";

// 1. FUNÇÃO QUE BUSCA O QUE VOCÊ SALVOU NO MODO ADM
async function carregarProdutoAtivo() {
    try {
        // Busca os dados que o seu Admin salvou no config-oferta.json
        const response = await fetch('https://educamateriais.shop/api/config-oferta');
        const dados = await response.json();
        
        if (dados.preco && dados.link) {
            PRECO_FINAL = dados.preco;
            LINK_DRIVE_FINAL = dados.link;
            
            // Atualiza o preço visualmente na página
            const elPreco = document.getElementById('valor-exibido');
            if (elPreco) {
                elPreco.innerText = `R$ ${PRECO_FINAL.replace('.', ',')}`;
            }
            console.log("Produto carregado do servidor:", PRECO_FINAL);
        }
    } catch (err) {
        console.error("Erro ao carregar produto do servidor. Usando padrão.");
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
                total: parseFloat(PRECO_FINAL), // VALOR QUE VEIO DO ADM
                itens: "Material Didático - Acesso VIP" 
            })
        });

        const dados = await response.json();

        if (dados.qr_code_base64) {
            document.getElementById('etapa-email').classList.add('hidden');
            document.getElementById('area-pagamento').classList.remove('hidden');
            document.getElementById('qrcode-placeholder').innerHTML = `<img src="data:image/png;base64,${dados.qr_code_base64}" class="w-48 h-48 mx-auto">`;
            pixCopiaECola = dados.qr_code;
            iniciarMonitoramento(dados.id);
        }
    } catch (err) {
        alert("Erro ao gerar PIX. Tente novamente.");
        btn.disabled = false; btn.innerHTML = "COMPRAR AGORA";
    }
}

function iniciarMonitoramento(id) {
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
            <p class="text-slate-500 mb-6">Seu acesso ao Google Drive foi liberado.</p>
            
            <a href="${LINK_DRIVE_FINAL}" target="_blank" class="inline-block w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-100 transition-transform active:scale-95 text-center mb-8">
                🚀 ACESSAR MEU MATERIAL
            </a>

            <div class="mt-10 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p class="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">✨ Não Pare por aqui!</p>
                <h3 class="text-lg font-bold text-slate-800 mb-3">Gostou deste material?</h3>
                <p class="text-slate-500 text-sm mb-5">Temos centenas de outras atividades criativas prontas para transformar suas aulas!</p>
                
                <a href="https://educamateriais.shop/" class="inline-flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200">
                    <span>CONHECER TODOS OS MATERIAIS</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        </div>`;
}

function copiarPix() {
    navigator.clipboard.writeText(pixCopiaECola);
    alert("Código copiado!");
}

// IMPORTANTE: Agora chamamos carregarProdutoAtivo em vez de carregarConfiguracaoDaURL
document.addEventListener('DOMContentLoaded', carregarProdutoAtivo);