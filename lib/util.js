// util.js
var urllib = require('urllib');

exports.get = function(url) {
    return new Promise(function(resolve, reject) {
        urllib.request(url, {
            dataType: 'json'
        }, function(err, data, res) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

exports.post = function(url, data) {
    return new Promise(function(resolve, reject) {
        urllib.request(url, {
            method: 'POST',
            data: data,
            contentType: 'json',
            dataType: 'json'
        }, function(err, data, res) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};