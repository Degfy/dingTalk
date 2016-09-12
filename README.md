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

//签名,⚠️在接口回调时签名用的随机字符串和时间戳一定是url参赛中传来的（这个设定也是心碎了）
dingTalk.signature(encrypt, nonce, timestamp);

//ticket换取 suite_access_token
dingTalk.suite_access_token(ticket);


// 企业临时授权码 换取 企业永久授权码
dingTalk.permanent_code(suite_access_token, tmp_auth_code);


//激活套件
enable_suite(suite_access_token, corpid, permanent_code);

//获取企业 corp_access_token
corp_access_token(suite_access_token, corpid, permanent_code);

//获取企业的授权信息
corp_auth_info(suite_access_token, corpid, permanent_code);

//-----------------下面是DingTalk的静态方法------------------------
//企业access_token 换取 js_ticket
DingTalk.js_ticket(access_token);

//jsapi签名
DingTalk.jsSignature({
  nonceStr: nonceStr, //随机字符串
  timeStamp: timeStamp, //当前时间戳(10位，前面解密加密的是13位，这也是坑死人不偿命的设定)
  url: url,//本页面的全地址（example： http://xxx.com?xx=ss&xx2=sss2）
  ticket: js_ticket,
});

//获取用户身份信息
DingTalk.getuserinfo(access_token, code);

//获取用户信息
DingTalk.user(access_token, userid);




```

## 3.api

