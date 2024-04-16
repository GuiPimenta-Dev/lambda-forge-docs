const BASE_URL = 'wss://2clnav84i7.execute-api.us-east-2.amazonaws.com/dev/';

// SOCKET 1
const sendButton1 = document.getElementById('sendMessage1');
const idName1 = document.getElementById('ïd1');
sendButton1.addEventListener('click', sendMessage1);
let id1;

const socket1 = new WebSocket(BASE_URL);

socket1.onopen = function (event) {
	console.log('Conexão estabelecida.');
};

socket1.onmessage = function (event) {
	console.log('Mensagem recebida:', event.data);
	const data = JSON.parse(event.data);
	if (data.connection_id) {
		id1 = data.connection_id;
		idName1.innerText = id1;
		return;
	}

	const messagesDiv = document.querySelector('#messages1');

	messageReader(id1, data.sender_id, messagesDiv, data.message);
};

socket1.onerror = function (error) {
	console.error('Erro na conexão WebSocket:', error);
};

socket1.onclose = function (event) {
	if (event.wasClean) {
		console.log('Conexão fechada corretamente.');
	} else {
		console.error('Conexão fechada com erro.');
	}
	console.log('Código do fechamento:', event.code, 'Motivo:', event.reason);
};

function sendMessage1() {
	const messageInput = document.getElementById('messageInput1');
	const messageText = messageInput.value;
	const message = {
		action: 'sendMessage',
		message: messageText,
		recipient_id: id2,
	};

	const stringMessage = JSON.stringify(message);
	console.log(stringMessage);
	if (messageText.trim() !== '') {
		console.log(stringMessage);
		socket1.send(stringMessage);
		messageInput.value = '';
	} else {
		alert('Write a message');
	}
}

const messageReader = (myId, senderId, selector, text) => {
	console.log(myId, senderId);
	const newListItem = document.createElement('li');
	newListItem.classList.add('mb-2', 'flex', 'gap-2', 'false');
	if (myId == senderId) {
		newListItem.classList.add('flex-row-reverse');
		newListItem.innerHTML = `
		<div class="bg-blue-400 hidden w-9 h-9 rounded-full"></div>
							<div
								class="self-end max-w-[93%] mt-4 p-3 rounded-b-2xl rounded-tl-2xl bg-blue-300/30"
							>
								<p class="text-[15px]">
									${text}
								</p>
								<p class="text-end mt-1 text-[12px] font-medium text-gray-500">
									24/05/06
								</p>
							</div>`;
	} else {
		newListItem.innerHTML = `
		<div class="bg-orange-400 hidden w-9 h-9 rounded-full"></div>
		<div
		class="self-end max-w-[93%] mt-4 p-3 rounded-b-2xl rounded-tr-2xl bg-orange-300/30"
		>
		<p class="text-[15px]">
		${text}
		</p>
		<p class="text-end mt-1 text-[12px] font-medium text-gray-500">
		24/05/06
		</p>
		</div>`;
	}
	selector.appendChild(newListItem);
};

// SOCKET 2
const sendButton2 = document.getElementById('sendMessage2');
sendButton2.addEventListener('click', sendMessage2);
const idName2 = document.getElementById('id2');

const socket2 = new WebSocket(BASE_URL);
let id2;

socket2.onopen = function (event) {
	console.log('Conexão estabelecida.');
};

socket2.onmessage = function (event) {
	console.log('Mensagem recebida:', event.data);
	const data = JSON.parse(event.data);
	console.log(data);
	if (data.connection_id) {
		id2 = data.connection_id;
		idName2.innerText = id2;
		return;
	}

	const messagesDiv = document.querySelector('#messages2');

	messageReader(id2, data.sender_id, messagesDiv, data.message);
};

socket2.onerror = function (error) {
	console.error('Erro na conexão WebSocket:', error);
};

socket2.onclose = function (event) {
	if (event.wasClean) {
		console.log('Conexão fechada corretamente.');
	} else {
		console.error('Conexão fechada com erro.');
	}
	console.log('Código do fechamento:', event.code, 'Motivo:', event.reason);
};

function sendMessage2() {
	const messageInput = document.getElementById('messageInput2');
	const messageText = messageInput.value;
	const message = {
		action: 'sendMessage',
		message: messageText,
		recipient_id: id1,
	};
	const stringMessage = JSON.stringify(message);
	if (messageText.trim() !== '') {
		console.log(stringMessage);
		socket2.send(stringMessage);
		messageInput.value = '';
	} else {
		alert('Write a message');
	}
}
