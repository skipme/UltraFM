var main = require("./main");

// exports["test main"] = function(assert) {
//   assert.pass("Unit test running!");
// };

// exports["test main async"] = function(assert, done) {
//   assert.pass("async Unit test running!");
//   done();
// };


exports["test get_token"] = function(assert) {
  
  var token = main.getTokenFromUrl("1434?token=somt123&othtkn=33");
  assert.equal(token, "somt123")

  token = main.getTokenFromUrl("1434?nottoken=not1&1token=44&token=somt123");
  assert.equal(token, "somt123")

  token = main.getTokenFromUrl("1434?nottoken=not1&token=somt123&token4=77");
  assert.equal(token, "somt123")

 token = main.getTokenFromUrl("nottoken=not1&token=somt123&token4=77");
  assert.equal(token, "somt123")

   token = main.getTokenFromUrl("token=somt123&token4=77");
  assert.equal(token, "somt123")
};

require("sdk/test").run(exports);
