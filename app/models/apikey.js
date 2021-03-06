var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ApiSchema   = new Schema({
  name:           String,
  email:          String,
  api_key:        String,//password != token
  creation:       Date
});

module.exports = mongoose.model('Api', ApiSchema);
