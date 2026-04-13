import './style.css'

// --- Web Audio API Synth ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  if (type === 'drop') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    // Начинаем с высокой частоты и быстро падаем (Plop/Drop эффект)
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

  } else if (type === 'bell') {
    // Звук колокольчика/чаши (несколько гармоник)
    const frequencies = [400, 800, 1200];
    frequencies.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5 / (index + 1), now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2); // Долгое затухание

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 2.5);
    });

  } else if (type === 'pulse') {
    // Двойной синтетический бип
    const playBeep = (time) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 600;

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.4, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.4);
    };

    playBeep(now);
    playBeep(now + 0.4);
  }
}


// --- App Logic ---
// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const waterLevel = document.getElementById('waterLevel');
const startBtn = document.getElementById('startBtn');
const intervalRange = document.getElementById('intervalRange');
const intervalValue = document.getElementById('intervalValue');
const soundChips = document.querySelectorAll('.sound-chip');
const testSoundBtn = document.getElementById('testSoundBtn');

// State
let isRunning = false;
let currentIntervalMin = parseInt(intervalRange.value, 10);
let timeRemainingSec = currentIntervalMin * 60;
let selectedSound = 'drop';

// Web Worker Timer
const timerWorker = new Worker('/worker.js');
timerWorker.onmessage = function(e) {
  if (e.data.type === 'tick') {
    updateTimer();
  }
};

// Initialization
function init() {
  // Load saved settings
  const savedInterval = localStorage.getItem('hydramind_interval');
  const savedSound = localStorage.getItem('hydramind_sound');

  if (savedInterval) {
    currentIntervalMin = parseInt(savedInterval, 10);
    intervalRange.value = currentIntervalMin;
    intervalValue.innerText = currentIntervalMin;
  }
  
  if (savedSound) {
    selectedSound = savedSound;
    updateSoundSelectionUI(selectedSound);
  }

  resetTimerDisplay();
}

function updateSoundSelectionUI(soundId) {
    soundChips.forEach(chip => {
        if (chip.dataset.sound === soundId) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function resetTimerDisplay() {
  timeRemainingSec = currentIntervalMin * 60;
  timerDisplay.innerText = formatTime(timeRemainingSec);
  waterLevel.style.height = '0%';
}

function updateTimer() {
  timeRemainingSec--;

  if (timeRemainingSec <= 0) {
    // Time's up!
    playSound(selectedSound);
    // Restart interval automatically
    timeRemainingSec = currentIntervalMin * 60;
  }

  timerDisplay.innerText = formatTime(timeRemainingSec);

  // Calculate water level percentage
  const totalSeconds = currentIntervalMin * 60;
  const elapsed = totalSeconds - timeRemainingSec;
  const percentage = (elapsed / totalSeconds) * 100;
  waterLevel.style.height = `${percentage}%`;
}


function toggleTimer() {
  // Разблокируем Audio контекст при первом взаимодействии пользователя
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (isRunning) {
    // Stop
    timerWorker.postMessage({ command: 'stop' });
    isRunning = false;
    startBtn.innerText = 'Старт';
    startBtn.classList.remove('running');
    resetTimerDisplay();
    intervalRange.disabled = false;
  } else {
    // Start
    isRunning = true;
    startBtn.innerText = 'Стоп';
    startBtn.classList.add('running');
    intervalRange.disabled = true; // Запрещаем менять интервал во время работы
    
    // Если еще не запущен, сразу обновляем
    timerDisplay.innerText = formatTime(timeRemainingSec);
    waterLevel.style.height = '0%';

    timerWorker.postMessage({ command: 'start' });
  }
}

// Event Listeners
intervalRange.addEventListener('input', (e) => {
  currentIntervalMin = parseInt(e.target.value, 10);
  intervalValue.innerText = currentIntervalMin;
  
  if (!isRunning) {
    resetTimerDisplay();
  }
  localStorage.setItem('hydramind_interval', currentIntervalMin.toString());
});

soundChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    selectedSound = e.target.dataset.sound;
    updateSoundSelectionUI(selectedSound);
    localStorage.setItem('hydramind_sound', selectedSound);
    playSound(selectedSound); // Даем послушать выбранный звук
  });
});

testSoundBtn.addEventListener('click', () => {
    playSound(selectedSound);
});

startBtn.addEventListener('click', toggleTimer);


// Run init on load
init();
