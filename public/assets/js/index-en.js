/**
 * Letter reveal timer
 */
const showTimer = 350 //ms
/**
 * Letter wobble timer when wrong
 */
const wobbleTimer = 300 //ms
/**
 * Pane closure timer
 */
const closePanesTimer = 500 //ms
/**
 * Name of the saved stats in localStorage
 */

/**
 * Panes handle the fullscreen panes hiding behind the game
 * to display additional informations
 * Its also possible to bring to the foreground a pane and lock
 * is there (es: if a fatal error occurs and the user should not
 * interact with the window even more)
 */
class Panes {
	/**
	 * Creates a Panes collection from the document fetching all the pane divs
	 * under the fullscreen-panes element
	 */
	constructor() {
		/** @type {Element} */
		this.parent = document.querySelector('.fullscreen-panes')
		this.parent.addEventListener('click', e => {
			if (e.target != this.parent || this.state === 'perma') {
				return
			}

			this.closePanes()
		})

		/** @type {Element[]} */
		this.panes = []
		this.parent.querySelectorAll('.pane').forEach(e => this.panes.push(e))

		/** @type {'ready' | 'changing' | 'perma'} */
		this.state = 'ready'
	}

	/**
	 * If nothing is changing (like another pane still opening) or no pane
	 * is opened permanently, it closes all the panes bringing them in the
	 * background
	 * 
	 * @returns {void}
	 */
	closePanes() {
		if (this.state !== 'ready') return null

		this.state = 'changing'
		this.parent.classList.add('hidden')

		window.setTimeout(() => {
			this.panes.forEach((e) => {
				e.classList.add('hidden')
			})

			this.state = 'ready'
		}, closePanesTimer)
	}

	/**
	 * If nothign is changing (like another pane still opening or other panes closing),
	 * if opens the specified pane if existing, but it fails if the pane does not exists
	 * or if the are other changes not completed
	 * @param {string} name The name of the pane to be opened
	 * @returns {Element | null} The pane opened if successfull, otherwise null
	 */
	openPane(name) {
		if (this.state !== 'ready') return null

		for (let i = 0; i < this.panes.length; i++) {
			const e = this.panes[i]
			if (e.classList.contains(name)) {
				this.state = 'changing'

				e.classList.remove('hidden')
				this.parent.classList.remove('hidden')

				window.setTimeout(() => {
					this.state = 'ready'
				}, closePanesTimer)

				return e
			}
		}

		return null
	}

	/**
	 * If nothign is changing (like another pane still opening or other panes closing),
	 * if opens permanently the specified pane if existing, making every other opening
	 * or closing unsuccessful, but it fails if the pane does not exists
	 * or if the are other changes not completed
	 * @param {string} name The name of the pane to be opened
	 * @returns {Element | null} The pane opened if successfull, otherwise null
	 */
	openPermaPane(name) {
		if (this.state !== 'ready') return null

		for (let i = 0; i < this.panes.length; i++) {
			const e = this.panes[i]
			if (e.classList.contains(name)) {
				this.state = 'perma'
				this.parent.classList.add('perma')

				e.classList.remove('hidden')
				this.parent.classList.remove('hidden')

				return e
			}
		}

		return null
	}
}

const panes = new Panes()

/**
 * Displays the desired error in a fullscreen pane (also permanent if desired) with a custom error message
 * for the console
 * @param {string} userMessage The message to be displayed it the fullscreen pane
 * @param {string | any[]} consoleMessage The list of arguments or the message to be displayed in the console
 * @param {boolean} halt Whether this error should stop every script execution and open a permanent pane
 * @param {() => void} [callback] The action to be executed after the user closes the error pane
 * @returns {void}
 */
function showError(userMessage, consoleMessage, halt, callback) {
	if (halt) {
		panes.openPermaPane('errors')
		document.querySelector('.pane.errors .message').textContent = userMessage

		if (typeof (consoleMessage) === 'string') {
			throw new Error(consoleMessage)
		} else {
			console.error(...consoleMessage)
			throw new Error('Halt caused by an error, see previous log')
		}
	}

	panes.openPane('errors')
	document.querySelector('.pane.errors .message').textContent = userMessage
	console.error(...consoleMessage)
}

/**
 * WordRow reflects the game row with references to the corresponding
 * html elements of the word row and each letter
 * @typedef {Object} WordRow
 * @property {string} content
 * @property {HTMLElement} word
 * @property {HTMLElement[]} letters
 */

/**
 * The game statistics
 * @typedef {Object} Stats
 * @property {number} played
 * @property {number} wins
 * @property {number} streak
 * @property {number} maxStreak
 * @property {number} results
 * @property {number} lastPlayed
 * @property {number} lastWon
 * @property {string} secret
 * @property {string[]} tries
 */

/**
 * State can be used to describe the state of the game
 * @typedef {'never-started' | 'running' | 'paused' | 'won' | 'lost'} State
 */

/**
 * Game main object
 */
class Wordle {

	constructor() {
		/** @type {number} */
		this.row = 0
		/** @type {number} */
		this.col = 0
		/** @type {string} */
		this.realSecretWord
		/** @type {string} */
		this.secretWord
		/** @type {State} */
		this.state = 'never-started'
		/** @type {HTMLElement} */
		this.mobileKB = document.querySelector('.keyboard')
		/** @type {HTMLElement} */
		this.grid = document.querySelector('.grid')
		/** @type {WordRow[]} */
		this.words = []
		/** @type {Stats} */
		this.stats
	}

	/** @returns {Promise<void>} */
	async init() {
		const errF = reason => {
			showError(
				'Unable to get Game Statistics, retry later',
				['IUnable to get Game Statistics, reason: ', reason],
				true
			)
		}

		try {
			let resp = await fetch('/en/data')
			if (resp.status !== 200) {
				errF(resp)
				return
			}

			this.stats = await resp.json()
		} catch (err) {
			errF(err)
		}

		if (this.stats.lastWon !== this.stats.lastPlayed) {
			this.stats.streak = 0
			this.updateStats()
		}

		this.loadStats()

		this.grid.querySelectorAll('.word').forEach(e => {
			/** @type {HTMLElement[]} */
			let letters = []

			e.querySelectorAll('.letter').forEach(e2 => {
				letters.push(e2)
			})

			this.words.push({
				content: '',
				word: e,
				letters: letters,
			})
		})

		if (this.stats.secret != '') {
			document.querySelector('.start-game').classList.add('d-none')
			document.querySelector('.resume-game').classList.remove('d-none')
		}

		if (location.search.includes('?start') && history.pushState) {
			let newUrl = location.origin + location.pathname
			history.pushState({ path: newUrl }, '', newUrl)
			this.startGame()
			return
		}

		document.getElementsByName('startButton').forEach(e => {
			e.addEventListener('click', () => {
				this.startGame()
			})
		})

		document.getElementById('resumeButton').addEventListener('click', () => {
			this.resumeGame()
		})
	}

	/** @returns {boolean} */
	isRunning() {
		return this.state === 'running'
	}

	/** @returns {void} */
	resumeGame() {
		document.querySelector('.resume-game').classList.add('d-none')
		document.querySelector('.loading').classList.remove('d-none')

		this.realSecretWord = this.stats.secret
		this.secretWord = removeAccents(this.realSecretWord)

		this.state = 'paused'

		this.registerInput()

		/** @type {number} */
		let i
		for (i = 0; i < this.stats.tries.length; i++) {
			let word = this.stats.tries[i]
			window.setTimeout(() => {
				word.split('').forEach(letter => {
					this.addLetter(letter)
				})

				this.scanRow(this.row)
				this.row++
				this.col = 0
			}, 300 * i)
		}

		window.setTimeout(() => {
			this.words[this.row].letters[this.col].classList.add('active')
			this.words[this.row].word.classList.add('active')
		}, 300 * (i + 1))

		document.querySelector('.loading').classList.add('d-none')
		document.querySelector('.grid').classList.remove('d-none')

		this.state = 'running'
	}

	/** @returns {void} */
	startGame() {
		if (this.isRunning()) {
			return
		}

		document.querySelector('.start-game').classList.add('d-none')
		document.querySelector('.resume-game').classList.add('d-none')
		document.querySelector('.loading').classList.remove('d-none')

		let xhr = new XMLHttpRequest()
		xhr.open('GET', '/en/secret')
		xhr.timeout = 5000

		xhr.onload = () => {
			this.realSecretWord = xhr.responseText.trimEnd()
			this.secretWord = removeAccents(this.realSecretWord)
			this.stats.secret = this.realSecretWord
			this.stats.tries = []

			this.stats.played++
			this.stats.lastPlayed = Date.now()
			this.updateStats()

			this.registerInput()

			this.words[this.row].letters[this.col].classList.add('active')
			this.words[this.row].word.classList.add('active')

			document.querySelector('.loading').classList.add('d-none')
			document.querySelector('.grid').classList.remove('d-none')

			this.state = 'running'
		}

		let secretError = () => {
			showError(
				'Unable to start the Game, retry later',
				['Unable to start the Game: response received', xhr],
				true
			)
		}

		xhr.onerror = secretError
		xhr.onabort = secretError
		xhr.ontimeout = secretError

		xhr.send()
	}

	/** @returns {void} */
	registerInput() {
		document.addEventListener('keydown', e => {
			const letters = 'abcdefghijklmnopqrstuvwxyz'
			switch (e.key) {
				case 'Backspace':
					document.getElementById('backspace').classList.add('clicked')
					break
				case 'Enter':
					document.getElementById('enter').classList.add('clicked')
					break
				default:
					let key = e.key.toLowerCase()
					if (letters.includes(key)) {
						document.getElementById(key).classList.add('clicked')
						return
					}
			}
		})

		document.addEventListener('keyup', e => {
			const letters = 'abcdefghijklmnopqrstuvwxyz'
			switch (e.key) {
				case 'Backspace':
					document.getElementById('backspace').classList.remove('clicked')
					this.removeLetter()
					break
				case 'Enter':
					document.getElementById('enter').classList.remove('clicked')
					this.checkRow()
					break
				default:
					let key = e.key.toLowerCase()
					if (letters.includes(key)) {
						document.getElementById(key).classList.remove('clicked')
						this.addLetter(key)
						return
					}
			}
		})

		this.mobileKB.querySelectorAll('.key').forEach(e => {
			e.addEventListener('mousedown', () => {
				e.classList.add('clicked')
			})

			e.addEventListener('touchstart', (ev) => {
				ev.preventDefault()
				e.classList.add('clicked')
			})

			let clickF = (/** @type {Element} */ e) => {
				e.classList.remove('clicked')
				switch (e.id) {
					case 'backspace':
						this.removeLetter()
						break
					case 'enter':
						this.checkRow()
						break
					default:
						this.addLetter(e.id)
				}
			}

			e.addEventListener('mouseup', () => {
				clickF(e)
			})

			e.addEventListener('touchend', () => {
				clickF(e)
			})
		})

		let setKeyboardSize = () => {
			let keyUnit = Math.min(
				(window.innerWidth - 2) / 72,
				6
			)

			this.mobileKB.style.setProperty('--key-unit', keyUnit + 'px')
		}

		setKeyboardSize()
		this.mobileKB.classList.remove('d-none')

		window.onresize = () => {
			setKeyboardSize()
		}
	}

	/**
	 * @param {string} letter 
	 * @returns {void}
	 */
	addLetter(letter) {
		if (letter.length !== 1 || !this.isRunning()) {
			return
		}

		if (this.col == 5) {
			this.wobbleRow()
			return
		}

		this.words[this.row].content += letter
		this.words[this.row].letters[this.col].textContent = letter

		if (this.col < 4 && this.words[this.row].letters[this.col].classList.contains('active')) {
			this.words[this.row].letters[this.col].classList.remove('active')
			this.words[this.row].letters[this.col + 1].classList.add('active')
		}

		this.col++
	}

	/** @returns {void} */
	removeLetter() {
		if (!this.isRunning() || this.col === 0) {
			return
		}

		this.col--
		this.words[this.row].letters[this.col].textContent = ''
		this.words[this.row].content = this.words[this.row].content.substring(0, this.col)

		if (this.col < 4 && this.words[this.row].letters[this.col + 1].classList.contains('active')) {
			this.words[this.row].letters[this.col].classList.add('active')
			this.words[this.row].letters[this.col + 1].classList.remove('active')
		}
	}

	/** @returns {void} */
	checkRow() {
		if (!this.isRunning()) {
			return
		}

		this.state = 'paused'

		if (this.col < 5) {
			this.wobbleRow().then(() => {
				this.state = 'running'
			})
			return
		}

		if (this.row === 5) {
			this.scanRow(this.row, () => {
				if (this.words[this.row].content === this.secretWord) {
					this.win()
				} else {
					this.lose()
				}
			})

			return
		}

		this.tryExists(value => {
			if (value) {

				this.stats.tries[this.row] = this.words[this.row].content
				this.updateStats()

				this.scanRow(this.row, () => {
					if (this.words[this.row].content === this.secretWord) {
						this.win()
					} else {
						this.words[this.row].word.classList.remove('active')
						this.words[this.row].letters[this.col - 1].classList.remove('active')

						this.row++
						this.col = 0

						this.words[this.row].word.classList.add('active')
						this.words[this.row].letters[this.col].classList.add('active')

						this.state = 'running'
					}
				})
			} else {
				this.wobbleRow().then(() => {
					this.state = 'running'
				})
			}
		})
	}

	/**
	 * @param {number} row 
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	scanRow(row, callback) {
		let wordTry = this.words[row].content;

		let res = ['wrong', 'wrong', 'wrong', 'wrong', 'wrong'];
		let secretCopy = this.secretWord;

		for (let i = 0; i < 5; i++) {
			if (wordTry[i] === secretCopy[i]) {
				res[i] = 'correct';
			}
		}

		for (let i = 0; i < 5; i++) {
			if (res[i] === 'correct') {
				wordTry = setCharAt(wordTry, i, '_');
				secretCopy = setCharAt(secretCopy, i, '_');
			}
		}

		for (let i = 0; i < 5; i++) {
			if (wordTry[i] == '_') {
				continue;
			}

			let j = secretCopy.search(wordTry[i]);
			if (j >= 0) {
				secretCopy = setCharAt(secretCopy, j, '_');
				res[i] = 'close';
			}
		}

		res.forEach((value, index) => {
			window.setTimeout(() => {
				this.words[row].letters[index].classList.add(value)

				let kbLetter = document.getElementById(this.words[row].content.at(index))
				switch (value) {
					case 'correct':
						kbLetter.classList.remove('close')
						kbLetter.classList.remove('wrong')
						kbLetter.classList.add('correct')
						break
					case 'close':
						if (!kbLetter.classList.contains('correct')) {
							kbLetter.classList.remove('wrong');
							kbLetter.classList.add('close')
						}
						break
					case 'wrong':
						if (!kbLetter.classList.contains('correct') && !kbLetter.classList.contains('close')) {
							kbLetter.classList.add('wrong')
						}
						break
				}
			}, showTimer * index);
		})

		window.setTimeout(callback, showTimer * 5)
	}

	/**
	 * @param {(ok: boolean) => void} [callback]
	 * @returns {void}
	 */
	tryExists(callback) {
		this.words[this.row].word.classList.add('loading')

		let xhr = new XMLHttpRequest()
		xhr.open('POST', '/en/check')
		xhr.timeout = 5000
		xhr.setRequestHeader('Content-Type', 'text/plain')

		xhr.onload = () => {
			this.words[this.row].word.classList.remove('loading')

			if (xhr.status !== 200) {
				callback(false)
				return
			}

			callback(xhr.responseText === 'ok')
		}

		let checkError = () => {
			this.words[this.row].word.classList.remove('loading')

			showError(
				`Connection error, retry later`,
				['Error while checking try: response received', xhr],
				false
			)
			callback(false)
		}

		xhr.onerror = checkError
		xhr.onabort = checkError
		xhr.ontimeout = checkError

		xhr.send(this.words[this.row].content)
	}

	/** @returns {Promise<void>} */
	wobbleRow() {
		this.words[this.row].word.classList.add('wobble')
		return new Promise(resolve => window.setTimeout(() => {
			this.words[this.row].word.classList.remove('wobble')
			resolve()
		}, wobbleTimer))
	}

	/** @returns {void} */
	win() {
		this.stats.wins++
		this.stats.results[this.row]++

		this.stats.streak++
		this.stats.lastWon = this.stats.lastPlayed

		if (this.stats.streak > this.stats.maxStreak) {
			this.stats.maxStreak = this.stats.streak
		}

		this.updateStats()
		this.state = 'won'

		let result = document.querySelector('.result')
		result.querySelector('.excl').innerHTML = "Fantastic!"
		result.querySelector('.solution').innerHTML = 'You guessed the word!'
		result.classList.remove('hidden')

		this.endGame()
	}

	/** @returns {void} */
	lose() {
		this.stats.streak = 0
		this.updateStats()
		this.state = 'lost'

		let result = document.querySelector('.result')
		result.querySelector('.excl').innerHTML = "What a pity!"
		result.querySelector('.solution').innerHTML = 'The word was <a href="https://www.google.com/search?q=define+' + this.realSecretWord + '" target="_blank"><b>' + this.realSecretWord.toUpperCase() + '</b></a>'
		result.classList.remove('hidden')

		this.endGame()
	}

	/** @returns {void} */
	endGame() {
		this.stats.tries = []
		this.stats.secret = ''
		this.updateStats()

		this.words[this.row].letters[this.col - 1].classList.remove('active')
		this.mobileKB.classList.add('end')
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	/** @returns {void} */
	loadStats() {
		let scores = document.querySelectorAll('.score')

		for (let i = 0; i < scores.length; i++) {
			if (scores[i].getAttribute('name') === 'wins') {
				if (this.stats.played == 0) {
					scores[i].textContent = '-'
				} else {
					scores[i].textContent = Math.round(this.stats.wins / this.stats.played * 100).toString()
				}
			} else {
				scores[i].textContent = this.stats[scores[i].getAttribute('name')]
			}
		}

		let barWrappers = document.querySelectorAll('.bar-wrapper');
		for (let i = 0; i < barWrappers.length; i++) {
			barWrappers[i].querySelector('p').innerHTML = this.stats.results[i].toString()
		}
	}

	/** @returns {void} */
	updateStats() {
		const errF = (reason) => {
			showError(
				'Unable to update Game Stats, retry later',
				['Unable to update Game Stats, response received: ', reason],
				true
			)
		}

		fetch('/en/data', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(this.stats)
		}).then(response => {
			if (response.status !== 200) {
				errF(response)
				return
			}
		}).catch(err => {
			errF(err)
			return
		})

		this.loadStats()
	}

	/** @returns {void} */
	showStats() {
		if (!panes.openPane('stats')) return

		let sum = 0

		/** @type {HTMLElement[]} */
		let bars = []
		document.querySelectorAll('.bar').forEach(/** @type {HTMLElement} */ e => bars.push(e))

		let maxScore = this.stats.results[0]
		let maxBar = bars[0]

		for (let i = 0; i < bars.length; i++) {
			let n = this.stats.results[i]
			sum += n

			if (n > maxScore) {
				maxScore = n
				maxBar = bars[i]
			}
		}

		if (sum === 0) {
			for (let i = 0; i < bars.length; i++) {
				bars[i].style.width = '0'
			}

			document.querySelector('.stats .total b').textContent = '0'
			return
		}

		document.querySelector('.stats .total b').textContent = sum.toString()

		maxBar.style.width = ''
		for (let i = 0; i < bars.length; i++) {
			if (bars[i] === maxBar) {
				continue
			}

			let newWidth = maxBar.offsetWidth / maxScore * this.stats.results[i]
			bars[i].style.width = newWidth + 'px'
		}
	}
}

/**
 * @param {string} str
 * @param {number} index
 * @param {string} chr
 * @returns {string}
 */
function setCharAt(str, index, chr) {
	if (index > str.length - 1 || index < 0 || chr.length !== 1) {
		return str
	}

	return str.substring(0, index) + chr + str.substring(index + 1)
}

/**
 * @param {string} text
 * @returns {string}
 */
function removeAccents(text) {
	let chars = text.split('')
	let res = ''

	chars.forEach((c) => {
		switch (c) {
			case 'à':
				res += 'a'
				break
			case 'é':
				res += 'e'
				break
			case 'è':
				res += 'e'
				break
			case 'ì':
				res += 'i'
				break
			case 'ò':
				res += 'o'
				break
			case 'ù':
				res += 'u'
				break
			default:
				res += c
		}
	})

	return res
}

/** @returns {void} */
function openHelp() {
	if (!panes.openPane('help')) {
		return
	}

	window.localStorage.setItem('hideHelp', 'false')
}

/** @returns {void} */
function closePanes() {
	panes.closePanes()
}

/** @type {HTMLButtonElement} */
const darkModeSwitch = document.querySelector('button.darkmode-switch')

darkModeSwitch.onclick = () => {
	if (document.body.classList.contains('dark')) {
		document.body.classList.remove('dark')
		localStorage.setItem('dark-mode', 'false')
	} else {
		document.body.classList.add('dark')
		localStorage.setItem('dark-mode', 'true')
	}
}

if (window.matchMedia && window.matchMedia('').addEventListener) {
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (e.matches && !document.body.classList.contains('dark')) {
			darkModeSwitch.click()
			return
		}
	
		if (!e.matches && document.body.classList.contains('dark')) {
			darkModeSwitch.click()
			return
		}
	})
	
	if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
		if (window.localStorage.getItem('dark-mode') != 'false') {
			darkModeSwitch.click()
		}
	} else {
		if (window.localStorage.getItem('dark-mode') == 'true') {
			darkModeSwitch.click()
		}
	}
}

window.setTimeout(() => {
	document.body.classList.add('ready')
}, 200)

let hideHelp = window.localStorage.getItem('hideHelp')
if (hideHelp == null || hideHelp == 'false') {
	openHelp()
	window.localStorage.setItem('hideHelp', 'true')
}

document.getElementById('openHelp').addEventListener('click', () => {
	openHelp()
})

/** @type {HTMLElement} */
let iconMenu = document.querySelector('.icon-menu')

iconMenu.querySelector('button').addEventListener('click', () => {
	iconMenu.classList.toggle('show')
})

let wordle = new Wordle()
wordle.init().then(
	document.getElementsByName('openStats').forEach(e => {
		e.addEventListener('click', () => {
			wordle.showStats()
		})
	})
)
