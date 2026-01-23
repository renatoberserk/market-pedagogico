require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- CONFIGURAÇÃO MERCADO PAGO ---
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});
const payment = new Payment(client);

// --- CONEXÃO BANCO DE DADOS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("Erro ao conectar no MySQL:", err);
    } else {
        console.log("✅ Conectado ao MySQL com sucesso!");
        // Garante que a tabela de vendas existe
        db.query(`
            CREATE TABLE IF NOT EXISTS vendas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_email VARCHAR(255) NOT NULL,
                produto_id INT NOT NULL,
                data_venda DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

// --- ROTAS DE USUÁRIO E ADMIN ---

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
    const { email_admin, nome, preco, link_download, imagem_url } = req.body;
    if (email_admin !== process.env.ADMIN_EMAIL) return res.status(403).json({ erro: "Acesso negado" });

    const sql = "INSERT INTO produtos (nome, preco, link_download, imagem_url) VALUES (?, ?, ?, ?)";
    db.query(sql, [nome, preco, link_download, imagem_url], (err) => {
        if (err) return res.status(500).json({ sucesso: false });
        res.json({ sucesso: true });
    });
});

app.put('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { email_admin, nome, preco, link_download, imagem_url } = req.body;
    if (email_admin !== process.env.ADMIN_EMAIL) return res.status(403).json({ erro: "Não autorizado" });

    const sql = "UPDATE produtos SET nome=?, preco=?, link_download=?, imagem_url=? WHERE id=?";
    db.query(sql, [nome, preco, link_download, imagem_url, id], (err) => {
        if (err) return res.status(500).json({ sucesso: false });
        res.json({ sucesso: true });
    });
});

app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { email_admin } = req.body;
    if (email_admin !== process.env.ADMIN_EMAIL) return res.status(403).json({ erro: "Não autorizado" });

    db.query("DELETE FROM produtos WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ sucesso: false });
        res.json({ sucesso: true });
    });
});

// --- PAGAMENTO MERCADO PAGO ---
app.post('/criar-pagamento-pix', async (req, res) => {
    try {
        const { email, total } = req.body;

        // Verificação de segurança: se o e-mail ou total sumirem, o MP dá erro 400/500
        if (!email || !total) {
            return res.status(400).json({ erro: "E-mail ou total não informados" });
        }

        const body = {
            transaction_amount: Number(parseFloat(total).toFixed(2)), // Garante número com 2 casas decimais
            description: 'Compra Educa Materiais',
            payment_method_id: 'pix',
            payer: {
                email: email.trim() // Remove espaços acidentais
            }
        };

        const response = await payment.create({ body });
        
        // A resposta do SDK v2 pode vir dentro de 'body' ou direto no objeto
        const data = response.body || response;

        res.json({
            id: data.id,
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
        });

    } catch (error) {
        console.error("ERRO DETALHADO NO SERVIDOR:", error);
        // Retorna o erro real para o seu checkout.js conseguir ler no console
        res.status(500).json({ 
            erro: 'Erro interno no servidor', 
            detalhes: error.message 
        });
    }
});

app.get('/verificar-pagamento/:id', async (req, res) => {
    try {
        const response = await payment.get({ id: req.params.id });
        res.json({ status: response.status });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao consultar status' });
    }
});

// --- REGISTRO DE VENDAS E DOWNLOADS ---

app.post('/registrar-venda', (req, res) => {
    const { email, produtos } = req.body;
    if (!produtos || produtos.length === 0) return res.status(400).json({ error: "Carrinho vazio" });

    const valores = produtos.map(p => [email, p.id, new Date()]);
    const sql = "INSERT INTO vendas (usuario_email, produto_id, data_venda) VALUES ?";
    
    db.query(sql, [valores], (err) => {
        if (err) {
            console.error("Erro ao registrar venda:", err);
            return res.status(500).json({ error: "Erro ao salvar" });
        }
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

// Rota para Cadastrar Novo Usuário
app.post('/cadastro', (req, res) => {
    const { nome, email, senha } = req.body;

    // 1. Verifica se o usuário já existe
    db.query("SELECT email FROM usuarios WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ sucesso: false, erro: "Erro no banco" });
        
        if (results.length > 0) {
            return res.status(400).json({ sucesso: false, erro: "Este e-mail já está cadastrado!" });
        }

        // 2. Insere o novo usuário
        const sql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
        db.query(sql, [nome, email, senha], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ sucesso: false, erro: "Erro ao salvar usuário" });
            }
            res.json({ sucesso: true, mensagem: "Cadastro realizado com sucesso!" });
        });
    });
});

// Rota para estatísticas do Admin
app.get('/admin/stats', async (req, res) => {
    try {
        // Receita de Hoje
        const hoje = await db.query(`
            SELECT SUM(preco) as total FROM vendas 
            WHERE DATE(data_venda) = CURDATE()`);

        // Receita de Ontem
        const ontem = await db.query(`
            SELECT SUM(preco) as total FROM vendas 
            WHERE DATE(data_venda) = SUBDATE(CURDATE(), 1)`);

        // Receita do Mês Atual
        const mesAtual = await db.query(`
            SELECT SUM(preco) as total FROM vendas 
            WHERE MONTH(data_venda) = MONTH(CURDATE()) AND YEAR(data_venda) = YEAR(CURDATE())`);

        // Receita do Mês Anterior
        const mesAnterior = await db.query(`
            SELECT SUM(preco) as total FROM vendas 
            WHERE MONTH(data_venda) = MONTH(SUBDATE(CURDATE(), INTERVAL 1 MONTH))`);

        // Total de Vendas (Quantidade total de linhas na tabela)
        const totalVendas = await db.query(`SELECT COUNT(*) as qtd FROM vendas`);

        res.json({
            hoje: hoje[0].total || 0,
            ontem: ontem[0].total || 0,
            mes_atual: mesAtual[0].total || 0,
            mes_anterior: mesAnterior[0].total || 0,
            total_vendas: totalVendas[0].qtd || 0
        });
    } catch (error) {
        console.error("Erro SQL:", error);
        res.status(500).json({ error: "Erro ao buscar dados no banco" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ON em http://0.0.0.0:${PORT}`);
});
