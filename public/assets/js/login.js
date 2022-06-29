let loginForm = document.getElementById('loginForm')
let loginError = document.getElementById('loginError')
let loginLoading = loginForm.querySelector('.flip-to-square-random')

loginForm.addEventListener('submit', ev => {
	ev.preventDefault()

	/**
	 * @typedef {Object} Cred
	 * @property {string} email
	 * @property {string} password
	 */
	/** @type {Cred} */
	let cred = {
		email: loginForm.querySelector('input[name="email"]').value,
		password: loginForm.querySelector('input[name="password"]').value
	}

	let done = false
	let abortController = new AbortController()
	
	let mouseEvent = (ev) => {
		loginLoading.style.top = ev.pageY + 'px'
		loginLoading.style.left = ev.pageX + 'px'
	}
	loginLoading.style.opacity = 1
	document.addEventListener('mousemove', mouseEvent)

	loginError.classList.add('hidden')
	let finishRequest = () => {
		done = true
		document.removeEventListener('mousemove', mouseEvent)
		loginLoading.style = ''
		loginLoading.style.opacity = 0
	}

	fetch('/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(cred),
		signal: abortController.signal
	}).then(response => {
		finishRequest()

		if (response.status !== 200) {
			loginError.textContent = 'Email o Password non corrette'
			loginError.classList.remove('hidden')
			return
		}

		location.reload()
	}).catch(() => {
		finishRequest()

		loginError.textContent = 'Errore: riprovare più tardi'
		loginError.classList.remove('hidden')
	})

	setTimeout(() => {
		if (done)
			return
		
		abortController.abort()
	}, 5000)
})

let registrationForm = document.getElementById('registrationForm')
let registrationError = document.getElementById('registrationError')
let registrationLoading = registrationForm.querySelector('.flip-to-square-random')

registrationForm.addEventListener('submit', ev => {
	ev.preventDefault()

	/**
	 * @typedef {Object} Cred
	 * @property {string} email
	 * @property {string} password
	 * @property {string} confirmPassword
	 */
	/** @type {Cred} */
	let cred = {
		email: registrationForm.querySelector('input[name="email"]').value,
		password: registrationForm.querySelector('input[name="password"]').value,
		confirmPassword: registrationForm.querySelector('input[name="confirm-password"]').value
	}

	if (cred.password !== cred.confirmPassword) {
		registrationError.textContent = 'Le password non coincidono'
		registrationError.classList.remove('hidden')
		return
	}

	let done = false
	let abortController = new AbortController()
	
	let mouseEvent = (ev) => {
		registrationLoading.style.top = ev.pageY + 'px'
		registrationLoading.style.left = ev.pageX + 'px'
	}
	registrationLoading.style.opacity = 1
	document.addEventListener('mousemove', mouseEvent)

	registrationError.classList.add('hidden')
	let finishRequest = () => {
		done = true
		document.removeEventListener('mousemove', mouseEvent)
		registrationLoading.style = ''
		registrationLoading.style.opacity = 0
	}

	fetch('/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(cred),
		signal: abortController.signal
	}).then(async response => {
		finishRequest()

		if (response.status !== 200) {
			registrationError.textContent = await response.text()
			registrationError.classList.remove('hidden')
			return
		}

		location.reload()
	}).catch(() => {
		finishRequest()

		registrationError.textContent = 'Errore: riprovare più tardi'
		registrationError.classList.remove('hidden')
	})

	setTimeout(() => {
		if (done)
			return
		
		abortController.abort()
	}, 5000)
})

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

window.setTimeout(() => {
	document.body.classList.add('ready')
}, 200)
