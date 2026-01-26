document.addEventListener('DOMContentLoaded', () => {
    const email = localStorage.getItem('prof_email');
    if (!email) {
        window.location.href = 'login.html';
        return;
    }
    buscarMeusMateriais(email);
});

async function buscarMeusMateriais(email) {
    const container = document.getElementById('lista-materiais');

    try {
        // AJUSTE: Usando sua rota original com o email na URL
        const response = await fetch(`https://educamateriais.shop/meus-produtos/${email}`);
        const materiais = await response.json();

        if (!materiais || materiais.length === 0) {
            container.innerHTML = "<p class='text-center text-gray-400'>Nenhum material encontrado.</p>";
            return;
        }

        container.innerHTML = materiais.map(m => `
            <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="bg-orange-100 text-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center text-xl">📄</div>
                    <div>
                        <h3 class="font-bold text-gray-800 text-sm leading-tight">${m.nome}</h3>
                    </div>
                </div>
                <a href="${m.link_download}" target="_blank" 
                   class="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    📥
                </a>
            </div>
        `).join('');

    } catch (err) {
        console.error("Erro ao carregar materiais:", err);
    }
}