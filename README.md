# dingTalk
## 1.install
```shell
  npm i fanqier-dingtalk
```
## 2.example
```js
var token = ;
var encode_aes_key = '';
var suitekey = '';
var suitesecret = '';

const DingTalk = require('fanqier-dingtalk');

var dingTalk = DingTalk(token, encode_aes_key, suitekey, suitesecret);

//回调接口信息解密
dingTalk.decrypt(encryptInfo);

//信息加密
dingTalk.encrypt(plainText);

//签名
dingtalk.signature(encrypt, nonce, timestamp);


```

## 3.api

