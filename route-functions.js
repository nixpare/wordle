const express = require('express')
const { StatusCodes } = require('http-status-codes')
const path = require('path')

const dbFunctions = require('./db-functions.js')
const { universalCheck } = require('./api-functions.js')

const { cookieName } = require('./config.json')
const pagesPath = path.join(__dirname, 'pages')

/**
 * @param {express.Request} req
 * @returns {Promise<string>} Data
 */
async function readReqBody(req) {
    return new Promise(resolve => {
        let data = ''
        req.on('data', chunk => {
            data += chunk.toString()
        })
        req.on('end', () => {
            resolve(data)
        })
    })
}
module.exports.readReqBody = readReqBody

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function getIndex(req, res, lang) {
    let cookieValue = req.cookies ? req.cookies[cookieName] : null
    if (!cookieValue) {
        res.redirect(`/${lang === 'it' ? '' : lang + '/'}login`)
        return
    }

    if (!await dbFunctions.checkUser(cookieValue)) {
        res.clearCookie(cookieName)
        res.redirect(`/${lang === 'it' ? '' : lang + '/'}login`)
        return
    }

    res.sendFile(`index-${lang}.html`, { root: pagesPath })
}
module.exports.getIndex = getIndex

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {void}
 */
function getLogin(req, res, lang) {
    if (req.cookies && req.cookies[cookieName]) {
        res.redirect(`/${lang === 'it' ? '' : lang}`)
        return
    }

    res.sendFile(`login-${lang}.html`, { root: pagesPath })
}
module.exports.getLogin = getLogin

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {void}
 */
function getLogout(req, res, lang) {
    res.clearCookie(cookieName)
    res.redirect(`/${lang === 'it' ? '' : lang + '/'}login`)
}
module.exports.getLogout = getLogout

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {void}
 */
function getSecret(req, res, lang) {
    res.redirect(`/api/random?lang=${lang}`)
}
module.exports.getSecret = getSecret

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function getData(req, res, lang) {
    let cookieValue = req.cookies ? req.cookies[cookieName] : null
    if (!cookieValue) {
        res.writeHead(StatusCodes.UNAUTHORIZED)
        res.end('Not logged in')
        return
    }

    dbFunctions.getUserData(cookieValue)
        .then(async data => {
            if (!data.has(lang)) {
                data.set(lang, new dbFunctions.GameData())

                if (!await dbFunctions.updateUserData(cookieValue, data)) {
                    res.writeHead(StatusCodes.INTERNAL_SERVER_ERROR)
                    res.end('Can\'t update user data')
                    return
                }
            }

            res.type('json')
            res.write(JSON.stringify(data.get(lang)))
            res.end()
        })
        .catch(err => {
            res.clearCookie(cookieName)
            res.writeHead(StatusCodes.BAD_REQUEST)
            res.end(err.message)
            return
        })
}
module.exports.getData = getData

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function postCheck(req, res, lang) {
    if (req.headers['content-type'] !== 'text/plain') {
        res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE)
        res.end('Unsupported Media Type')
        return
    }

    let word = await readReqBody(req)
    universalCheck(req, res, word, lang)
}
module.exports.postCheck = postCheck

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function postLogin(req, res, lang) {
    /* await (async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    })(1000) */

    if (req.cookies && req.cookies[cookieName]) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('Log out before logging in')
        return
    }

    if (req.headers['content-type'] !== 'application/json') {
        res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE)
        
        let resp
        switch (lang) {
            case 'it':
                resp = 'MIME type non supportato'
                break
            case 'en':
                resp = 'MIME type not supported'
                break
        }
        res.end(resp)
        return
    }

    let { email, password } = JSON.parse(await readReqBody(req))
    let cookieValue = await dbFunctions.loginUser(email, password)

    if (!cookieValue) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        
        let resp
        switch (lang) {
            case 'it':
                resp = 'Email o password non corrette'
                break
            case 'en':
                resp = 'Email or password are wrong'
                break
        }
        res.end(resp)
        return
    }

    res.cookie(cookieName, cookieValue)
    res.end()
}
module.exports.postLogin = postLogin

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function postData(req, res, lang) {
    let cookieValue = req.cookies ? req.cookies[cookieName] : null
    if (!cookieValue) {
        res.writeHead(StatusCodes.UNAUTHORIZED)
        res.end('Not logged in')
        return
    }

    if (req.headers['content-type'] !== 'application/json') {
        res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE)
        res.end('Unsupported Media Type')
        return
    }

    try {
        let [data, newData] = await Promise.all([
            dbFunctions.getUserData(cookieValue),
            readReqBody(req)
        ])

        data.set(lang, JSON.parse(newData))

        if (!dbFunctions.updateUserData(cookieValue, data)) {
            res.writeHead(StatusCodes.INTERNAL_SERVER_ERROR)
            res.end('Can\'t update user data')
            return
        }

        res.end('ok')
    } catch (err) {
        res.clearCookie(cookieName)
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end(err.message)
        return
    }
}
module.exports.postData = postData

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function postRegister(req, res, lang) {
    if (req.headers['content-type'] !== 'application/json') {
        res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE)
        
        let resp
        switch (lang) {
            case 'it':
                resp = 'MIME type non supportato'
                break
            case 'en':
                resp = 'MIME type not supported'
                break
        }
        res.end(resp)

        return
    }

    let { email, password, confirmPassword } = JSON.parse(await readReqBody(req))
    if (password !== confirmPassword) {
        res.status(StatusCodes.BAD_REQUEST)

        let resp
        switch (lang) {
            case 'it':
                resp = 'Le due password non corrispondono'
                break
            case 'en':
                resp = 'The two passwords do not match'
                break
        }
        res.end(resp)
        return
    }

    try {
        let cookieValue = await dbFunctions.registerUser(email, password)
        if (!cookieValue) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR)
            
            let resp
            switch (lang) {
                case 'it':
                    resp = 'Errore interno al server'
                    break
                case 'en':
                    resp = 'Internal server error'
                    break
            }
            res.end(resp)
            return
        }

        res.cookie(cookieName, cookieValue)
        res.end()
    } catch (_) {
        res.status(StatusCodes.BAD_REQUEST)
        
        let resp
        switch (lang) {
            case 'it':
                resp = 'Utente già registrato'
                break
            case 'en':
                resp = 'User already registered'
                break
        }
        res.end(resp)
        return
    }
}
module.exports.postRegister = postRegister
