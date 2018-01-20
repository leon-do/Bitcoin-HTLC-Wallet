const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser')
const create = require('./wallet/btc/pay.js')
const redeem = require('./wallet/btc/redeem.js')
const spend  = require('./wallet/btc/spend.js')
app.use(bodyParser.urlencoded({ extended: false }))

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.post('/createTransaction', async (req, res) => {
    const data = req.body
    const metadata = data.metadata.join('_') // ETH_0xc70103eddcA6cDf02952365bFbcf9A4A76Cd2066_0.5
    const transaction = await create.createTransaction(data.privateKeyWIF, Number(data.outputAmount), data.key, data.toAddress,Number(data.timeLock), metadata)
    res.send(transaction)
})

app.post('/redeem', async (req, res) => {
    const data = req.body
    const transaction = await redeem.createTransaction(data.privateKeyWIF, data.transactionNumber)
    res.send(transaction)
})

app.post('/spend', async (req, res) => {
    const data = req.body
    const transaction = await spend.createTransaction(data.privateKeyWIF, data.transactionNumber, data.key)
    res.send(transaction)
})

app.listen(8080);