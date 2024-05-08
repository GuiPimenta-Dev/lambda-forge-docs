# Creating a Guess the Number Game with DynamoDB

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Document</title>
		<script src="https://cdn.tailwindcss.com"></script>
		<script
			src="https://kit.fontawesome.com/d11f1e78f0.js"
			crossorigin="anonymous"
		></script>
	</head>
	<body class="200">
		<main
			id="set-range-page"
			class=" bg-white py-4 px-2 h-[300px] flex flex-col justify-around"
		>
			<p class="font-bold text-xl text-center">
				Type the range number you want to guess:
			</p>
			<div
				class="font-medium text-lg flex mt-2 gap-1 items-center justify-center"
			>
				<p>1 -</p>
				<p id="range-value"></p>
			</div>
			<input type="range" min="2" max="30" value="10" id="slider" />
			<button
				id="send-range-button"
				class="mx-auto p-2 px-12 rounded-lg text-white font-medium flex items-center gap-2 bg-blue-500"
			>
				SEND RANGE
			</button>
		</main>
		<main
			id="guess-page"
			class=" relative bg-white py-4 px-2 h-[300px] hidden flex-col gap-4 items-center"
		>
			<div class="w-full">
				<p
					id="go-back"
					class="text-blue-500 mb-6 text-sm font-semibold cursor-pointer"
				>
					<i class="fa-solid fa-chevron-left"></i>
					Change the range
				</p>
    			<p class="text-center mb-4 font-bold text-xl w-2/3 mx-auto">
    				Type the number you want to guess between 1 and <span id="range-p"></span>: 
    			</p>
    		</div>
    		<div class="relative">
    			<p id="guess-tip" class="text-red-500 font-semibold mb-1"></p>
    			<input
    				id="number-input"
    				min="1"
    				type="number"
    				placeholder="Example: 4"
    				class="p-2 rounded-lg border border-black bg-gray-100"
    			/>
    		</div>
    		<button
    			id="send-button"
    			class="mb-6 mx-auto p-2 px-12 rounded-lg text-white font-medium flex items-center gap-2 bg-blue-500"
    		>
    			SEND NUMBER
    			<i class="fa-solid fa-paper-plane"></i>
    		</button>
    		<div
    			id="congratulaion-modal"
    			class="absolute hidden top-0 left-0 w-full h-full z-0 bg-gray-300/70"
    		>
    			<div class="bg-white shadow-lg w-2/3 m-auto p-6 relative">
    				<div class="flex flex-col gap-2 items-center">
    					<p class="font-bold text-lg">Congratulations!</p>
    					<p class="font-medium text-center">
    						You found out the correct number!
    					</p>
    					<button
    						id="play-again-button"
    						class="mx-auto p-2 px-12 rounded-lg text-white font-medium flex items-center gap-2 bg-green-500"
    					>
    						PLAY AGAIN
    					</button>
    				</div>
    			</div>
    		</div>
    	</main>
    </body>
    <style>
    	#slider {
    		-webkit-appearance: none;
    		width: 85%;
    		margin: 0 auto;
    		height: 5px;
    		background: #d3d3d3;
    		outline: none;
    		opacity: 0.7;
    		-webkit-transition: 0.2s;
    		transition: opacity 0.2s;
    		margin-bottom: 24px;
    	}

    	#slider:hover {
    		opacity: 1;
    	}

    	#slider::-webkit-slider-thumb {
    		-webkit-appearance: none;
    		appearance: none;
    		width: 25px;
    		height: 25px;
    		background: rgba(59, 130, 246, 1);
    		cursor: pointer;
    		border-radius: 100%;
    	}

    	#slider::-moz-range-thumb {
    		width: 30px;
    		height: 30px;
    		background: rgba(59, 130, 246, 1);
    		cursor: pointer;
    	}
    </style>
    <script>
    	const rangeValue = document.getElementById('range-value');
    	const slider = document.getElementById('slider');
    	const numberInput = document.getElementById('number-input');

    	rangeValue.innerHTML = slider.value;
    	slider.oninput = function () {
    		rangeValue.innerHTML = this.value;
    	};

    	const setRangePage = document.getElementById('set-range-page');
    	const guessPage = document.getElementById('guess-page');

    	const sendRangeButton = document.getElementById('send-range-button');

    	var gameId = '';
    	const rangeP = document.getElementById('range-p');

    	const sendRangeNumber = () => {
    		rangeP.innerHTML = slider.value;
    		fetch('https://api.lambda-forge.com/dev/games', {
    			method: 'POST',
    			headers: { 'Content-Type': 'application/json' },
    			body: JSON.stringify({
    				min_number: 1,
    				max_number: Number(slider.value),
    			}),
    		})
    			.then((response) => response.json())
    			.then((data) => {
    				gameId = data.game_id;
    				console.log(gameId);
    				setRangePage.style.display = 'none';
    				guessPage.style.display = 'flex';
    			})
    			.catch((error) => {
    				console.error('Error:', error);
    			});
    	};

    	const rangeHandler = () => {
    		sendRangeNumber();
    	};

    	sendRangeButton.addEventListener('click', rangeHandler);

    	const goBack = document.getElementById('go-back');

    	const goBackFunction = () => {
    		setRangePage.style.display = 'flex';
    		guessPage.style.display = 'none';
    	};
    	goBack.addEventListener('click', goBackFunction);

    	const sendButton = document.getElementById('send-button');
    	const numberGuessed = document.getElementById('number-input');
    	const guessTip = document.getElementById('guess-tip');
    	const congratulaionModal = document.getElementById('congratulaion-modal');

    	const sendGuess = () => {
    		const BASE_URL = `https://api.lambda-forge.com/dev/games/${gameId}?guess=${numberGuessed.value}`;
    		console.log(BASE_URL);
    		var options = {
    			method: 'GET',
    			headers: {
    				'Content-Type': 'application/json',
    			},
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
    				answer = data.answer;
    				if (answer == 'higher') {
    					guessTip.innerHTML = 'Wrong number. Try a higher one!';
    				}
    				if (answer == 'lower') {
    					guessTip.innerHTML = 'Wrong number. Try a lower one!';
    				}
    				if (answer == 'correct') {
    					congratulaionModal.style.display = 'flex';
    				}
    			})
    			.catch((error) => {
    				console.error('Erro na requisição:', error);
    			});
    	};

    	const sendNumberHandler = () => {
    		if (!numberGuessed.value) {
    			return;
    		}
    		guessTip.innerHTML = '';
    		sendGuess();
    		numberGuessed.value = '';
    	};

    	numberGuessed.addEventListener('', sendNumberHandler);
    	sendButton.addEventListener('click', sendNumberHandler);

    	const playAgain = document.getElementById('play-again-button');
    	playAgain.addEventListener('click', () => {
    		slider.value = 10;
    		rangeValue.innerHTML = 10;
    		congratulaionModal.style.display = 'none';

    		goBackFunction();
    	});
    </script>

</html>
