const FormData = require("form-data");
const cheerio = require("cheerio");
const axios = require("axios")
const tough = require('tough-cookie')
const axiosCookieSupport = require('axios-cookiejar-support').wrapper

axiosCookieSupport(axios)
axios.defaults.withCredentials = true

class SteamOpenId {
	constructor(opts) {		
		this.steamSession = opts.session.replace(/\n/g, "") ?? null
		this.nounceCookie = ""
		this.jar = new tough.CookieJar()
		this.agent = opts.agent
	}
	async login({
		returnUrl,
		realm
	}) {
		try {
			var self = this;
			var res = await axios({
				url: "https://steamcommunity.com/openid/login",
				params: {
					"openid.mode":	"checkid_setup",
					"openid.ns":	"http://specs.openid.net/auth/2.0",
					"openid.identity":	"http://specs.openid.net/auth/2.0/identifier_select",
					"openid.claimed_id":	"http://specs.openid.net/auth/2.0/identifier_select",
					"openid.return_to":	returnUrl,
					"openid.realm":	realm
				},
				headers: {
					"cookie": self.steamSession
				},
				httpsAgent: self.agent
			})
			
			var nounce = res.headers["set-cookie"].find(x => x.includes("sessionidSecureOpenIDNonce"))
			if(nounce){
				self.nounceCookie = nounce.split("; ")[0]
			}
			
			var $ = cheerio.load(res.data)
			var formBodyToSend = new FormData();
			
			$("#openidForm input").each(function(index, el){
				var { name, value } = el.attribs
				if(name == undefined || value == undefined) return;
				formBodyToSend.append(name, value)
			})
			
			var loginRes = await axios.post('https://steamcommunity.com/openid/login', formBodyToSend, {
				headers: Object.assign(formBodyToSend.getHeaders(), {
					cookie: [self.steamSession, self.nounceCookie].join("; ")
				}),
				maxRedirects: 0,
				validateStatus: function(status){
					return status == 302
				},
				httpsAgent: self.agent
			})
			
			var backToSite = await axios.get(loginRes.headers.location, {
				headers: {
					"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
					"accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,zh-TW;q=0.6",
					"cache-control": "no-cache",
					"cookie": self.steamSession,
					"pragma": "no-cache",
					"sec-ch-ua-mobile": "?0",
					"sec-fetch-dest": "document",
					"sec-fetch-mode": "navigate",
					"sec-fetch-site": "cross-site",
					"sec-fetch-user": "?1",
					"upgrade-insecure-requests": "1",
				},
				httpsAgent: self.agent,
				validateStatus: (status) => status == 302,
				maxRedirects: 0
			})
			
			return {
				url: backToSite.headers.location,
				cookies: backToSite.headers["set-cookie"] ?? []
			}
		}catch(e){
			console.log(e)
			return e
		}
	}
}

module.exports = SteamOpenId