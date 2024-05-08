const target_url =
	'https://public-lambda-forge-logo.s3.us-east-2.amazonaws.com/wNSN2U7n9NiAKEItWlsrcdJ0RWFyZOmbNvsc6Kht84WsWVxuBz5O.png';
const input = document.getElementById('text-input');
const resultDiv = document.getElementById('result-div');
const shortUrl = document.getElementById('short-url');
const sendButton = document.getElementById('send-button');

const sendURL = () => {
	console.log('ola');
	const BASE_URL = 'https://api.lambda-forge.com/dev/urls';
	var options = {
		method: 'POST',

		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		},
		body: JSON.stringify({ url: input.value }),
	};
	console.log(input.value);
	resultDiv.innerHTML = '<span class="loader"></span>';
	fetch(BASE_URL, options)
		.then((response) => {
			if (!response.ok) {
				throw new Error('Erro na requisição: ' + response.status);
			}
			return response.json();
		})		.then((data) => {
			console.log('Resposta da API:', data);
			resultDiv.innerHTML = `	<div id="url-div" class="w-full">
	<p class="text-gray-700 font-bold pb-2 text-xl">Here your new url:</p>
	<div class="p-2 py-6 bg-gray-100 group relative">
		<button
			id="copy-button"
			class="hiden group-hover:block transition flex gap-2 items-center absolute right-4 top-2 text-gray-500 hover:text-blue-500 cursor-pointer"
		>

			<i class="fa-regular fa-clipboard text-xl"></i>
		</button>
		<a id="short-url" class="text-blue-500 font-medium cursor-pointer">
		https://api.lambda-forge.com/dev/bc23d3
		</a>
	</div>
</div>`;
		})
		.catch((error) => {
			console.error('Erro na requisição:', error);
			resultDiv.innerHTML =
				"<p id='empy-url' class='text-gray-400 font-medium'>You havnt write any URL</p>";
		})
		.finally(() => {
			resultDiv.innerHTML = `	<div id="url-div" class="w-full">
	<p class="text-gray-700 font-bold pb-2 text-xl">Here your new url:</p>
	<div class="p-2 py-6 bg-gray-100 group relative">
		<button
			id="copy-button"
			class="hiden group-hover:block transition flex gap-2 items-center absolute right-4 top-2 text-gray-500 hover:text-blue-500 cursor-pointer"
		>

			<i class="fa-regular fa-clipboard text-xl"></i>
		</button>
		<a id="short-url" class="text-blue-500 font-medium cursor-pointer">
		https://api.lambda-forge.com/dev/bc23d3
		</a>
	</div>
</div>`;
		});
	input.value = '';
};
sendButton.addEventListener('click', sendURL);

const copyLink = () => {
	const text = 'https://api.lambda-forge.com/dev/bc23d3';
	navigator.clipboard.writeText(text);
};
const copyButton = document.getElementById('copy-button');
copyButton.addEventListener('click', copyLink);

const BASE_URL = 'https://api.lambda-forge.com/dev/urls';
var options = {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({ url: input.value }),
};

fetch(BASE_URL, options)
	.then((response) => {
		if (!response.ok) {
			throw new Error('Erro na requisição: ' + response.status);
		}
		return response.json();
	})
	.then((data) => {
		console.log('Resposta da API:', data);
	})
	.catch((error) => {
		console.error('Erro na requisição:', error);
	});
