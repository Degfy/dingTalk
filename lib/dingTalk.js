// dingding.js

'use strict';
const util = require('./util.js');
const url = require('url');
const crypto = require('crypto'),
  algorithm = 'aes-256-cbc', //加密算法：aes 256位cbc模式
  // pre-define the padding values
  PADDING = [
    [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
    [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
    [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
    [13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13],
    [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
    [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    [9, 9, 9, 9, 9, 9, 9, 9, 9],
    [8, 8, 8, 8, 8, 8, 8, 8],
    [7, 7, 7, 7, 7, 7, 7],
    [6, 6, 6, 6, 6, 6],
    [5, 5, 5, 5, 5],
    [4, 4, 4, 4],
    [3, 3, 3],
    [2, 2],
    [1],
  ],
  //随机字符串种子
  RANDCHARS = 'abcdefghigjklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
  //pkcs7填充
  pkcs7 = {
    pad: function(plaintext) {
      var padding = PADDING[(plaintext.byteLength % 16) || 0],
        result = new Uint8Array(plaintext.byteLength + padding.length);
      result.set(plaintext);
      result.set(padding, plaintext.byteLength);
      return new Buffer(result);
    },
    unpad: function unpad(padded) {
      return padded.subarray(0, padded.byteLength - padded[padded.byteLength - 1]);
    },
  };

/**
 * 生成随机字符串
 * @param  {[type]} length [description]
 * @return {[type]}        [description]
 */
function _randomStr(length) {
  var rst = '';
  while (length--) {
    rst += RANDCHARS.charAt(Math.floor(Math.random() * RANDCHARS.length));
  }
  return rst;
};


/**
 * 加密方法
 * @param key 加密key
 * @param iv       向量
 * @param data     需要加密的数据
 * @returns string
 */
function _encrypt(key, iv, data, suitekey) {
  if (!data) return '';
  suitekey = suitekey || createSuiteKey;
  var cipher = crypto.createCipheriv(algorithm, key, iv),
    random = _randomStr(16),
    buf1 = new Buffer(20),
    buf2 = new Buffer(data),
    buf3 = new Buffer(suitekey),
    buf;

  buf1.write(random, 0);
  buf1.writeInt32BE(buf2.byteLength, 16);

  cipher.setAutoPadding(false);
  buf = pkcs7.pad(Buffer.concat([buf1, buf2, buf3]));

  var bufencode = buf.toString('utf8'),
    crypted = cipher.update(bufencode, 'utf8', 'binary');
  crypted += cipher.final('binary');
  crypted = new Buffer(crypted, 'binary').toString('base64');
  return crypted;
};

/**
 * 解密方法
 * @param key      解密的key
 * @param iv       向量
 * @param crypted  密文
 * @returns string
 */
function _decrypt(key, iv, crypted) {
  crypted = new Buffer(crypted, 'base64').toString('binary');
  var decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAutoPadding(false);

  var buf1 = decipher.update(crypted, 'binary'),
    buf2 = decipher.final(),
    decoded = Buffer.concat([buf1, buf2]);
  return new Buffer(pkcs7.unpad(decoded));
};

var DingTalk = function(token, encode_aes_key, suitekey, suitesecret) {
  this.token = token;
  this.key = new Buffer(encode_aes_key + '=', 'base64');
  this.iv = this.key.slice(0, 16);
  this.suitekey = suitekey;
  this.suitesecret = suitesecret;
};

DingTalk.prototype = {
  /**
   * 加密
   * @return {[type]} [description]
   */
  encrypt: function(plain) {
    return _encrypt(this.key, this.iv, plain, this.suitekey);
  },
  /**
   * 解密
   * @return {[type]} [description]
   */
  decrypt: function(encrypted) {
    var out = _decrypt(this.key, this.iv, encrypted),
      before = out.slice(0, 16),
      len = out.readInt32BE(16),
      msg = out.slice(20, 20 + len).toString('utf8'),
      after = out.slice(20 + len);
    try {
      var info = JSON.parse(msg);
    } catch (e) {
      var info = msg;
    }
    return {
      before: before.toString('utf8'),
      msg: info,
      after: after.toString('utf8'),
    };
  },

  /**
   * 生成签名
   * @return {[type]} [description]
   */
  signature: function(encrypt, nonce, timestamp) {
    var arr = [],
      sha1 = crypto.createHash('sha1');
    arr.push(this.token, encrypt, nonce, timestamp);
    arr.sort();
    sha1.update(arr.join(''));
    return sha1.digest('hex');
  },

  /**
   * 获取suite_access_token
   * @param  {[type]} ticket [description]
   * @return {[type]}        [description]
   */
  suite_access_token: function(ticket) {
    var url = 'https://oapi.dingtalk.com/service/get_suite_token';
    return util.post(url, {
      "suite_key": this.suitekey,
      "suite_secret": this.suitesecret,
      "suite_ticket": ticket,
    });
  },

  /**
   * 使用suit_access_token tmp_auth_code 换取企业永久授权码
   * @param  {[type]} suite_access_token [description]
   * @param  {[type]} tmp_auth_code      [description]
   * @return {[type]}                    [description]
   */
  permanent_code: function(suite_access_token, tmp_auth_code) {
    var url = 'https://oapi.dingtalk.com/service/get_permanent_code?suite_access_token=' + suite_access_token;
    return util.post(url, {
      "tmp_auth_code": tmp_auth_code,
    });
  },

  /**
   * 激活套件
   * @param  {[type]} suite_access_token [description]
   * @param  {[type]} corpid             [description]
   * @param  {[type]} permanent_code     [description]
   * @return {[type]}                    [description]
   */
  enable_suite: function(suite_access_token, corpid, permanent_code) {
    var url = 'https://oapi.dingtalk.com/service/activate_suite?suite_access_token=' + suite_access_token;
    return util.post(url, {
      suite_key: this.suitekey,
      auth_corpid: corpid,
      permanent_code: permanent_code,
    });
  },


  /**
   * 获取企业 access_token
   * @param  {[type]} suite_access_token [description]
   * @param  {[type]} corpid             [description]
   * @param  {[type]} permanent_code     [description]
   * @return {[type]}                    [description]
   */
  corp_access_token: function(suite_access_token, corpid, permanent_code) {
    var url = 'https://oapi.dingtalk.com/service/get_corp_token?spm=a219a.7629140.0.0.8PZRyb&suite_access_token=' + suite_access_token;
    return util.post(url, {
      "auth_corpid": corpid,
      "permanent_code": permanent_code,
    })
  },

  /**
   * 获取企业的授权信息
   * @param  {[type]} suite_access_token [description]
   * @param  {[type]} corpid             [description]
   * @param  {[type]} permanent_code     [description]
   * @return {[type]}                    [description]
   */
  corp_auth_info: function(suite_access_token, corpid, permanent_code) {
    var url = 'https://oapi.dingtalk.com/service/get_auth_info?suite_access_token=' + suite_access_token;
    return util.post(url, {
      "auth_corpid": corpid,
      "permanent_code": permanent_code,
      "suite_key": this.suitekey,
    });
  },
};

/**
 * 使用企业access_token 换取 js_ticket
 * @param  {[type]} access_token [description]
 * @return {[type]}              [description]
 */
DingTalk.js_ticket = function(access_token) {
  var url = 'https://oapi.dingtalk.com/get_jsapi_ticket?type=jsapi&access_token=' + access_token;
  return util.get(url);
};


/**
 * js 签名
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
DingTalk.jsSignature = function(params) {
  var origUrl = params.url;
  var origUrlObj = url.parse(origUrl);
  delete origUrlObj['hash'];
  var newUrl = url.format(origUrlObj);
  var plain = 'jsapi_ticket=' + params.ticket +
    '&noncestr=' + params.nonceStr +
    '&timestamp=' + params.timeStamp +
    '&url=' + newUrl;
  var sha1 = crypto.createHash('sha1');
  sha1.update(plain, 'utf8');
  var signature = sha1.digest('hex');
  return signature;
};

DingTalk.getuserinfo = function(access_token, code) {
  var url = 'https://oapi.dingtalk.com/user/getuserinfo?access_token=' + access_token + '&code=' + code;
  return util.get(url);
};

DingTalk.user = function(access_token, userid) {
  var url = 'https://oapi.dingtalk.com/user/get?access_token=' + access_token + '&userid=' + userid;
  return util.get(url);
};

/**
 * 生成一定长度的随机字符串
 * @param  {Number} length 长度
 * @type {[type]}
 */
DingTalk.randomStr = _randomStr;

module.exports = DingTalk;


// -----------------
// ================== for test ========================================
/*
var qs = require('querystring');

var token = '123456',
  encode_aes_key = '4g5j64qlyl3zvetqxz5jiocdr586fn2zvjpa8zls3ij',
  suitekey = 'suite4xxxxxxxxxxxxxxx';

var query = 'signature=5a65ceeef9aab2d149439f82dc191dd6c5cbe2c0&timestamp=1445827045067&nonce=nEXhMP4r';
var encrypt = "1a3NBxmCFwkCJvfoQ7WhJHB+iX3qHPsc9JbaDznE1i03peOk1LaOQoRz3+nlyGNhwmwJ3vDMG+OzrHMeiZI7gTRWVdUBmfxjZ8Ej23JVYa9VrYeJ5as7XM/ZpulX8NEQis44w53h1qAgnC3PRzM7Zc/D6Ibr0rgUathB6zRHP8PYrfgnNOS9PhSBdHlegK+AGGanfwjXuQ9+0pZcy0w9lQ==";


var dingtalk = new DingTalk(token, encode_aes_key, suitekey);
var q = qs.parse(query);

var signature = dingtalk.signature(encrypt, q.nonce, q.timestamp);

console.log(signature);
console.log(q.signature);
console.log(signature == q.signature)

var msg = dingtalk.decrypt(encrypt);
console.log(msg);

debugger
var encode = dingtalk.encrypt(msg.msg.Random);
console.log(encode)

debugger
var check = dingtalk.decrypt(encode);
console.log(check);
process.exit();
*/