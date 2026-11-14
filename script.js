const boardElement = document.getElementById("board");
const difficultySelect = document.getElementById("difficulty");
const timeLimitInput = document.getElementById("timeLimit");

const timerElement = document.getElementById("timer");
const timerFill = document.getElementById("timerFill");

const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");

const numberPad = document.getElementById("numberPad");
const toastElement = document.getElementById("toast");

const modalOverlay = document.getElementById("modalOverlay");
const modalSymbol = document.getElementById("modalSymbol");
const modalEyebrow = document.getElementById("modalEyebrow");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");

const appLayout = document.getElementById("appLayout");

let solution = [];
let currentBoard = [];
let initialBoard = [];

let selectedCell = null;

let timeLeft = 0;
let totalTime = 0;
let timerInterval = null;

let gameEnded = false;
let toastTimeout = null;

const difficultySettings = {
    easy: {
        emptyCells: 35
    },
    medium: {
        emptyCells: 45
    },
    hard: {
        emptyCells: 52
    }
};

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function createEmptyBoard() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneBoard(board) {
    return board.map(row => [...row]);
}

function generateSolution() {
    const base = 3;
    const side = base * base;

    const pattern = (row, col) =>
        (base * (row % base) + Math.floor(row / base) + col) % side;

    const shuffleGroups = () => {
        const groups = shuffle([0, 1, 2]);

        return groups.flatMap(group =>
            shuffle([0, 1, 2]).map(item => group * 3 + item)
        );
    };

    const rows = shuffleGroups();
    const cols = shuffleGroups();
    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const board = createEmptyBoard();

    for (let row = 0; row < side; row++) {
        for (let col = 0; col < side; col++) {
            board[row][col] = numbers[pattern(rows[row], cols[col])];
        }
    }

    return board;
}
function isValid(board, row, col, number) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === number) return false;
        if (board[i][col] === number) return false;
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (board[r][c] === number) return false;
        }
    }

    return true;
}

function findEmptyCell(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                return [row, col];
            }
        }
    }

    return null;
}
function countSolutions(board) {
    const empty = findEmptyCell(board);

    if (!empty) return 1;

    const [row, col] = empty;
    let count = 0;

    for (let number = 1; number <= 9; number++) {
        if (!isValid(board, row, col, number)) continue;

        board[row][col] = number;

        count += countSolutions(board);

        board[row][col] = 0;

        if (count >= 2) return count;
    }

    return count;
}
function createPuzzle(fullBoard, numberOfEmptyCells) {
    const puzzle = cloneBoard(fullBoard);

    const positions = shuffle(
        Array.from({ length: 81 }, (_, index) => index)
    );

    let removed = 0;

    for (const position of positions) {
        if (removed >= numberOfEmptyCells) break;

        const row = Math.floor(position / 9);
        const col = position % 9;

        const previousValue = puzzle[row][col];

        puzzle[row][col] = 0;

        const testBoard = cloneBoard(puzzle);

        if (countSolutions(testBoard) === 1) {
            removed++;
        } else {
            puzzle[row][col] = previousValue;
        }
    }

    return puzzle;
}

function getTimeLimit() {
    const minutes = Number(timeLimitInput.value);

    if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 180
    ) {
        showToast("ENTER A TIME BETWEEN 1 AND 180 MINUTES");
        timeLimitInput.focus();
        return null;
    }

    return minutes * 60;
}

function startNewGame() {
    const selectedTime = getTimeLimit();

    // Do not start a new game if the time input is invalid.
    if (selectedTime === null) return;

    stopTimer();
    closeModal();

    gameEnded = false;
    selectedCell = null;

    const difficulty = difficultySelect.value;
    const settings = difficultySettings[difficulty];

    solution = generateSolution();

    currentBoard = createPuzzle(
        solution,
        settings.emptyCells
    );

    initialBoard = cloneBoard(currentBoard);

    totalTime = selectedTime;
    timeLeft = totalTime;

    renderBoard();
    updateProgress();
    updateTimerDisplay();
    startTimer();

    showToast("NEW PUZZLE GENERATED");
}

function renderBoard() {
    boardElement.innerHTML = "";

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement("button");

            cell.type = "button";
            cell.className = "cell";

            cell.dataset.row = row;
            cell.dataset.col = col;

            const value = currentBoard[row][col];

            cell.textContent = value === 0 ? "" : value;

            if (initialBoard[row][col] !== 0) {
                cell.classList.add("given");
            }

            cell.addEventListener("click", () => {
                selectCell(row, col);
            });

            boardElement.appendChild(cell);
        }
    }

    updateCellHighlights();
}

function getCellElement(row, col) {
    return boardElement.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
}


function selectCell(row, col) {
    if (gameEnded) return;

    selectedCell = { row, col };

    updateCellHighlights();
}

function updateCellHighlights() {
    const cells = boardElement.querySelectorAll(".cell");

    cells.forEach(cell => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);

        cell.classList.remove(
            "selected",
            "related",
            "same-number"
        );

        if (!selectedCell) return;

        const selectedRow = selectedCell.row;
        const selectedCol = selectedCell.col;

        const selectedValue =
            currentBoard[selectedRow][selectedCol];

        if (row === selectedRow && col === selectedCol) {
            cell.classList.add("selected");
        } else if (
            row === selectedRow ||
            col === selectedCol ||
            (
                Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
                Math.floor(col / 3) === Math.floor(selectedCol / 3)
            )
        ) {
            cell.classList.add("related");
        }

        if (
            selectedValue !== 0 &&
            currentBoard[row][col] === selectedValue
        ) {
            cell.classList.add("same-number");
        }
    });
}

/* =========================================
   ENTER NUMBER
========================================= */

function enterNumber(number) {
    if (gameEnded || !selectedCell) {
        showToast("SELECT A CELL FIRST");
        return;
    }

    const { row, col } = selectedCell;

    // Do not overwrite original puzzle numbers.
    if (initialBoard[row][col] !== 0) {
        showToast("THIS CELL CANNOT BE CHANGED");
        return;
    }

    currentBoard[row][col] = number;

    const cell = getCellElement(row, col);

    cell.textContent = number;
    cell.classList.remove("error", "correct-flash", "pop");
    void cell.offsetWidth;
    cell.classList.add("pop");

    updateProgress();
    updateCellHighlights();

    if (isBoardComplete()) {
        checkWin();
    }
}

/* =========================================
   ERASE CELL
========================================= */

function eraseCell() {
    if (gameEnded || !selectedCell) {
        showToast("SELECT A CELL FIRST");
        return;
    }

    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) {
        showToast("THIS CELL CANNOT BE ERASED");
        return;
    }

    currentBoard[row][col] = 0;

    const cell = getCellElement(row, col);

    cell.textContent = "";
    cell.classList.remove("error", "correct-flash", "pop");

    updateProgress();
    updateCellHighlights();
}


function updateProgress() {
    let emptyCells = 0;

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentBoard[row][col] === 0) {
                emptyCells++;
            }
        }
    }

    const filled = 81 - emptyCells;
    const percent = Math.round((filled / 81) * 100);

    progressText.textContent = `${filled} / 81`;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
}


function checkBoard() {
    if (gameEnded) return;

    let wrongCount = 0;

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = getCellElement(row, col);

            cell.classList.remove("error", "correct-flash");

            if (currentBoard[row][col] === 0) continue;
            if (initialBoard[row][col] !== 0) continue;

            if (currentBoard[row][col] !== solution[row][col]) {
                cell.classList.add("error");
                wrongCount++;
            } else {
                cell.classList.add("correct-flash");
            }
        }
    }

    if (wrongCount > 0) {
        showToast(`${wrongCount} INCORRECT CELL(S)`);
    } else if (isBoardComplete()) {
        checkWin();
    } else {
        showToast("ALL FILLED CELLS ARE CORRECT");
    }
}


function giveHint() {
    if (gameEnded) return;

    let target = selectedCell;

    if (
        !target ||
        currentBoard[target.row][target.col] !== 0 ||
        initialBoard[target.row][target.col] !== 0
    ) {
        const emptyCells = [];

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (currentBoard[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) {
            showToast("NO EMPTY CELLS");
            return;
        }

        target = emptyCells[
            Math.floor(Math.random() * emptyCells.length)
        ];
    }

    const { row, col } = target;

    selectedCell = { row, col };
    currentBoard[row][col] = solution[row][col];

    const cell = getCellElement(row, col);

    cell.textContent = solution[row][col];
    cell.classList.remove("error");
    cell.classList.add("correct-flash");

    updateCellHighlights();
    updateProgress();

    showToast("HINT ADDED");

    if (isBoardComplete()) {
        checkWin();
    }
}



function isBoardComplete() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentBoard[row][col] === 0) {
                return false;
            }
        }
    }

    return true;
}

function checkWin() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentBoard[row][col] !== solution[row][col]) {
                showToast("NOT QUITE RIGHT — KEEP TRYING");
                return;
            }
        }
    }

    gameEnded = true;
    stopTimer();

    showModal(
        "✦",
        "PUZZLE COMPLETE",
        "YOU DID IT!",
        "Great work! You solved the Sudoku puzzle."
    );

    createConfetti();
}

function startTimer() {
    stopTimer();

    timerInterval = setInterval(() => {
        if (gameEnded) return;

        timeLeft--;

        updateTimerDisplay();

        if (timeLeft <= 0) {
            timeLeft = 0;
            updateTimerDisplay();

            gameEnded = true;
            stopTimer();

            showModal(
                "⌛",
                "TIME IS UP",
                "GAME OVER",
                "The timer has ended. Start a new game and try again."
            );
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerElement.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const percentage = totalTime > 0
        ? (timeLeft / totalTime) * 100
        : 0;

    timerFill.style.width = `${percentage}%`;

    if (percentage <= 25) {
        timerElement.style.color = "#ef6666";
        timerFill.style.background = "#ef6666";
    } else {
        timerElement.style.color = "";
        timerFill.style.background = "";
    }
}

/* =========================================
   MODAL
========================================= */

function showModal(symbol, eyebrow, title, message) {
    modalSymbol.textContent = symbol;
    modalEyebrow.textContent = eyebrow;
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalOverlay.classList.add("show");
}

function closeModal() {
    modalOverlay.classList.remove("show");
}


function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toastElement.classList.remove("show");
    }, 2200);
}


function createConfetti() {
    const colors = [
        "#f97316",
        "#ffb36b",
        "#ffd166",
        "#ffffff",
        "#68c58a"
    ];

    for (let i = 0; i < 65; i++) {
        const piece = document.createElement("div");

        piece.style.position = "fixed";
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.top = "-15px";
        piece.style.width = `${5 + Math.random() * 6}px`;
        piece.style.height = `${8 + Math.random() * 8}px`;
        piece.style.background =
            colors[Math.floor(Math.random() * colors.length)];
        piece.style.borderRadius = "2px";
        piece.style.zIndex = "40";
        piece.style.pointerEvents = "none";

        document.body.appendChild(piece);

        const duration = 1800 + Math.random() * 1800;
        const horizontalMove = (Math.random() - 0.5) * 220;

        const animation = piece.animate(
            [
                {
                    transform: "translate(0, 0) rotate(0deg)",
                    opacity: 1
                },
                {
                    transform: `translate(${horizontalMove}px, 105vh) rotate(${Math.random() * 720}deg)`,
                    opacity: 0.2
                }
            ],
            {
                duration,
                easing: "ease-in",
                fill: "forwards"
            }
        );

        animation.onfinish = () => piece.remove();
    }
}

document.querySelectorAll(".nav-button[data-section]").forEach(button => {
    button.addEventListener("click", () => {
        const sectionId = button.dataset.section;

        document.querySelectorAll(".page-section").forEach(section => {
            section.classList.remove("active");
        });

        document.getElementById(sectionId).classList.add("active");

        document.querySelectorAll(".nav-button[data-section]").forEach(nav => {
            nav.classList.remove("active");
        });

        button.classList.add("active");
    });
});


document.getElementById("collapseButton").addEventListener("click", () => {
    appLayout.classList.toggle("sidebar-collapsed");
});


const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    const isLightMode =
        document.body.classList.contains("light-mode");

    themeIcon.textContent = isLightMode ? "☾" : "☼";
    themeLabel.textContent = isLightMode ? "DARK MODE" : "LIGHT MODE";
});


numberPad.addEventListener("click", event => {
    const button = event.target.closest(".number-button");

    if (!button) return;

    const number = Number(button.dataset.number);

    enterNumber(number);
});


document.getElementById("newGameButton")
    .addEventListener("click", startNewGame);

document.getElementById("restartButton")
    .addEventListener("click", () => {
        if (gameEnded) {
            startNewGame();
            return;
        }

        currentBoard = cloneBoard(initialBoard);
        selectedCell = null;

        timeLeft = totalTime;

        stopTimer();

        renderBoard();
        updateProgress();
        updateTimerDisplay();
        startTimer();

        showToast("PUZZLE RESTARTED");
    });

document.getElementById("eraseButton")
    .addEventListener("click", eraseCell);

document.getElementById("hintButton")
    .addEventListener("click", giveHint);

document.getElementById("checkButton")
    .addEventListener("click", checkBoard);

difficultySelect.addEventListener("change", startNewGame);

document.getElementById("modalNewGameButton")
    .addEventListener("click", startNewGame);


timeLimitInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        startNewGame();
    }
});


document.addEventListener("keydown", event => {
 
    const tag = event.target.tagName;

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
    ) {
        return;
    }

    if (gameEnded) return;

    if (event.key >= "1" && event.key <= "9") {
        enterNumber(Number(event.key));
        return;
    }

    if (
        event.key === "Backspace" ||
        event.key === "Delete"
    ) {
        event.preventDefault();
        eraseCell();
        return;
    }

    if (!selectedCell) return;

    let { row, col } = selectedCell;

    switch (event.key) {
        case "ArrowUp":
            row = Math.max(0, row - 1);
            break;

        case "ArrowDown":
            row = Math.min(8, row + 1);
            break;

        case "ArrowLeft":
            col = Math.max(0, col - 1);
            break;

        case "ArrowRight":
            col = Math.min(8, col + 1);
            break;

        default:
            return;
    }

    event.preventDefault();
    selectCell(row, col);
});


function getYouTubeEmbedUrl(input) {
    try {
        const url = new URL(input.trim());

        const hostname = url.hostname
            .toLowerCase()
            .replace(/^www\./, "");

        const isYouTube = [
            "youtube.com",
            "m.youtube.com",
            "music.youtube.com"
        ].includes(hostname);

        const isShortLink = hostname === "youtu.be";

        if (!isYouTube && !isShortLink) {
            return null;
        }

        const playlistId = url.searchParams.get("list");

        if (
            playlistId &&
            /^[a-zA-Z0-9_-]+$/.test(playlistId)
        ) {
            return `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
        }

        let videoId = null;

        if (isShortLink) {
            videoId = url.pathname.split("/").filter(Boolean)[0];
        } else if (url.pathname === "/watch") {
            videoId = url.searchParams.get("v");
        } else if (
            url.pathname.startsWith("/embed/") ||
            url.pathname.startsWith("/shorts/")
        ) {
            videoId = url.pathname.split("/")[2];
        }

        if (
            !videoId ||
            !/^[a-zA-Z0-9_-]{11}$/.test(videoId)
        ) {
            return null;
        }

        return `https://www.youtube.com/embed/${videoId}`;

    } catch {
        return null;
    }
}


function getSpotifyEmbedUrl(input) {
    try {
        const url = new URL(input.trim());

        const hostname = url.hostname
            .toLowerCase()
            .replace(/^www\./, "");

        if (hostname !== "open.spotify.com") {
            return null;
        }

        const parts = url.pathname
            .split("/")
            .filter(Boolean);

        if (parts[0] === "embed") {
            return url.origin + url.pathname;
        }

        const allowedTypes = [
            "playlist",
            "album",
            "track",
            "episode",
            "show"
        ];

        if (
            !allowedTypes.includes(parts[0]) ||
            !parts[1]
        ) {
            return null;
        }

        return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;

    } catch {
        return null;
    }
}


function loadPlaylist() {
    const input = document.getElementById("playlistUrl");
    const player = document.getElementById("musicPlayer");

    const link = input.value.trim();

    if (!link) {
        showToast("PASTE A MUSIC LINK FIRST");
        return;
    }

    const embedUrl =
        getYouTubeEmbedUrl(link) ||
        getSpotifyEmbedUrl(link);

    if (!embedUrl) {
        showToast("INVALID YOUTUBE OR SPOTIFY LINK");
        return;
    }

    player.innerHTML = "";

    const iframe = document.createElement("iframe");

    iframe.src = embedUrl;
    iframe.title = "Music Player";
    iframe.allow =
        "autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    player.appendChild(iframe);

    showToast("MUSIC PLAYER LOADED");
}

document.getElementById("loadPlaylistButton")
    .addEventListener("click", loadPlaylist);

document.getElementById("playlistUrl")
    .addEventListener("keydown", event => {
        if (event.key === "Enter") {
            loadPlaylist();
        }
    });


startNewGame();