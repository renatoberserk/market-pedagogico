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


// --- ROTA PARA EDITAR PRODUTO (PUT) ---
app.put('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { 
        email_admin, nome, preco, link_download, 
        imagem_url, foto_extra1, foto_extra2, descricao, categoria 
    } = req.body;

    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ sucesso: false, erro: "Não autorizado" });
    }

    // SQL com os nomes exatos do seu DESCRIBE
    const sql = `
        UPDATE produtos 
        SET nome=?, preco=?, link_download=?, imagem_url=?, foto_extra1=?, foto_extra2=?, descricao=?, categoria=? 
        WHERE id=?
    `;

    const valores = [nome, preco, link_download, imagem_url, foto_extra1, foto_extra2, descricao, categoria, id];

    db.query(sql, valores, (err) => {
        if (err) {
            console.error("❌ Erro SQL:", err);
            return res.status(500).json({ sucesso: false, erro: err.message });
        }
        res.json({ sucesso: true });
    });
});

// --- ROTA PARA CADASTRAR NOVO (POST) ---
app.post('/produtos', (req, res) => {
    // 1. Desestruturação com nomes corrigidos para bater com o admin.js
    const { 
        email_admin, nome, preco, link_download, 
        imagem_url, foto_extra1, foto_extra2, descricao, categoria 
    } = req.body;

    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ sucesso: false, erro: "Não autorizado" });
    }

    // 2. SQL atualizado com foto_extra1 e foto_extra2
    const sql = `
        INSERT INTO produtos (nome, preco, link_download, imagem_url, foto_extra1, foto_extra2, descricao, categoria) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 3. Ordem exata dos valores (8 itens no total)
    const valores = [nome, preco, link_download, imagem_url, foto_extra1, foto_extra2, descricao, categoria];

    db.query(sql, valores, (err) => {
        if (err) {
            console.error("❌ Erro no SQL (Insert):", err);
            // Isso aqui vai te dizer no terminal se falta alguma coluna no Banco de Dados
            return res.status(500).json({ sucesso: false, erro: err.message });
        }
        res.json({ sucesso: true });
    });
});

// --- ROTA PARA EXCLUIR (DELETE) ---
app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { email_admin } = req.body;

    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Não autorizado" });
    }

    db.query("DELETE FROM produtos WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ erro: "Erro ao deletar" });
        res.json({ sucesso: true });
    });
});

// --- PAGAMENTO E COMPRAS ---

app.post('/criar-pagamento-pix', async (req, res) => {
    try {
        const { email, total, link } = req.body; // Recebendo o link do checkout

        const body = {
            transaction_amount: Number(parseFloat(total).toFixed(2)),
            description: 'Compra Educa Materiais',
            payment_method_id: 'pix',
            payer: { email: email.trim() },
            metadata: {
                link_entrega: link, // Guardamos o link aqui dentro do Mercado Pago
                email_cliente: email.trim()
            }
        };

        const response = await payment.create({ body });
        const data = response.body || response;

        res.json({
            id: data.id,
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
        });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao criar PIX', detalhes: error.message });
    }
});
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

    if (!produtos || produtos.length === 0) {
        return res.status(400).json({ error: "Carrinho vazio" });
    }

    // 1. Prepara os dados para o Banco de Dados
    const valores = produtos.map(p => [email, p.id, p.preco, new Date()]);
    const sql = "INSERT INTO vendas (usuario_email, produto_id, preco, data_venda) VALUES ?";

    // 2. Salva no Banco de Dados
    db.query(sql, [valores], async (err) => {
        if (err) {
            console.error("❌ Erro ao salvar no banco:", err);
            return res.status(500).json({ error: "Erro ao salvar venda" });
        }

        console.log(`✅ Venda registrada para ${email}. Iniciando disparos de e-mail...`);

        // 3. Loop para enviar um e-mail para cada produto comprado
        // Usamos Promise.all para disparar todos e esperar a conclusão
        try {
            const envios = produtos.map(produto => {
                // Chama a sua função que usa o Resend
                return enviarEmailEntrega(email, produto.link);
            });

            await Promise.all(envios);
            
            res.json({ 
                success: true, 
                message: "Venda registrada e e-mails enviados!" 
            });

        } catch (mailErr) {
            console.error("⚠️ Venda salva, mas houve erro no envio de e-mails:", mailErr);
            // Retornamos sucesso pois o pagamento foi feito e salvo, o e-mail pode ser reenviado manualmente se falhar
            res.json({ success: true, warning: "Erro parcial no envio dos e-mails" });
        }
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

// 1. ROTA PARA LISTAR USUÁRIOS (Faltava essa!)
app.get('/admin/usuarios', (req, res) => {
    const { email_admin } = req.query;

    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Não autorizado" });
    }

    const sql = "SELECT id, nome, email, data_cadastro FROM usuarios ORDER BY id DESC";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erro ao buscar usuários:", err);
            return res.status(500).json({ erro: "Erro no banco" });
        }
        res.json({ total: results.length, lista: results });
    });
});

// 2. ROTA PARA EDITAR NOME DO USUÁRIO (Opcional, mas útil)
app.put('/admin/usuarios/:email', (req, res) => {
    const { email } = req.params;
    const { nome, email_admin } = req.body;

    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Não autorizado" });
    }

    db.query("UPDATE usuarios SET nome = ? WHERE email = ?", [nome, email], (err) => {
        if (err) return res.status(500).json({ erro: "Erro ao atualizar" });
        res.json({ sucesso: true });
    });
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


// ROTA PARA BUSCAR A OFERTA ATIVA
// ROTA PARA BUSCAR A OFERTA ATIVA
app.get('/api/get-oferta-ativa', async (req, res) => {
    try {
        // Importante: Note o uso do .promise() se não mudou o require no topo
        // Se mudou o require para 'mysql2/promise', use apenas db.query
        const [rows] = await db.promise().query("SELECT * FROM produtos WHERE oferta_ativa = 1 LIMIT 1");

        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: "Nenhuma oferta ativa encontrada" });
        }
    } catch (err) {
        console.error("Erro no Banco:", err);
        res.status(500).json({ error: "Erro ao buscar oferta" });
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


//funcionando o pagamento e email