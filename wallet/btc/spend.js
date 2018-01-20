const bitcore = require('bitcore-lib')
const request = require('request')


module.exports = {
    createTransaction: async (privateKeyWIF, transactionNumber, key, timeLock) => {
        // convert wif to a private key
        const privateKey = bitcore.PrivateKey.fromWIF(privateKeyWIF)

        // get public key
        var myPublicKey = new bitcore.PublicKey(privateKey)

        // convert priv key to address
        const fromAddress = privateKey.toAddress().toString()

        // get utxo data to add to new transaction
        const utxoData = await getUtxoData(transactionNumber)
        //console.log('\n\nutxoData =', utxoData)

        // get value 1921977
        const inputAmount = utxoData.value_int

        const scriptPubKey = utxoData.script_pub_key

        const sequenceNumber = utxoData.sequence

        // 1
        const vout = utxoData.vout


        const hashKey = bitcore.crypto.Hash.sha256(new Buffer(key)).toString('hex')

        // https://bitcore.io/api/lib/unspent-output
        const refundTransaction = new bitcore.Transaction().from({
            txid: transactionNumber,
            vout: vout,
            scriptPubKey: new bitcore.Script(scriptPubKey).toHex(), //  https://github.com/bitpay/bitcore-lib/blob/master/docs/examples.md
            satoshis: inputAmount,
        })
            .to(fromAddress, inputAmount - 1000) // or Copay: mqsscUaTAy3pjwgg7LVnQWr2dFCKphctM2
            .lockUntilDate(1513412288); // CLTV requires the transaction nLockTime to be >= the stack argument in the redeem script


        refundTransaction.inputs[0].sequenceNumber = 0; // the CLTV opcode requires that the input's sequence number not be finalized

        const signature = bitcore.Transaction.sighash.sign(refundTransaction, privateKey, bitcore.crypto.Signature.SIGHASH_ALL, 0, scriptPubKey);

        // setup the scriptSig of the spending transaction to spend the p2sh-cltv-p2pkh redeem script
        refundTransaction.inputs[0].setScript(
            bitcore.Script.empty()
                .add(signature.toTxFormat())
                .add(new Buffer(myPublicKey.toString(), 'hex'))
                .add(new Buffer(toHex(key).toString(), 'hex'))
                .add('OP_TRUE') // choose the time-delayed refund code path
        )

        return refundTransaction.toString()
    }
}



//  https://testnet-api.smartbit.com.au/v1/blockchain/address/mpfNnLq357BjK5btmefSGT38PsQQgMkZXB
function getUtxoData (_transactionId) {
    return new Promise(resolve => {
        request(`https://testnet-api.smartbit.com.au/v1/blockchain/tx/${_transactionId}`, (err, res, body) => {
        const data = JSON.parse(body)
        return resolve({
            value_int: data.transaction.outputs[0].value_int,
            txid: _transactionId,
            script_pub_key: data.transaction.outputs[0].script_pub_key.hex,
            vout: data.transaction.outputs[0].n,
            sequence: data.transaction.inputs[0].sequence
        })
    })
})
}


function toHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
}