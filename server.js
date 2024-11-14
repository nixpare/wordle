const express = require('express')
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const serveStatic = require('serve-static')
const cookieParser = require('cookie-parser')

const apiFunctions = require('./api-functions.js')
const routeFunctions = require('./route-functions.js')
const { client } = require('./db-functions.js')

const { port } = require('./config.json')
const publicPath = path.join(__dirname, 'public')

const accessLogStream = fs.createWriteStream('access.log')

const app = express()

/*
    USE
*/

app.use(morgan('combined', { stream: accessLogStream }))
app.use(serveStatic(publicPath, { index: false, redirect: false }))
app.use(cookieParser())

/*
    ITALIAN
*/

app.get('/', (req, res) => {
    routeFunctions.getIndex(req, res, 'it')
})
app.get('/login', (req, res) => {
    routeFunctions.getLogin(req, res, 'it')
})
app.get('/logout', (req, res) => {
    routeFunctions.getLogout(req, res, 'it')
})
app.get('/secret', (req, res) => {
    routeFunctions.getSecret(req, res, 'it')
})
app.get('/data', (req, res) => {
    routeFunctions.getData(req, res, 'it')
})

app.post('/check', (req, res) => {
    routeFunctions.postCheck(req, res, 'it')
})
app.post('/login', (req, res) => {
    routeFunctions.postLogin(req, res, 'it')  
})
app.post('/register', (req, res) => {
    routeFunctions.postRegister(req, res, 'it')
})
app.post('/data', (req, res) => {
    routeFunctions.postData(req, res, 'it')
})

/*
    ENGLISH
*/

app.get('/en', (req, res) => {
    routeFunctions.getIndex(req, res, 'en')
})
app.get('/en/login', (req, res) => {
    routeFunctions.getLogin(req, res, 'en')
})
app.get('/en/logout', (req, res) => {
    routeFunctions.getLogout(req, res, 'en')
})
app.get('/en/secret', (req, res) => {
    routeFunctions.getSecret(req, res, 'en')
})
app.get('/en/data', (req, res) => {
    routeFunctions.getData(req, res, 'en')
})

app.post('/en/check', (req, res) => {
    routeFunctions.postCheck(req, res, 'en')
})
app.post('/en/login', (req, res) => {
    routeFunctions.postLogin(req, res, 'en')  
})
app.post('/en/register', (req, res) => {
    routeFunctions.postRegister(req, res, 'en')
})
app.post('/en/data', (req, res) => {
    routeFunctions.postData(req, res, 'en')
})

/*
    REST API
*/

app.get('/api/random', apiFunctions.getRandom)
app.get('/api/check/:word', apiFunctions.getCheck)
app.get('/api/words/:word', apiFunctions.getWords)
app.get('/api/search/:pattern', apiFunctions.getSearch)
app.get('/api/fill/:pattern', apiFunctions.getFill)

/*
    START
*/

client.connect().then(() => {
    process.on('SIGINT', () => {
        console.log()
        process.exit(0)
    })

    process.on('exit', () => {
        client.close()
        console.log('Server closed')
    })

    app.listen(port, () => {
        console.log(`Server listening on port ${port}`)
    })
})
