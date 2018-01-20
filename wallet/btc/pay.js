const bitcore = require('bitcore-lib')
const request = require('request')



module.exports ={
    createTransaction: async (privateKeyWIF, outputAmount, key, toAddress, timeLock, metadata) => {
        // convert wif to a private key
        const privateKey = bitcore.PrivateKey.fromWIF(privateKeyWIF)

        // get public key
        var myPublicKey = new bitcore.PublicKey(privateKey)

        // convert priv key to address
        const fromAddress = privateKey.toAddress().toString()

        // get utxo data to add to new transaction
        const utxoData = await getUtxoData(fromAddress)
        //console.log('\n\noutput =', output)

        // get transaction id 9ce9ceb57475b631a64e162b539a915122bda10510315ec6189316d502424fa8
        const oldTransaction = utxoData.txid

        // get value 1921977
        const inputAmount = utxoData.value_int

        // https://chainquery.com/bitcoin-api/decodescript
        const scriptPubKey = utxoData.script_pubkey

        // 1
        const vout = utxoData.vout


        // create unsigned transaction out
        const utxo = new bitcore.Transaction.UnspentOutput({
            "txid" : oldTransaction,
            "vout" : vout,
            "address" : fromAddress,
            "scriptPubKey" : scriptPubKey,
            "satoshis" : inputAmount
        });


        // ♫♪.ılılıll|̲̅̅●̲̅̅|̲̅̅=̲̅̅|̲̅̅●̲̅̅|llılılı.♫♪.♫♪.ılılıll|̲̅̅●̲̅̅|̲̅̅=̲̅̅|̲̅̅●̲̅̅|llılılı.♫♪.  ♫♪.ılılıll|̲̅̅●̲̅̅|̲̅̅=̲̅̅|̲̅̅●̲̅̅|llılılı.♫♪.

        const hashKey = bitcore.crypto.Hash.sha256(new Buffer(key)).toString('hex')

        // build the script
        var script = bitcore
            .Script()
            .add('OP_IF')
            .add('OP_SHA256')
            .add(new Buffer(hashKey.toString(), 'hex'))
            .add('OP_EQUALVERIFY')
            .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(toAddress)))
            .add('OP_ELSE')
            .add(bitcore.crypto.BN.fromNumber(timeLock).toScriptNumBuffer())
            .add('OP_CHECKLOCKTIMEVERIFY')
            .add('OP_DROP')
            .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(fromAddress)))
            .add('OP_ENDIF')

        const scriptAddress = bitcore.Address.payingTo(script)

        const newTransaction = bitcore
            .Transaction() // create new tx
            .from(utxo) // from oldTransaction
            .addOutput(
                new bitcore.Transaction.Output({
                    script: script,
                    satoshis: outputAmount - 9999,
                })
            )
            // .to(scriptAddress, outputAmount - 1000)
            .change(fromAddress)
            .addData(metadata) // ETH_0x1234_0.5
            .sign(privateKey)

        console.log('\n\n raw transaction', newTransaction.serialize())

        // https://live.blockcypher.com/btc-testnet/decodetx/
        return newTransaction.serialize()

    }
} 






//  https://testnet-api.smartbit.com.au/v1/blockchain/address/mpfNnLq357BjK5btmefSGT38PsQQgMkZXB
function getUtxoData (_address) {
    return new Promise(resolve => {
        request(`https://testnet-api.smartbit.com.au/v1/blockchain/address/${_address}`, (err, res, body) => {
        const data = JSON.parse(body)
        const transactions = data.address.transactions
        // loop through transactions
        for (let i in transactions){
            // loop through the output of each transaction
            for (let j in transactions[i].outputs){
                // if output has BTC and it belongs to me
                if (transactions[i].outputs[j].spend_txid !== 'null' && transactions[i].outputs[j].value_int > 0 && transactions[i].outputs[j].addresses[0] === _address) {
                    return resolve({
                        value_int: transactions[i].outputs[j].value_int,
                        txid: transactions[i].txid,
                        script_pubkey: transactions[i].outputs[j].script_pubkey.hex,
                        vout: transactions[i].outputs[j].n
                    })
                }
            }
        }
    })
})
}