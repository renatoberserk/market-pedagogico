// const mysql = require('mysql2');

// // Use as mesmas credenciais do seu server.js
// const connection = mysql.createConnection({
//   host: '127.0.0.1',
//   user: 'root', 
//   password: 'Emilly00@jade',
//   database: 'educamarket'
// });







const mysql = require('mysql2');

// Ajuste suas credenciais
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Emilly00@jade', 
    database: 'educamarket'
});

const sql = `
DROP TABLE IF EXISTS produtos;
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    imagem_url VARCHAR(255),
    categoria VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

console.log("Limpando e recriando a tabela produtos...");

// O mysql2 permite múltiplas queries se configurado, mas aqui faremos uma por uma por segurança
db.query("DROP TABLE IF EXISTS produtos", (err) => {
    if (err) return console.error("Erro ao dropar tabela:", err.message);
    
    db.query(sql.split(';')[1], (err) => {
        if (err) {
            console.error("❌ Erro ao criar a nova estrutura:", err.message);
        } else {
            console.log("✅ Tabela produtos atualizada com sucesso!");
            console.log("Estrutura atual: id, nome, preco, imagem_url, categoria, data_cadastro.");
        }
        db.end();
        process.exit();
    });
});