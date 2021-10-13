/* eslint-disable no-unused-expressions */

// There are TODO statements in the 3 js files to follow. I wrote code and tests, and then deleted sections of each replacing them with TODOs to be filled out.
// Do not modify anything that doesn't have a TODO.
// There is also a .eslintrc file attached. I will check for errors on the code sent back to me.
// Please zip, the updated code & tests back when completed, do not include node_modules in the zip.
// Feel free to reach out with any questions by emailing tgoldman@circleblack.com

'use strict';

const chai = require('chai');
const expect = chai.expect;
const db = require('./db');
const utils = require('./utils');

describe('SQL Database', () => {
  before(() => db.initialize());

  describe('Database', () => {
    const securities = {
      cash: {name: 'Cash USD', ticker: 'USD', type: 'Cash'},
      google: {name: 'Google', ticker: 'GOOG', type: 'Stock'},
    };

    it('#setupDatabases() did not fail', () => db.setupDatabase());

    it('#createSecurity() created a security for cash', () => db.createSecurity(securities.cash)
      .then(securityID => {securities.cash.id = securityID;}));

    it('#createSecurity() created a security for Google', () => db.createSecurity({name: 'Google', ticker: 'GOOG', type: 'Stock'})
      .then(securityID => {securities.google.id = securityID;}));

    it(
      '#createAccount() created an account with no positions',
      () => db.createAccount({name: 'No Positions', number: '1234', balance: 5000})
    );
    it(
      '#createPosition() created positions for a new account',
      () => db.createAccount({name: 'Investment Account', number: 4321, balance: 4000})
        .then(accountID => db.createPosition({
          accountID: accountID,
          securityID: securities.cash.id,
          name: 'Cash',
          ticker: 'USD',
          price: 1,
          quantity: 4000,
        }))
    );
    it(
      '#findAccount() gathers the correct Investment Account',
      () => db.findAccount('vestment').then(account => {
        expect(account).to.have.property('name').that.equals('Investment Account');
        expect(account).to.have.property('number').that.equals(4321);
        expect(account).to.have.property('balance').that.equals(4000);
      })
    );
    it(
      '#createPosition() created a second position for the Investment Account',
      () => db.findAccount('vestment')
        .then(account => db.createPosition({
          accountID: account.id,
          securityID: securities.google.id,
          name: 'Google',
          ticker: 'GOOG',
          price: 1000,
          quantity: 3,
        }))
    );
    it(
      '#getPositions() gathers all positions of the Investment Account',
      () => db.findAccount('vestment').then(db.getPositions).then(positions => {
        expect(positions).to.be.an('array').that.has.length(2);
        for (let position of positions) {
          switch (position.ticker) {
            case 'USD':
              expect(position).to.have.property('name').that.equals('Cash');
              expect(position).to.have.property('price').that.equals(1);
              expect(position).to.have.property('quantity').that.equals(4000);
              break;
            case 'GOOG':
              expect(position).to.have.property('name').that.equals('Google');
              expect(position).to.have.property('price').that.equals(1000);
              expect(position).to.have.property('quantity').that.equals(3);
              break;
            default:
              expect(position).to.not.exist;
          }
        }
      })
    );
    it(
      '#createPosition() created positions for another new account',
      () => db.createAccount({name: 'Four Position Account', number: 4329, balance: 10000})
        .then(accountID => db.createPosition({
          accountID: accountID,
          securityID: securities.cash.id,
          name: 'Cash 1',
          ticker: 'USD1',
          price: 1,
          quantity: 1000,
        })
          .then(() => db.createPosition({
            accountID: accountID,
            securityID: securities.cash.id,
            name: 'Cash 2',
            ticker: 'USD2',
            price: 1,
            quantity: 2000,
          }))
          .then(() => db.createPosition({
            accountID: accountID,
            securityID: securities.google.id,
            name: 'Google 1',
            ticker: 'GOOG1',
            price: 1000,
            quantity: 3,
          }))
          .then(() => db.createPosition({
            accountID: accountID,
            securityID: securities.google.id,
            name: 'Google 2',
            ticker: 'GOOG2',
            price: 1000,
            quantity: 4,
          })))
    );
    it(
      '#getLatestTickers() gathers the latest position ticker for each security held in the new account',
      () => db.findAccount('Four')
        .then(account => db.getLatestTickers(account).then(tickers => {
          expect(tickers).to.be.an('array').that.has.members(['USD2', 'GOOG2']);
        }))
    );
    it(
      '#getAccountPositionMismatches() gathers accounts with balances that do not match the sum of the values of account\'s positions',
      () => db.getAccountPositionMismatches().then(mismatches => {
        expect(mismatches).to.be.an('array').that.has.length(2);
      })
    );
    it(
      'Started a transaction to create an account, but got an error and rolled back',
      () => db.beginTransaction()
        .then(() => db.createAccount({name: 'Rollback Account', number: 4500, balance: 5000}))
        .then((accountID) => db.updateAccount({id: accountID, name: 'Rollback Account', number: 4321, balance: 5000}))
        // According to CREATE TABLE statement for `accounts` table, the `number` column is meant to have unique value.
        // Here we're trying to update account's number to the value, that already exists in table, which is causing an exception.
        .catch((err) => {
          db.rollback();
          throw err;
        })
        .catch((err) => {
          expect(err).to.have.property('errno').that.equals(19);
          expect(err).to.have.property('code').that.equals('SQLITE_CONSTRAINT');
          db.rollback();
        })
        .then(() => db.findAccount('Rollback'))
        .then(account => {expect(account).to.not.exist;})
    );
  });

  describe('Regex', () => {
    it(
      '#formatXml() alters the xml/html to be attribute instead of child based',
      () => {
        expect(utils.formatXml(
          '<box>\n<title>Foo</title>\n<id>the-foo</id>\n<link><![CDATA[<%= "circleblack://box-link-record-#{awesome + code}/" %>]]></link>\n<records>\n  <record>bar</record>\n  <record>baz</record>\n</records>\n</box>'
        ))
          .to
          .equal(
            '<box id="the-foo" items="bar,baz">\n<title>Foo</title>\n<link><![CDATA[<%= "circleblack://box-link-record-#{awesome + code}/" %>]]></link>\n</box>'
          );
      }
    );
    it(
      '#formatPhones() handles a variety of input formats and always outputs (###) ###-####',
      () => {
        expect(utils.formatPhone('(123)555-6543')).to.equal('(123) 555-6543');
        expect(utils.formatPhone('((((123-555-6543')).to.equal('(123) 555-6543');
        expect(utils.formatPhone('123 555 6543')).to.equal('(123) 555-6543');
        expect(utils.formatPhone('1123 555 6543')).to.equal('(112) 355-5654');
        expect(utils.formatPhone('123-1555-6543')).to.equal('(123) 155-5654');
        expect(utils.formatPhone('1235556543')).to.equal('(123) 555-6543');
        expect(utils.formatPhone(1235556543)).to.equal('(123) 555-6543');
        expect(utils.formatPhone(12355565433)).to.equal('(235) 556-5433'); // Looks like, in this case, the expectation of the test case is not correct, probably it should be: (123) 555-6543
        expect(utils.formatPhone('(123) 555-6543')).to.equal('(123) 555-6543');
      }
    );
  });
  after(() => db.close());
});
