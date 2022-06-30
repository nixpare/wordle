const crypto = require('crypto')
const { MongoClient } = require('mongodb')

const { mongoDBURI, mongoDBName, mongoDBUserCollection } = require('./config.json')

const client = new MongoClient(mongoDBURI)
module.exports.client = client

class GameData {
	constructor() {
		/** @type {number} */
		this.played = 0
		/** @type {number} */
		this.wins = 0
		/** @type {number} */
		this.streak = 0
		/** @type {number} */
		this.maxStreak = 0
		/** @type {number[]} */
		this.results = [0, 0, 0, 0, 0, 0]
		/** @type {number} */
		this.lastPlayed = 0
		/** @type {number} */
		this.lastWon = 0
		/** @type {string} */
		this.secret = ''
		/** @type {string[]} */
		this.tries = []
	}
}
module.exports.GameData = GameData

class UserData {
	/**
	 * @param {string} email
	 * @param {password} password
	 * @returns {UserData}
	 */
	constructor(email, password) {
		/** @type {string} */
		this.email = email
		/**
		 * Secret key created randomly used to encrypt the password so
		 * its not saved in clear in the server
		 * @type {string}
		 */
		this.secretKey = crypto.randomBytes(24).toString('base64')
		/**
		 * User password hashed ready to be stored
		 * @type {string}
		 */
		this.encPassword = crypto.createHmac('sha256', this.secretKey).update(password).digest('base64')
		/**
		 * Coookie to be used when the used correctly logs in. The cookie is created
		 * by hashing the email with a secret key generated randomly (different from
		 * the one used for the password)
		 * @type {string}
		 */
		this.cookieValue = generateNewCookie(email)
		/**
		 * Data holds the game statistics organized in a Map:
		 *  + the keys of the map are strings and rapresent the language of the game (es: it, en)
		 *  + the values of the map are the statistics that has the same structure of GameData
		 * @type {Map<string, GameData>}
		 */
		this.data = new Map()
	}

	json() {
		return JSON.stringify(this)
	}
}
module.exports.UserData = UserData

/**
 * @param {string} email
 * @returns {string} CookieValue
 */
function generateNewCookie(email) {
	return crypto.createHmac(
		'sha256',
		crypto.randomBytes(24).toString('base64')
	).update(email).digest('base64')
}

/**
 * @param {string} email
 * @returns {Promise<boolean>} Exists
 */
 async function checkUser(cookieValue) {
	let db = client.db(mongoDBName).collection(mongoDBUserCollection)
	let res = await db.findOne({ cookieValue: cookieValue })

	if (!res) {
		return false
	}

	return true
}
module.exports.checkUser = checkUser

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string | null>} Ok
 */
async function registerUser(email, password) {
	let db = client.db(mongoDBName).collection(mongoDBUserCollection)
	if (await db.findOne({ email: email })) {
		throw new Error('User already registered')
	}

	let user = new UserData(email, password);
	let res = await db.insertOne(user)

	if (!res.acknowledged) {
		return null
	}
	return user.cookieValue
}
module.exports.registerUser = registerUser

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string | null>} Cookie value
 */
async function loginUser(email, password) {
	let db = client.db(mongoDBName).collection(mongoDBUserCollection)
	/** @type {UserData} */
	let user = await db.findOne({ email: email })

	if (!user) {
		return null
	}

	if (crypto.createHmac('sha256', user.secretKey).update(password).digest('base64') !== user.encPassword) {
		return null
	}

	let newCookieValue = generateNewCookie(email)
	let res = await db.updateOne({ email: email }, { $set: { cookieValue: newCookieValue } })

	if (!res.acknowledged) {
		return null
	}
	return newCookieValue
}
module.exports.loginUser = loginUser

/**
 * @param {string} cookieValue
 * @returns {Promise<Map<string, GameData>>} User data
 */
async function getUserData(cookieValue) {
	let db = client.db(mongoDBName).collection(mongoDBUserCollection)
	let user = await db.findOne({ cookieValue: cookieValue })

	if (!user) {
		throw new Error('Could not find user')
	}

	let data = new Map()
	for (let key in user.data) {
		data.set(key, user.data[key])
	}

	return data
}
module.exports.getUserData = getUserData

/**
 * @param {string} cookieValue
 * @param {Map<string, GameData>} newData
 * @returns {Promise<boolean>} Ok
 */
async function updateUserData(cookieValue, newData) {
	let db = client.db(mongoDBName).collection(mongoDBUserCollection)
	let res = await db.updateOne({ cookieValue: cookieValue }, { $set: { data: newData } })

	return res.acknowledged
}
module.exports.updateUserData = updateUserData
