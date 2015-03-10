var api = require('../lib/api');

module.exports = function (app, connectionHandler, socket) {
    var statistics   = new api.statistics(app),
        transactions = new api.transactions(app),
        connection   = new connectionHandler(socket, this),
        interval     = null,
        data         = {};

    this.onInit = function () {
        emitLastBlock();

        if (interval == null) {
            setInterval(emitLastBlock, 10000);
        }
    }

    this.onConnect = function () {
        console.log('Emitting existing data');
        socket.emit('data', data);
    }

    this.onDisconnect = function () {
        clearInterval(interval);
        interval = null;
        data     = {};
    }

    // Private

    var getLastBlock = function (cb) {
        statistics.getLastBlock(
            function (res) { cb('LastBlock') },
            function (res) {
                if (res.success && res.block.numberOfTransactions > 0) {
                    getBlockTransactions(res, cb);
                } else {
                    cb(null, res);
                }
            }
        );
    }

    var getBlockTransactions = function (resBlock, cb) {
        transactions.getTransactionsByBlock(
            resBlock.block.id,
            function (res) { cb('BlockTransactions') },
            function (res) {
                if (res.success) {
                    resBlock.block.transactions = res.transactions;
                } else {
                    resBlock.block.transactions = [];
                }
                cb(null, resBlock);
            }
        );
    }

    var newLastBlock = function (res) {
        return res.success
            && (data.block == null)
            || (res.block.height > data.block.height);
    }

    var emitLastBlock = function () {
        getLastBlock(function (err, res) {
            if (err) {
                console.log('Error in retrieving statistics for: ' + err);
            } else if (newLastBlock(res)) {
                data = res;
                console.log('Emitting new data');
                socket.emit('data', data);
            }
        });
    }
}
