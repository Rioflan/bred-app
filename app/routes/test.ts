import crypto from 'crypto';

const algorithm = 'aes-256-ctr';

export const encrypt = (text: string, password: any) => {
  const cipher = crypto.createCipher(algorithm, password);
  let crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
};

export const decrypt = (text: string, password: any) => {
  const decipher = crypto.createDecipher(algorithm, password);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
};

// let crypto = require('crypto'),
//     algorithm = 'aes-256-ctr';

// let randomBytes = require('randombytes');

// exports.encrypt = function(text, password){
//   const iv = new Buffer(randomBytes(16));
//   let key = crypto.createHash('sha256').update(String(iv)).digest('base64').substr(0, 32);
//   let cipher = crypto.createCipheriv(algorithm, key, iv)
//   let crypted = cipher.update(text,'utf8','hex')
//   crypted += cipher.final('hex');
//   return crypted;
// }

// exports.decrypt = function(text, password){
//   const iv = new Buffer(randomBytes(16));
//   let key = crypto.createHash('sha256').update(String(iv)).digest('base64').substr(0, 32);
//   let decipher = crypto.createDecipheriv(algorithm, key, iv)
//   let dec = decipher.update(text,'hex','utf8')
//   dec += decipher.final('utf8');
//   return dec;
// }
