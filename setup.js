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
// Criando a tabela para bater IGUAL ao seu código JS
const sql = `
DROP TABLE IF EXISTS produtos;
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    link_download VARCHAR(255), -- Nome exato que está no seu JS
    imagem_url VARCHAR(255),    -- Nome exato que está no seu JS
    categoria VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(sql, (err) => {
    if (err) console.log(err);
    else console.log("✅ Tabela sincronizada com o seu código!");
    process.exit();
});