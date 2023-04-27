const SteamOpenId = require("../index.js");

const openid = new SteamOpenId({
	//Your steam login session here
	session: "steamLoginSecure=asdasd"
})

openid.login({
	returnUrl: "https://example.com/return",
	realm: "https://example.com"
}).then(({ url, cookies }) => {
	// do something with the url or cookie
})
