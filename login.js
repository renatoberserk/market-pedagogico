let abaAtual = 'login';
        // Defina aqui seu email de admin
        const MEU_EMAIL_ADMIN = "elitonnrenato@gmail.com";

        function switchTab(tipo) {
            abaAtual = tipo;
            const isLogin = tipo === 'login';

            document.getElementById('tab-login').classList.toggle('tab-active', isLogin);
            document.getElementById('tab-cadastro').classList.toggle('tab-active', !isLogin);

            document.getElementById('wrapper-nome').classList.toggle('hidden', isLogin);
            document.getElementById('wrapper-whats').classList.toggle('hidden', isLogin);

            document.getElementById('nome').required = !isLogin;
            document.getElementById('whatsapp').required = !isLogin;

            document.getElementById('btn-submit').innerText = isLogin ? 'Entrar Agora' : 'Criar Minha Conta';
        }

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

            const url = `http://educamateriais.shop :3000/${abaAtual}`;

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
                        window.location.reload(); // Recarrega para limpar a tela e voltar ao login
                        return;
                    }

                    // Se for LOGIN bem-sucedido:
                    localStorage.clear();
                    localStorage.setItem('prof_nome', data.nome || 'Professor(a)');
                    localStorage.setItem('prof_email', data.email || emailDigitado);

                    // Lógica de Admin
                    const isAdmin = (data.email || emailDigitado).toLowerCase() === MEU_EMAIL_ADMIN.toLowerCase();
                    localStorage.setItem('prof_admin', isAdmin ? 'true' : 'false');

                    window.location.href = 'index.html';
                } else {
                    alert('⚠️ ' + (data.erro || 'Erro ao processar.'));
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('❌ Erro de conexão com o servidor.');
            } finally {
                btn.disabled = false;
                btn.innerText = abaAtual === 'login' ? 'Entrar Agora' : 'Criar Minha Conta';
            }
        }