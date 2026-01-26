require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const cors = require('cors');
const CONFIG_PATH = path.join(__dirname, 'config-oferta.json');

const enviosRealizados = new Set();

const app = express();
const corsOptions = {
    origin: ['https://educamateriais.shop', 'http://educamateriais.shop'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Importante para o login do professor
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- CONFIGURAÇÃO MERCADO PAGO ---
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const resend = new Resend(process.env.RESEND_API_KEY);

const payment = new Payment(client);

// --- CONEXÃO BANCO DE DADOS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Versão com Promise para as estatísticas e rotas async
const dbPromise = db.promise();

db.connect((err) => {
    if (err) {
        console.error("Erro ao conectar no MySQL:", err);
    } else {
        console.log("✅ Conectado ao MySQL com sucesso!");
        // Garante que a tabela de vendas existe com a estrutura correta
        db.query(`
            CREATE TABLE IF NOT EXISTS vendas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_email VARCHAR(255) NOT NULL,
                produto_id INT NOT NULL,
                preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                data_venda DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    db.query("SELECT * FROM usuarios WHERE email = ? AND senha = ?", [email, senha], (err, results) => {
        if (results && results.length > 0) {
            res.json({ sucesso: true, nome: results[0].nome, email: results[0].email });
        } else {
            res.status(401).json({ sucesso: false, erro: "Credenciais inválidas" });
        }
    });
});

app.post('/cadastro', (req, res) => {
    const { nome, email, senha } = req.body;
    db.query("SELECT email FROM usuarios WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ sucesso: false, erro: "Erro no banco" });
        if (results.length > 0) return res.status(400).json({ sucesso: false, erro: "Este e-mail já está cadastrado!" });

        const sql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
        db.query(sql, [nome, email, senha], (err) => {
            if (err) return res.status(500).json({ sucesso: false, erro: "Erro ao salvar" });
            res.json({ sucesso: true });
        });
    });
});

app.get('/verificar-admin', (req, res) => {
    const email = req.query.email;
    res.json({ isAdmin: email === process.env.ADMIN_EMAIL });
});

// --- GESTÃO DE PRODUTOS ---

app.get('/produtos', (req, res) => {
    db.query("SELECT * FROM produtos", (err, results) => {
        res.json(results || []);
    });
});

app.post('/produtos', (req, res) => {
    // 1. Desestruturação com os novos campos (descricao, foto_extra1, foto_extra2)
    const { 
        email_admin, 
        nome, 
        preco, 
        link_download, 
        imagem_url, 
        categoria, 
        descricao, 
        foto_extra1, 
        foto_extra2 
    } = req.body;

    // 2. Verificação de segurança (mantida)
    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Acesso negado" });
    }

    // 3. SQL atualizado com as 8 colunas (adicionadas descricao e fotos extras)
    // Agora são 8 pontos de interrogação: ?, ?, ?, ?, ?, ?, ?, ?
    const sql = `
        INSERT INTO produtos 
        (nome, preco, link_download, imagem_url, categoria, descricao, foto_extra1, foto_extra2) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 4. Array de valores na ordem exata do SQL acima
    const valores = [
        nome, 
        preco, 
        link_download, 
        imagem_url, 
        categoria, 
        descricao || "",       // Se vier vazio, salva string vazia
        foto_extra1 || null,   // Se não tiver foto, salva como null
        foto_extra2 || null    // Se não tiver foto, salva como null
    ];

    db.query(sql, valores, (err) => {
        if (err) {
            console.error("❌ Erro ao inserir produto completo:", err);
            return res.status(500).json({ sucesso: false, erro: "Erro no banco de dados" });
        }
        res.json({ sucesso: true, mensagem: "Produto cadastrado com detalhes!" });
    });
});

app.put('/produtos/:id', (req, res) => {
    const { id } = req.params;
    // Adicionado categoria aqui embaixo:
    const { email_admin, nome, preco, link_download, imagem_url, categoria } = req.body;

    // Verificação de segurança
    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Não autorizado" });
    }

    // SQL atualizado para incluir a categoria
    const sql = "UPDATE produtos SET nome=?, preco=?, link_download=?, imagem_url=?, categoria=? WHERE id=?";

    db.query(sql, [nome, preco, link_download, imagem_url, categoria, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ sucesso: false });
        }
        res.json({ sucesso: true });
    });
});

app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { email_admin } = req.body;

    // 1. Verificação rigorosa do Admin (vinda do seu .env)
    if (!email_admin || email_admin !== process.env.ADMIN_EMAIL) {
        console.warn(`[Segurança] Tentativa de delete negada para: ${email_admin}`);
        return res.status(403).json({ erro: "Não autorizado", sucesso: false });
    }

    // 2. Execução da exclusão
    const sql = "DELETE FROM produtos WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Erro ao deletar produto:", err);
            return res.status(500).json({ sucesso: false, erro: "Erro no banco de dados" });
        }

        // 3. Verifica se o ID existia (evita falso positivo)
        if (result.affectedRows === 0) {
            return res.status(404).json({ sucesso: false, erro: "Produto não encontrado" });
        }

        console.log(`[Admin] Produto ${id} removido por ${email_admin}`);
        res.json({ sucesso: true });
    });
});

// --- PAGAMENTO E COMPRAS ---

// 1. RECUPERAÇÃO DO LINK COM PROTEÇÃO
// O "|| ''" garante que se o localStorage estiver vazio, o código não quebre ao usar .trim()
window.LINK_DRIVE_FINAL = localStorage.getItem('link_pendente') || "";

console.log("🔗 Link recuperado do localStorage:", window.LINK_DRIVE_FINAL);

let paymentId = null;
let pixCopiaECola = "";
let checkInterval = null;

// 2. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Checkout iniciado...");
    
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];
    
    // Validação de Carrinho
    if (!carrinho || carrinho.length === 0) {
        console.warn("🛒 Carrinho vazio, redirecionando...");
        window.location.href = 'index.html';
        return;
    }

    // Cálculo do Total
    const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
    
    const valorDisplay = document.getElementById('valor-final');
    if (valorDisplay) {
        valorDisplay.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Dispara a geração automática do Pix
    gerarPixReal(total);
});

// 3. GERAÇÃO DO PIX NO MERCADO PAGO
async function gerarPixReal(total) {
    const email = localStorage.getItem('prof_email') || "";
    const statusText = document.getElementById('pix-code');
    const loader = document.getElementById('qr-loader');
    const img = document.getElementById('qr-code-img');
    const btnGerar = document.getElementById('btn-gerar-pix');

    // --- BLOQUEIO DE SEGURANÇA (EVITA O ERRO DE NULL) ---
    if (!window.LINK_DRIVE_FINAL || window.LINK_DRIVE_FINAL.trim() === "" || window.LINK_DRIVE_FINAL === "undefined") {
        console.error("❌ ERRO: O link do material está faltando no checkout.");
        alert("Não conseguimos localizar o link do material. Por favor, volte à loja e selecione o produto novamente.");
        if (btnGerar) btnGerar.innerHTML = "ERRO: LINK NÃO ENCONTRADO";
        return; 
    }

    console.log("📡 Enviando link para o servidor:", window.LINK_DRIVE_FINAL.trim());

    if (loader) loader.classList.remove('hidden');
    if (img) img.classList.add('hidden');

    try {
        const response = await fetch('https://educamateriais.shop/criar-pagamento-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                total: total,
                link: window.LINK_DRIVE_FINAL.trim() // Agora o .trim() é seguro
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detalhes || "Erro no servidor");
        }

        const data = await response.json();

        if (data.qr_code_base64 && data.qr_code) {
            console.log("✅ Pix gerado com sucesso! ID:", data.id);
            paymentId = data.id;
            pixCopiaECola = data.qr_code;

            if (loader) loader.classList.add('hidden');

            if (img) {
                img.src = `data:image/png;base64,${data.qr_code_base64}`;
                img.classList.remove('hidden');
            }

            if (statusText) {
                statusText.innerText = pixCopiaECola;
                statusText.classList.remove('text-gray-400');
            }

            iniciarVerificacaoStatus(data.id);
        } else {
            throw new Error("Resposta do Pix incompleta");
        }
    } catch (error) {
        console.error("❌ Erro ao gerar Pix:", error);
        if (statusText) statusText.innerText = "Erro ao gerar código. Tente recarregar a página.";
        if (loader) loader.classList.add('hidden');
    }
}

// 4. VERIFICAÇÃO DE PAGAMENTO
function iniciarVerificacaoStatus(id) {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://educamateriais.shop/verificar-pagamento/${id}`);
            const data = await res.json();

            if (data.status === 'approved') {
                console.log("💰 Pagamento aprovado! Finalizando...");
                clearInterval(checkInterval);
                finalizarCompraSucesso(); 
            }
        } catch (e) {
            console.log("⏳ Aguardando confirmação do pagamento...");
        }
    }, 5000); 
}

// 5. REDIRECIONAMENTO APÓS SUCESSO
async function finalizarCompraSucesso() {
    const email = localStorage.getItem('prof_email');
    const carrinho = JSON.parse(localStorage.getItem('edu_cart')) || [];

    try {
        // Log antes de limpar os dados para garantir que sabemos o que deu certo
        console.log("🎁 Entregando material para:", email);
        console.log("🔗 Link final da entrega:", window.LINK_DRIVE_FINAL);

        await fetch('https://educamateriais.shop/registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, produtos: carrinho })
        });

        // Limpa cache de compra
        localStorage.removeItem('edu_cart');
        localStorage.removeItem('link_pendente');
        
        window.location.href = 'meus-materiais.html?sucesso=true';

    } catch (err) {
        console.error("⚠️ Erro ao registrar venda, mas o pagamento foi feito:", err);
        localStorage.removeItem('edu_cart');
        window.location.href = 'meus-materiais.html?verificar=1';
    }
}

// 6. FUNÇÃO DE COPIAR (PIX COPIA E COLA)
function copyPix() {
    const pixElement = document.getElementById('pix-code');
    const textoParaCopiar = pixElement ? pixElement.innerText : pixCopiaECola;

    if (!textoParaCopiar || textoParaCopiar.length < 10 || textoParaCopiar.includes("Erro")) {
        alert("Aguarde o QR Code carregar.");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textoParaCopiar).then(() => {
            animarBotaoSucesso();
        }).catch(() => {
            fallbackCopyText(textoParaCopiar);
        });
    } else {
        fallbackCopyText(textoParaCopiar);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        animarBotaoSucesso();
    } catch (err) {
        console.error("Erro ao copiar:", err);
    }
    document.body.removeChild(textArea);
}

function animarBotaoSucesso() {
    const btn = document.getElementById('btn-copy');
    if (!btn) return;

    const originalText = btn.innerText;
    btn.innerText = "✅ COPIADO!";
    btn.classList.add('bg-green-600', 'text-white');
    
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-green-600', 'text-white');
    }, 2000);
}
/////////////////////////////////////////////////////////
app.get('/verificar-pagamento/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        const data = await response.json();

        if (data.status === 'approved') {
            const linkMaterial = data.metadata?.link_entrega;
            const emailCliente = data.metadata?.email_cliente;

            if (linkMaterial && emailCliente) {
                // Chama a função de e-mail (que definiremos abaixo)
                enviarEmailEntrega(emailCliente, linkMaterial);
            }
            return res.json({ status: 'approved' });
        }
        res.json({ status: data.status });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao verificar" });
    }
});
/////////////////////////////////////////////////////////

app.post('/registrar-venda', (req, res) => {
    const { email, produtos } = req.body;
    if (!produtos || produtos.length === 0) return res.status(400).json({ error: "Carrinho vazio" });

    const valores = produtos.map(p => [email, p.id, p.preco, new Date()]);
    const sql = "INSERT INTO vendas (usuario_email, produto_id, preco, data_venda) VALUES ?";

    db.query(sql, [valores], (err) => {
        if (err) return res.status(500).json({ error: "Erro ao salvar" });
        res.json({ success: true });
    });
});

app.get('/meus-produtos/:email', (req, res) => {
    const email = req.params.email;
    const sql = `
        SELECT p.* FROM produtos p
        JOIN vendas v ON p.id = v.produto_id
        WHERE v.usuario_email = ?
    `;
    db.query(sql, [email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro no banco" });
        res.json(rows);
    });
});

// --- ESTATÍSTICAS DO ADMIN (CONSOLIDADO) ---

app.get('/admin/stats', async (req, res) => {
    try {
        // Consultas de Receita
        const [hoje] = await dbPromise.query("SELECT SUM(preco) as total FROM vendas WHERE DATE(data_venda) = CURDATE()");
        const [ontem] = await dbPromise.query("SELECT SUM(preco) as total FROM vendas WHERE DATE(data_venda) = SUBDATE(CURDATE(), 1)");
        const [mesAtual] = await dbPromise.query("SELECT SUM(preco) as total FROM vendas WHERE MONTH(data_venda) = MONTH(CURDATE()) AND YEAR(data_venda) = YEAR(CURDATE())");
        const [mesAnterior] = await dbPromise.query("SELECT SUM(preco) as total FROM vendas WHERE MONTH(data_venda) = MONTH(SUBDATE(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(data_venda) = YEAR(SUBDATE(CURDATE(), INTERVAL 1 MONTH))");

        // Consultas de Contagem
        const [totalVendas] = await dbPromise.query("SELECT COUNT(*) as qtd FROM vendas");
        const [totalClientes] = await dbPromise.query("SELECT COUNT(*) as qtd FROM usuarios");

        // Busca a lista para a tabela (Usando data_cadastro)
        const [listaUltimos] = await dbPromise.query("SELECT nome, email, data_cadastro FROM usuarios ORDER BY data_cadastro DESC LIMIT 5");

        res.json({
            hoje: parseFloat(hoje[0].total) || 0,
            ontem: parseFloat(ontem[0].total) || 0,
            mes_atual: parseFloat(mesAtual[0].total) || 0,
            mes_anterior: parseFloat(mesAnterior[0].total) || 0,
            total_vendas: totalVendas[0].qtd || 0,
            total_clientes: totalClientes[0].qtd || 0,
            lista_clientes: listaUltimos
        });
    } catch (error) {
        console.error("Erro SQL Stats:", error);
        res.status(500).json({ error: "Erro interno" });
    }
});

// Rota para deletar usuário (Coloque antes do app.listen)
app.delete('/admin/usuarios/:email', async (req, res) => {
    const { email } = req.params;
    const { email_admin } = req.body;

    // Verificação de segurança básica
    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Não autorizado" });
    }

    try {
        await dbPromise.query("DELETE FROM usuarios WHERE email = ?", [email]);
        res.json({ sucesso: true, mensagem: "Usuário removido com sucesso" });
    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        res.status(500).json({ sucesso: false, erro: "Erro ao deletar do banco" });
    }
});

// Rota para o Admin Salvar
app.post('/api/salvar-oferta', (req, res) => {
    const { preco, link, titulo, capa, foto1, foto2 } = req.body;
    const dados = {
        preco,
        link,
        titulo,
        capa,
        foto1,
        foto2,
        atualizadoEm: new Date()
    };
    fs.writeFileSync('./config-oferta.json', JSON.stringify(dados, null, 2));
    res.json({ sucesso: true });
});

// Rota para a Página de Oferta ler os dados
app.get('/api/config-oferta', (req, res) => {
    if (fs.existsSync(CONFIG_PATH)) {
        const dados = fs.readFileSync(CONFIG_PATH, 'utf8');
        res.json(JSON.parse(dados));
    } else {
        res.json({ preco: "19.90", link: "" }); // Padrão caso não exista
    }
});












async function enviarEmailEntrega(emailDestino, linkMaterial) {
    console.log(`🔎 Preparando envio para: ${emailDestino}`);

    if (!emailDestino || !linkMaterial) {
        console.error("❌ Erro: E-mail ou Link ausentes. Abortando.");
        return;
    }

    // Template Profissional (Cor Laranja da sua marca)
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #f97316; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Seu Material Chegou! 🎨</h1>
            </div>
            
            <div style="padding: 30px; background-color: white;">
                <p style="font-size: 16px; color: #475569;">Olá, tudo bem?</p>
                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                    Ficamos muito felizes com sua confiança na <strong>Educa Materiais</strong>! Preparamos tudo com muito carinho para facilitar o seu dia a dia em sala de aula.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${linkMaterial}" 
                       style="display: inline-block; background-color: #22c55e; color: white; padding: 18px 35px; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 18px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        📥 BAIXAR MEU MATERIAL AGORA
                    </a>
                </div>

                <p style="font-size: 14px; color: #64748b; font-style: italic; text-align: center;">
                    Dica: Recomendamos salvar o arquivo em seu computador ou Google Drive para não perder o acesso.
                </p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                    Dúvidas? Responda a este e-mail ou visite nossa loja:<br>
                    <a href="https://educamateriais.shop" style="color: #f97316; text-decoration: none; font-weight: bold;">educamateriais.shop</a>
                </p>
            </div>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            // CORREÇÃO AQUI: Usando seu domínio verificado
            from: 'Educa Materiais <contato@educamateriais.shop>', 
            to: [emailDestino],
            subject: '✅ Confirmado! Aqui está seu material pedagógico',
            html: htmlContent
        });

        if (error) {
            console.error("❌ Erro retornado pelo Resend:", error);
        } else {
            console.log("✅ E-mail enviado com sucesso! ID:", data.id);
        }
    } catch (err) {
        console.error("💥 Falha ao disparar e-mail:", err.message);
    }
}

// --- INICIALIZAÇÃO ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    // O log agora reflete a URL final que o público acessa
    console.log(`🚀 Servidor backend rodando internamente na porta ${PORT}`);
    console.log(`🌍 Acesse publicamente em: https://educamateriais.shop`);
});
