const express = require('express')
const { StatusCodes } = require('http-status-codes')

const wordPicks = new Map()
wordPicks.set('it', require('./dictionaries/italian_dictionary_pick.json'))
wordPicks.set('en', require('./dictionaries/english_dictionary_pick.json'))

const wordChecks = new Map()
wordChecks.set('it', require('./dictionaries/italian_dictionary_check.json'))
wordChecks.set('en', require('./dictionaries/english_dictionary_check.json'))

/**
 * @param {string} word
 * @param {string[]} dictionary
 * @returns {string[]} List of words
 */
function wordsStartingWith (word, dictionary) {
    let list = []
    dictionary.forEach(w => {
        if (w.startsWith(word)) {
            list.push(w)
        }
    })

    return list
}

/**
 * @param {string} pattern
 * @param {string[]} dictionary
 * @returns {string[]} List of words
 */
function patternSearchList (pattern, dictionary) {
    let list = []
    dictionary.forEach(w => {
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '_') {
                continue
            }

            if (pattern[i] !== w[i]) {
                return
            }
        }

        list.push(w)
    })

    return list
}

/**
 * @param {string} pattern
 * @param {string[]} candidates
 * @param {string[]} blackList
 * @param {string[]} dictionary
 * @returns {string[]} List of words
 */
function patternFillList (pattern, candidates, blackList, dictionary) {
    let list = []
    dictionary.forEach(w => {
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '_') {
                continue
            }

            if (pattern[i] !== w[i]) {
                return
            }
        }

        for (let i = 0; i < w.length; i++) {
            if (blackList.includes(w[i])) {
                return
            }
        }

        let candidatesCopy = []
        candidates.forEach(candidate => {
            candidatesCopy.push(candidate)
        })

        for (let i = 0; i < w.length; i++) {
            if (pattern[i] !== '_') {
                continue
            }

            for (let j = 0; j < candidatesCopy.length; j++) {
                if (candidatesCopy[j] === w[i]) {
                    delete candidatesCopy[j]
                    candidatesCopy.sort()
                    candidatesCopy.pop()
                }
            }
        }

        if (candidatesCopy.length === 0) {
            list.push(w)
        }
    })

    return list
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {void}
 */
function getRandom(req, res) {
    if (!req.query['lang']) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('lang query missing')
        return
    }

    let dictionary = wordPicks.get(req.query['lang'])
    if (!dictionary) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('language not supported')
        return
    }
    
    res.type('json')
    res.end(dictionary[Math.floor(Math.random() * dictionary.length)])
}
module.exports.getRandom = getRandom

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {string} word
 * @param {string} lang
 * @returns {void}
 */
function universalCheck(req, res, word, lang) {
    if (word.length !== 5) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('word must have length of 5')
        return
    }

    let dictionary = wordChecks.get(lang)
    if (!dictionary) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('language not supported')
        return
    }

    if (dictionary.includes(word)) {
        res.end('ok')
    } else {
        res.end('no')
    }
}
module.exports.universalCheck = universalCheck

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {void}
 */
function getCheck(req, res) {
    if (!req.query['lang']) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('lang query missing')
        return
    }

    let word = req.params.word.toLowerCase()
    universalCheck(req, res, word, req.query['lang'])
}
module.exports.getCheck = getCheck

const acceptedLetters = 'abcdefghijklmnopqrstuvwxyz'

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {void}
 */
function getWords(req, res) {
    if (!req.query['lang']) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('lang query missing')
        return
    }

    let word = req.params.word.toLowerCase()

    if (word.length > 5 || word.length < 1) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('word must have max length of 5 and min length of 1')
        return
    }

    for (let i = 0; i < word.length; i++) {
        if (!acceptedLetters.includes(word[i])) {
            res.writeHead(StatusCodes.BAD_REQUEST)
            res.end('letters in word must be only alpha')
            return
        }
    }

    let dictionary = wordPicks.get(req.query['lang'])
    if (!dictionary) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('language not supported')
        return
    }
    
    res.type('json')
    res.end(JSON.stringify(wordsStartingWith(word, dictionary)))
}
module.exports.getWords = getWords

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {void}
 */
function getSearch(req, res) {
    if (!req.query['lang']) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('lang query missing')
        return
    }

    let pattern = req.params.pattern.toLowerCase()

    if (pattern.length > 5 || pattern.length < 1) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('pattern must have max length of 5 and min length of 1')
        return
    }

    let dictionary = wordPicks.get(req.query['lang'])
    if (!dictionary) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('language not supported')
        return
    }

    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '_') {
            continue
        }

        if (!acceptedLetters.includes(pattern[i])) {
            res.writeHead(StatusCodes.BAD_REQUEST)
            res.end('letters in pattern must be only alpha')
            return
        }
    }

    res.type('json')
    res.end(JSON.stringify(patternSearchList(pattern, dictionary)))
}
module.exports.getSearch = getSearch

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {void}
 */
function getFill(req, res) {
    if (!req.query['lang']) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('lang query missing')
        return
    }

    let pattern = req.params.pattern.toLowerCase()

    if (pattern.length > 5 || pattern.length < 1) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('pattern must have max length of 5 and min length of 1')
        return
    }

    let dictionary = wordPicks.get(req.query['lang'])
    if (!dictionary) {
        res.writeHead(StatusCodes.BAD_REQUEST)
        res.end('language not supported')
        return
    }

    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '_') {
            continue
        }

        if (!acceptedLetters.includes(pattern[i])) {
            res.writeHead(StatusCodes.BAD_REQUEST)
            res.end('letters in pattern must be only alpha')
            return
        }
    }

    let candidates = []
    if (req.query['q']) {
        candidates = req.query['q'].split('')
    }

    let backlist = []
    if (req.query['n']) {
        backlist = req.query['n'].split('')
    }

    res.type('json')
    res.end(JSON.stringify(patternFillList(pattern, candidates, backlist, dictionary)))
}
module.exports.getFill = getFill
