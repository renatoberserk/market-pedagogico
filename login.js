let abaAtual = 'login';
const MEU_EMAIL_ADMIN = "elitonnrenato@gmail.com";

// Função para alternar entre Login e Cadastro
function switchTab(tipo) {
    abaAtual = tipo;
    const isLogin = tipo === 'login';

    // UI Updates
    document.getElementById('tab-login').classList.toggle('tab-active', isLogin);
    document.getElementById('tab-cadastro').classList.toggle('tab-active', !isLogin);
    document.getElementById('wrapper-nome').classList.toggle('hidden', isLogin);
    document.getElementById('wrapper-whats').classList.toggle('hidden', isLogin);

    // Campos obrigatórios apenas no cadastro
    document.getElementById('nome').required = !isLogin;
    document.getElementById('whatsapp').required = !isLogin;

    document.getElementById('btn-submit').innerText = isLogin ? 'Entrar Agora' : 'Criar Minha Conta';
}

// Função de Logout (Para o botão 🚀 usar)
function fazerLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Processar Autenticação
async function processarAuth(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');

    const emailDigitado = document.getElementById('email').value.trim();
    const payload = {
        nome: document.getElementById('nome').value,
        email: emailDigitado,
        senha: document.getElementById('senha').value,
        whatsapp: document.getElementById('whatsapp').value
    };

    const url = `https://educamateriais.shop/${abaAtual}`;

    try {
        btn.innerText = 'Processando... 🍎';
        btn.disabled = true;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.sucesso) {
            if (abaAtual === 'cadastro') {
                alert('✅ Conta criada com sucesso! Faça seu login.');
                window.location.reload();
                return;
            }

            // LOGIN BEM-SUCEDIDO
            localStorage.clear();
            localStorage.setItem('prof_nome', data.nome || 'Professor(a)');
            localStorage.setItem('prof_email', (data.email || emailDigitado).toLowerCase());

            // Verifica se é o dono do site
            const isAdmin = (data.email || emailDigitado).toLowerCase() === MEU_EMAIL_ADMIN.toLowerCase();
            localStorage.setItem('prof_admin', isAdmin ? 'true' : 'false');

            // REDIRECIONAMENTO DINÂMICO
            if (isAdmin) {
                window.location.href = 'admin.html'; // Se for você, vai pro painel
            } else {
                window.location.href = 'index.html'; // Se for aluno, vai pra vitrine
            }

        } else {
            alert('⚠️ ' + (data.erro || 'E-mail ou senha incorretos.'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro de conexão. Verifique se o servidor está online.');
    } finally {
        btn.disabled = false;
        btn.innerText = abaAtual === 'login' ? 'Entrar Agora' : 'Criar Minha Conta';
    }
}

function fazerLogout() {
    // Limpa qualquer dado que possa estar salvo
    localStorage.clear();
    
    // Redireciona para a mesma página (resetando o formulário) 
    // ou para a index.html se quiser que ele volte para a loja
    window.location.href = 'login.html'; 
}