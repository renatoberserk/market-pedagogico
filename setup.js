// const mysql = require('mysql2');

// // Use as mesmas credenciais do seu server.js
// const connection = mysql.createConnection({
//   host: '127.0.0.1',
//   user: 'root', 
//   password: 'Emilly00@jade',
//   database: 'educamarket'
// });

const mysql = require('mysql2');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Emilly00@jade', 
    database: 'educamarket',
    multipleStatements: true // Permite executar vários comandos de uma vez
});

// Comandos SQL limpos e sem comentários internos
const sql = `
    SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS produtos;
    CREATE TABLE produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco DECIMAL(10,2) NOT NULL,
        link_download VARCHAR(255),
        imagem_url VARCHAR(255),
        categoria VARCHAR(100),
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    SET FOREIGN_KEY_CHECKS = 1;
`;

db.query(sql, (err) => {
    if (err) {
        console.error("❌ Erro ao atualizar:", err.message);
    } else {
        console.log("✅ TABELA ATUALIZADA COM SUCESSO!");
        console.log("Estrutura: id, nome, preco, link_download, imagem_url, categoria");
    }
    db.end();
    process.exit();
});