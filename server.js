require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const cors = require('cors');

const app = express();
const corsOptions = {
    origin: ['https://educamateriais.shop', 'http://educamateriais.shop'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Importante para o login do professor
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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
    // 1. Adicionamos a 'categoria' na desestruturação do corpo da requisição
    const { email_admin, nome, preco, link_download, imagem_url, categoria } = req.body;

    // 2. Verificação de segurança (mantida)
    if (email_admin !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ erro: "Acesso negado" });
    }

    // 3. SQL atualizado para incluir a coluna 'categoria' e o 5º ponto de interrogação
    const sql = "INSERT INTO produtos (nome, preco, link_download, imagem_url, categoria) VALUES (?, ?, ?, ?, ?)";
    
    // 4. Passamos os 5 valores na ordem correta
    db.query(sql, [nome, preco, link_download, imagem_url, categoria], (err) => {
        if (err) {
            console.error("Erro ao inserir produto:", err);
            return res.status(500).json({ sucesso: false, erro: "Erro no banco de dados" });
        }
        res.json({ sucesso: true });
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

app.post('/criar-pagamento-pix', async (req, res) => {
    try {
        const { email, total } = req.body;
        if (!email || !total) return res.status(400).json({ erro: "E-mail ou total não informados" });

        const body = {
            transaction_amount: Number(parseFloat(total).toFixed(2)),
            description: 'Compra Educa Materiais',
            payment_method_id: 'pix',
            payer: { email: email.trim() }
        };

        const response = await payment.create({ body });
        const data = response.body || response;

        res.json({
            id: data.id,
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
        });
    } catch (error) {
        res.status(500).json({ erro: 'Erro interno no servidor', detalhes: error.message });
    }
});

// Rota que estava faltando para o checkout funcionar
app.get('/verificar-pagamento/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Consulta o Mercado Pago para saber se foi pago mesmo
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        const data = await response.json();

        // 2. Se o status for aprovado, devolvemos para o site
        if (data.status === 'approved') {
            // Aqui você também pode chamar a sua função de registrar-venda automaticamente
            return res.json({ status: 'approved' });
        } 

        res.json({ status: data.status || 'pending' });

    } catch (error) {
        console.error("Erro ao verificar no MP:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

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

// --- INICIALIZAÇÃO ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    // O log agora reflete a URL final que o público acessa
    console.log(`🚀 Servidor backend rodando internamente na porta ${PORT}`);
    console.log(`🌍 Acesse publicamente em: https://educamateriais.shop`);
});