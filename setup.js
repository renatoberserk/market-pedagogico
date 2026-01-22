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
// Desativa verificação de chaves estrangeiras, limpa e recria
const sql = `
    SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS produtos;
    CREATE TABLE produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco DECIMAL(10,2) NOT NULL,
        imagem_url VARCHAR(255),
        categoria VARCHAR(100),
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    SET FOREIGN_KEY_CHECKS = 1;
`;

console.log("Recriando tabela produtos com força total...");

// Executando como uma string única (requer multipleStatements: true ou comandos separados)
db.query("SET FOREIGN_KEY_CHECKS = 0", () => {
    db.query("DROP TABLE IF EXISTS produtos", () => {
        const createTable = `
            CREATE TABLE produtos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                preco DECIMAL(10,2) NOT NULL,
                imagem_url VARCHAR(255),
                categoria VARCHAR(100),
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
        db.query(createTable, (err) => {
            if (err) console.error("Erro:", err.message);
            else console.log("✅ Sucesso! Tabela produtos atualizada com todas as colunas.");
            db.query("SET FOREIGN_KEY_CHECKS = 1", () => {
                db.end();
                process.exit();
            });
        });
    });
});