'use strict';

// Initialize a non-mutable database and declare db
const Database = require('sqlite-async');
let db;

exports.initialize = () => Database.open(':memory:')
  .then(function saveConnection(connection) {
    db = connection;
    return db;
  });

exports.close = () => db.close();

exports.beginTransaction = () => db.run('BEGIN TRANSACTION');

exports.commit = () => db.run('COMMIT');

exports.rollback = () => db.run('ROLLBACK');

/**
 * Creates the database tables
 * Accounts have 0 or more positions and represent a bank account.
 * Positions can be mapped to 0 or 1 Securities and represent the amount of shares of a stock held by the account.
 * A security is a stock for example, it's the reference data and doesn't belong to any single account.
 */
exports.setupDatabase = function setupDatabaseStructure() {
  return db.run(
    'CREATE TABLE accounts (id INTEGER PRIMARY KEY, name VARCHAR(20) NOT NULL, number INTEGER UNIQUE, balance NUMERIC NOT NULL)'
  )
    .then(db.run(
      'CREATE TABLE positions (id INTEGER PRIMARY KEY, accountID INTEGER NOT NULL, securityID INTEGER, name VARCHAR(20) NOT NULL, ticker VARCHAR(3), price NUMERIC,quantity NUMERIC,value NUMERIC)'
    ))
    .then(db.run(
      'CREATE TABLE securities (id INTEGER PRIMARY KEY, name VARCHAR(20) NOT NULL, ticker VARCHAR(3), type VARCHAR(10) NOT NULL)'
    ))
    .catch(function testError(err) {
      console.log('failed', err);
      throw err;
    });
};

/**
 * Creates a security populating the database table
 * @param {Object} security
 * @param {String} security.name Name of the Security
 * @param {String} [security.ticker] Ticker Symbol for the Security
 * @param {String} security.type Type of the Security
 * @return {Promise<Number>} The newly created security id
 */
exports.createSecurity = function createSecurity(security) {
  return db.run('INSERT INTO securities(name, ticker, type) VALUES (?, ?, ?)', [security.name, security.ticker, security.type])
    .then(res => res.lastID);
};

/**
 * Creates a position populating the database table.
 * @param {Object} position
 * @param {String} position.accountID The id of the Account the Position belongs to
 * @param {String} [position.securityID] The id of the security the position is mapped to, if it is mapped to a security
 * @param {String} position.name The name of the position
 * @param {String} [position.ticker] The Ticker Symbol of the position
 * @param {String} [position.price] The price  of the position
 * @param {String} [position.quantity] The quantity/number of shares the position is
 * @param {String} [position.value] The value of the position, if 0 or not passed this function calculates it by multiplying price
 *   by quantity
 * @return {Promise<Number>} The newly created position id
 */
exports.createPosition = function createPosition(position) {
  return db.run('INSERT INTO positions(accountID, securityID, name, ticker, price,quantity) VALUES (?, ?, ?, ?, ?, ?)',
    [position.accountID, position.securityID, position.name, position.ticker, position.price, position.quantity])
    .then(res => res.lastID);
};

/**
 * Creates a account populating the database table
 * @param {Object} account
 * @param {String} account.name Name of the Account
 * @param {String} [account.number] Unique number of the Account
 * @param {String} account.balance The balance/total value of the Account
 * @return {Promise<Number>} The newly created Account id
 */
exports.createAccount = function createAccount(account) {
  return db.run('INSERT INTO accounts(name, number, balance) VALUES (?, ?, ?)', [account.name, account.number, account.balance])
    .then(res => res.lastID);
};

/**
 * Gathers the first account with a name containing the accountName string passed in
 * @param {String} accountName The name to search for
 * @return {Promise<{id,name,number,balance}>} The Account if one is found
 */
exports.findAccount = function findAccount(accountName) {
  return db.get('SELECT id, name, number, balance FROM accounts WHERE name LIKE ?', `%${accountName}%`);
};

/**
 * Updates an account record in the database
 * @param {Object} account
 * @param {Number} account.id The id of the Account to  update
 * @param {String} account.name The new name of the Account
 * @param {String} [account.number] The new number of the Account
 * @param {Number} account.balance The new balance of the Account
 * @return {Promise<Number>} The updated Account id
 */
exports.updateAccount = function updateAccount(account) {
  return db.get('UPDATE accounts SET name = ?, number = ?, balance = ? WHERE id = ?',
    [account.name, account.number, account.balance, account.id]);
};

/**
 * Gathers all of the positions of an account
 * @param {Object} account
 * @param {Number} account.id The id of the Account to gather positions for
 * @return {Promise<Array{id,name,ticker,price,quantity,value}>} An array of the positions
 */
exports.getPositions = function getPositions(account) {
  return db.all('SELECT id, name, ticker, price, quantity, value FROM positions WHERE accountID = ?', account.id);
};

/**
 * Given an Account, finds the ticker of the positions in the account mapped to securities.
 * If 2 or more positions are mapped to the same security it should only gather the position ticker for the position most recently
 * created.
 * @param {Object} account
 * @param {Number} account.id The id of the Account to gather tickers for
 * @return {Promise<String[]>} Array of position tickers
 */
exports.getLatestTickers = function getLatestTickers(account) {
  return db.all('SELECT ticker FROM positions WHERE accountID = ? GROUP BY securityID HAVING MAX(id)', account.id)
    .then(rows => rows.map(row => row.ticker));
};

/**
 * Gathers a list of all accounts where the sum of the value of the positions in the account is not equal to the account's balance
 * @return {Promise<Array{id,balance,positionSum}>} Array of accounts
 */
exports.getAccountPositionMismatches = function getAccountPositionMismatches() {
  const query = `
      SELECT a.id, a.balance, sum(p.price * p.quantity) AS positionSum
      FROM accounts a
      LEFT JOIN positions p ON p.accountID = a.id
      GROUP BY a.id
      HAVING a.balance != positionSum OR positionSum IS NULL
  `;

  return db.all(query);
};
