 let paymentId = null;
        let pixCopiaECola = "";
        let checkInterval = null;

        document.addEventListener('DOMContentLoaded', () => {
            const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
            if (carrinho.length === 0) return window.location.href = 'index.html';

            const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
            document.getElementById('valor-final').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;

            gerarPixReal(total);
        });

        async function gerarPixReal(total) {
            const email = localStorage.getItem('prof_email');

            try {
                const response = await fetch('http://191.252.214.27:3000/criar-pagamento-pix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, total })
                });

                const data = await response.json();

                if (data.qr_code_base64) {
                    paymentId = data.id;
                    pixCopiaECola = data.qr_code;

                    // Atualiza Interface
                    document.getElementById('qr-loader').classList.add('hidden');
                    const img = document.getElementById('qr-code-img');
                    img.src = `data:image/jpeg;base64,${data.qr_code_base64}`;
                    img.classList.remove('hidden');
                    document.getElementById('pix-code').innerText = pixCopiaECola;

                    // Começa a verificar status
                    iniciarVerificacaoStatus(data.id);
                }
            } catch (error) {
                console.error("Erro ao gerar Pix:", error);
                document.getElementById('pix-code').innerText = "Erro ao conectar com servidor.";
            }
        }

        function iniciarVerificacaoStatus(id) {
            checkInterval = setInterval(async () => {
                try {
                    const res = await fetch(`http://191.252.214.27:3000/verificar-pagamento/${id}`);
                    const data = await res.json();

                    if (data.status === 'approved') {
                        clearInterval(checkInterval);
                        finalizarCompraSucesso();
                    }
                } catch (e) {
                    console.log("Aguardando rede...");
                }
            }, 5000); // Verifica a cada 5 segundos
        }

        async function finalizarCompraSucesso() {
            const email = localStorage.getItem('prof_email');
            const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

            // 1. Avisa o servidor para liberar esses itens para o e-mail do professor
            await fetch('http://191.252.214.27:3000/registrar-venda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, produtos: carrinho })
            });

            // 2. Limpa o carrinho
            localStorage.removeItem('edu_cart');

            // 3. Agora sim, redireciona!
            window.location.href = 'meus-materiais.html';
        }

        function copyPix() {
            if (!pixCopiaECola) return;
            const btn = document.getElementById('btn-copy');

            navigator.clipboard.writeText(pixCopiaECola).then(() => {
                btn.innerText = "COPIADO!";
                btn.classList.replace('bg-blue-600', 'bg-green-600');
                setTimeout(() => {
                    btn.innerText = "COPIAR";
                    btn.classList.replace('bg-green-600', 'bg-blue-600');
                }, 2000);
            });
        }