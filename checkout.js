let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    const email = localStorage.getItem('prof_email');

    if (carrinho.length === 0 || !email) {
        window.location.href = 'index.html';
        return;
    }

    const total = carrinho.reduce((acc, item) => acc + item.preco, 0);
    document.getElementById('valor-final').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;

    const listaItens = document.getElementById('lista-itens-checkout');
    if (listaItens) {
        listaItens.innerHTML = carrinho.map(i => `
            <div class="flex justify-between text-[11px] mb-1">
                <span>${i.nome}</span>
                <span class="font-bold">R$ ${i.preco.toFixed(2).replace('.', ',')}</span>
            </div>
        `).join('');
    }

    gerarPixReal(total, email, carrinho);
});

async function gerarPixReal(total, email, carrinho) {
    const statusText = document.getElementById('pix-code');
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email.trim(), 
                total: total,
                produtos: carrinho // Enviando todos os itens para o backend
            })
        });

        const data = await response.json();
        if (data.qr_code_base64) {
            paymentId = data.id;
            pixCopiaECola = data.qr_code;
            loader.classList.add('hidden');
            img.src = `data:image/png;base64,${data.qr_code_base64}`;
            img.classList.remove('hidden');
            statusText.innerText = pixCopiaECola;
            iniciarVerificacaoStatus(data.id);
        }
    } catch (error) {
        statusText.innerText = "Erro ao gerar PIX.";
    }
}

function iniciarVerificacaoStatus(id) {
    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();
            if (data.status === 'approved') {
                clearInterval(checkInterval);
                finalizarCompraSucesso(); 
            }
        } catch (e) { console.log("⏳..."); }
    }, 5000); 
}

async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    // Chamar o registro que dispara o e-mail
    await fetch('https://educamateriais.shop/registrar-venda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, produtos: carrinho })
    });

    localStorage.removeItem('edu_cart');
    window.location.href = 'meus-materiais.html?sucesso=true';
}

function copyPix() {
    navigator.clipboard.writeText(pixCopiaECola);
    const btn = document.getElementById('btn-copy');
    btn.innerText = "✅ COPIADO!";
    setTimeout(() => btn.innerText = "Copiar Código Pix", 2000);
}