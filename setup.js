const mysql = require('mysql2');

// Use as mesmas credenciais do seu server.js
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root', 
  password: 'Emilly00@jade',
  database: 'educamarket'
});
const mysql = require('mysql2');

const sql = `
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    imagem_url VARCHAR(255),
    categoria VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(sql, (err) => {
    if (err) {
        console.error('❌ Erro:', err.message);
    } else {
        console.log('✅ Tabela produtos criada com sucesso!');
    }
    process.exit();
});