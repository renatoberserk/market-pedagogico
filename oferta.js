    let pixCopiaECola = "";
        let monitoramento = null;
        
        // VARIÁVEIS DINÂMICAS (PEGAS DA URL)
        let PRECO_FINAL = 19.90;
        let LINK_DRIVE_FINAL = "";

        // 1. FUNÇÃO QUE LÊ O LINK GERADO NO ADMIN
        function carregarConfiguracaoDaURL() {
            const params = new URLSearchParams(window.location.search);
            
            // Pega o preço (p)
            if (params.has('p')) {
                PRECO_FINAL = params.get('p');
                document.getElementById('valor-exibido').innerText = `R$ ${PRECO_FINAL.replace('.', ',')}`;
            }

            // Pega o link do Drive (d) e descodifica
            if (params.has('d')) {
                try {
                    LINK_DRIVE_FINAL = atob(params.get('d'));
                } catch (e) {
                    console.error("Erro ao ler link do Drive");
                }
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
                        total: parseFloat(PRECO_FINAL), // USA O VALOR DINÂMICO AQUI
                        itens: "Material Didático - Oferta Especial" 
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
                } catch (e) { console.error("Erro check"); }
            }, 5000);
        }

        function sucessoTotal() {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            document.getElementById('area-pagamento').innerHTML = `
                <div class="py-8 text-center fade-in">
                    <div class="text-5xl mb-4 text-center">✅</div>
                    <h2 class="text-2xl font-black text-slate-800">Pagamento Aprovado!</h2>
                    <p class="text-slate-500 mb-6">Seu acesso ao Google Drive está pronto.</p>
                    <a href="${LINK_DRIVE_FINAL}" target="_blank" class="inline-block w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-100 transition-transform active:scale-95 text-center">
                        🚀 ACESSAR GOOGLE DRIVE
                    </a>
                </div>`;
        }

        function copiarPix() {
            navigator.clipboard.writeText(pixCopiaECola);
            alert("Código copiado!");
        }

        // INICIALIZA AO CARREGAR
        document.addEventListener('DOMContentLoaded', carregarConfiguracaoDaURL);