// 全局变量
let players = [];
let pot = 0;
let gameStarted = false;
let gameHistory = [];
let lastBetAmount = 0;
let currentDealer = null;
let currentPlayerIndex = 0;

// 游戏状态变量
let gameInProgress = false;
let currentRound = 1; // 1-4轮下注
let currentBetInRound = 0; // 当前轮次的最高下注
let playersInHand = []; // 参与本局的玩家
let playerActions = []; // 玩家行动记录
let roundComplete = false;

// 添加玩家
function addPlayer() {
    const playerName = document.getElementById('playerName').value.trim();
    const initialChips = parseInt(document.getElementById('initialChips').value);
    
    if (!playerName) {
        alert('请输入玩家姓名！');
        return;
    }
    
    if (players.some(p => p.name === playerName)) {
        alert('玩家姓名已存在！');
        return;
    }
    
    if (isNaN(initialChips) || initialChips <= 0) {
        alert('请输入有效的初始筹码数量！');
        return;
    }
    
    players.push({
        name: playerName,
        chips: initialChips,
        eliminated: false
    });
    
    document.getElementById('playerName').value = '';
    
    // 更新显示和选择框
    if (gameStarted) {
        updatePlayersDisplay();
    }
    updatePlayerSelects();
}

// 开始游戏
function startGame() {
    if (players.length < 2) {
        alert('至少需要2名玩家才能开始游戏！');
        return;
    }
    
    document.getElementById('playersSection').style.display = 'block';
    gameStarted = true;
    updatePlayersDisplay();
    updatePlayerSelects();
    addToHistory('游戏开始！');
}

// 更新玩家显示
function updatePlayersDisplay() {
    const playersDiv = document.getElementById('playersGrid');
    playersDiv.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-card ${player.eliminated ? 'eliminated' : ''}`;
        
        // 如果玩家弃牌，添加弃牌效果
        const playerInHand = playersInHand.find(p => p.name === player.name);
        if (playerInHand && playerInHand.folded) {
            playerDiv.classList.add('folded');
        }
        
        const statusText = player.eliminated ? ' (已淘汰)' : '';
        const foldedText = playerInHand && playerInHand.folded ? ' (已弃牌)' : '';
        const dealerText = player.name === currentDealer ? ' 🎯' : '';
        
        playerDiv.innerHTML = `
            <div class="player-name">${player.name}${dealerText}${statusText}${foldedText}</div>
            <div class="player-chips">${player.chips} 筹码</div>
        `;
        
        playersDiv.appendChild(playerDiv);
    });
}

// 更新玩家选择框
function updatePlayerSelects() {
    const winnerSelect = document.getElementById('winner');
    const dealerSelect = document.getElementById('dealerSelect');
    
    // 清空选项
    if (winnerSelect) {
        winnerSelect.innerHTML = '<option value="">选择获胜者</option>';
    }
    if (dealerSelect) {
        dealerSelect.innerHTML = '<option value="">选择庄家</option>';
    }
    
    // 添加所有未淘汰玩家到选择框
    players.filter(p => !p.eliminated).forEach(player => {
        // 获胜者选择框
        if (winnerSelect) {
            const winnerOption = document.createElement('option');
            winnerOption.value = player.name;
            winnerOption.textContent = player.name;
            winnerSelect.appendChild(winnerOption);
        }
        
        // 庄家选择框
        if (dealerSelect) {
            const dealerOption = document.createElement('option');
            dealerOption.value = player.name;
            dealerOption.textContent = player.name;
            if (player.name === currentDealer) {
                dealerOption.selected = true;
            }
            dealerSelect.appendChild(dealerOption);
        }
    });
}

// 注意：transferChips, callBet, raiseBet 函数已被移除，因为手动筹码转移功能已被删除

// 获取当前轮次最高投注金额
function getCurrentMaxBet() {
    // 获取当前轮次所有玩家的投注记录
    const currentRoundActions = playerActions.filter(action => 
        action.round === currentRound && 
        action.action !== 'fold' && 
        action.action !== 'check'
    );
    
    if (currentRoundActions.length === 0) {
        return 0;
    }
    
    // 找出最高投注金额
    const maxBet = Math.max(...currentRoundActions.map(action => action.betAmount));
    return maxBet;
}

// 设置庄家并收取盲注
function setDealerAndBlinds() {
    const dealerName = document.getElementById('dealerSelect').value;
    
    if (!dealerName) {
        alert('请选择庄家！');
        return;
    }
    
    currentDealer = dealerName;
    
    // 找到庄家在玩家列表中的位置
    const activePlayers = players.filter(p => !p.eliminated);
    const dealerIndex = activePlayers.findIndex(p => p.name === dealerName);
    
    if (dealerIndex === -1) {
        alert('庄家不在活跃玩家列表中！');
        return;
    }
    
    // 庄家后第一人（小盲注）
    const smallBlindIndex = (dealerIndex + 1) % activePlayers.length;
    const smallBlindPlayer = activePlayers[smallBlindIndex];
    
    // 庄家后第二人（大盲注）
    const bigBlindIndex = (dealerIndex + 2) % activePlayers.length;
    const bigBlindPlayer = activePlayers[bigBlindIndex];
    
    // 启动正式游戏流程
    gameInProgress = true;
    currentRound = 1;
    currentBetInRound = 0; // 初始化为0，将通过getCurrentMaxBet()动态计算
    playersInHand = [...activePlayers];
    playerActions = [];
    roundComplete = false;
    
    addToHistory('正式游戏开始！');
    
    // 检查筹码是否足够
    if (smallBlindPlayer.chips < 10) {
        alert(`${smallBlindPlayer.name} 筹码不足以支付小盲注（10筹码）！`);
        return;
    }
    
    if (bigBlindPlayer.chips < 20) {
        alert(`${bigBlindPlayer.name} 筹码不足以支付大盲注（20筹码）！`);
        return;
    }
    
    // 扣除盲注
    smallBlindPlayer.chips -= 10;
    bigBlindPlayer.chips -= 20;
    pot += 30;
    
    // 记录盲注到playerActions数组
    playerActions.push({
        player: smallBlindPlayer.name,
        action: 'small_blind',
        round: currentRound,
        betAmount: 10
    });
    
    playerActions.push({
        player: bigBlindPlayer.name,
        action: 'big_blind',
        round: currentRound,
        betAmount: 20
    });
    
    // 设置当前玩家为大盲注后的下一个玩家（从大盲注后开始选择）
    const firstPlayerIndex = (bigBlindIndex + 1) % activePlayers.length;
    currentPlayerIndex = firstPlayerIndex;
    
    // 更新最后下注金额为大盲注
    lastBetAmount = 20;
    
    // 添加历史记录
    addToHistory(`设置庄家：${dealerName}`);
    addToHistory(`${smallBlindPlayer.name} 支付小盲注 10 筹码`);
    addToHistory(`${bigBlindPlayer.name} 支付大盲注 20 筹码`);
    
    // 检查玩家是否被淘汰
    if (smallBlindPlayer.chips === 0) {
        smallBlindPlayer.eliminated = true;
        addToHistory(`${smallBlindPlayer.name} 筹码耗尽，被淘汰！`);
    }
    
    if (bigBlindPlayer.chips === 0) {
        bigBlindPlayer.eliminated = true;
        addToHistory(`${bigBlindPlayer.name} 筹码耗尽，被淘汰！`);
    }
    
    // 更新显示
    updatePlayersDisplay();
    updatePlayerSelects();
    updatePotDisplay();
    
    // 检查游戏是否结束
    checkGameEnd();
    
    // 显示游戏操作界面
    document.getElementById('gameControls').style.display = 'block';
    
    // 启动游戏轮次
    startGameRound();
}

// 启动游戏轮次
function startGameRound() {
    if (!gameInProgress) return;
    
    // 更新游戏信息显示
    updateGameInfo();
    
    // 设置当前玩家
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    if (activePlayersInHand.length <= 1) {
        endGameRound();
        return;
    }
    
    // 显示当前玩家
    const currentPlayer = activePlayersInHand[currentPlayerIndex % activePlayersInHand.length];
    document.getElementById('currentPlayerName').textContent = currentPlayer.name;
    
    // 检查是否所有玩家都已行动
    checkRoundComplete();
}

// 更新游戏信息显示
function updateGameInfo() {
    document.getElementById('currentRound').textContent = currentRound;
    const currentMaxBet = getCurrentMaxBet();
    document.getElementById('currentBetAmount').textContent = currentMaxBet;
    // 同步更新currentBetInRound变量
    currentBetInRound = currentMaxBet;
}

// 检查轮次是否完成
function checkRoundComplete() {
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    
    // 如果只剩一个玩家，直接结束
    if (activePlayersInHand.length <= 1) {
        endGameRound();
        return;
    }
    
    // 检查是否所有活跃玩家都已行动
    const playersWhoActed = playerActions.filter(action => action.round === currentRound && !action.folded);
    const activePlayerNames = activePlayersInHand.map(p => p.name);
    const actedPlayerNames = playersWhoActed.map(action => action.player);
    
    // 检查是否所有活跃玩家都已行动
    const allPlayersActed = activePlayerNames.every(name => actedPlayerNames.includes(name));
    
    if (allPlayersActed) {
        // 检查所有玩家的投注是否持平
        const playerBets = new Map();
        
        // 初始化所有玩家的投注为0
        activePlayersInHand.forEach(player => {
            playerBets.set(player.name, 0);
        });
        
        // 累计每个玩家在当前轮次的总投注
        playersWhoActed.forEach(action => {
            if (action.action !== 'check' && action.action !== 'fold') {
                playerBets.set(action.player, action.betAmount);
            }
        });
        
        // 检查所有玩家投注是否相等
        const betAmounts = Array.from(playerBets.values());
        const maxBet = Math.max(...betAmounts);
        const allBetsEqual = betAmounts.every(bet => bet === maxBet);
        
        if (allBetsEqual) {
            nextRound();
        }
    }
}

// 进入下一轮
function nextRound() {
    currentRound++;
    currentBetInRound = 0;
    playerActions = [];
    currentPlayerIndex = 0;
    
    if (currentRound > 4) {
        endGameRound();
    } else {
        addToHistory(`第 ${currentRound} 轮下注开始`);
        startGameRound();
    }
}

// 结束游戏轮次
function endGameRound() {
    gameInProgress = false;
    addToHistory('本局游戏结束，请分配底池');
    
    // 隐藏游戏控制界面
    document.getElementById('gameControls').style.display = 'none';
    
    // 重置游戏状态
    playersInHand.forEach(player => {
        delete player.folded;
    });
}

// 玩家弃牌
function playerFold() {
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    const currentPlayer = activePlayersInHand[currentPlayerIndex % activePlayersInHand.length];
    
    // 标记玩家弃牌
    const playerInGame = playersInHand.find(p => p.name === currentPlayer.name);
    playerInGame.folded = true;
    
    addToHistory(`${currentPlayer.name} 弃牌`);
    
    // 记录行动
    playerActions.push({
        player: currentPlayer.name,
        action: 'fold',
        round: currentRound,
        betAmount: 0,
        folded: true
    });
    
    // 更新玩家显示（添加弃牌效果）
    updatePlayersDisplay();
    
    // 检查是否只剩一个玩家
    const remainingPlayers = playersInHand.filter(p => !p.eliminated && !p.folded);
    if (remainingPlayers.length <= 1) {
        endGameRound();
        return;
    }
    
    nextPlayer();
}

// 玩家跳过
function playerCheck() {
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    const currentPlayer = activePlayersInHand[currentPlayerIndex % activePlayersInHand.length];
    
    const currentMaxBet = getCurrentMaxBet();
    if (currentMaxBet > 0) {
        alert('当前轮次有下注，不能跳过！请选择跟注或弃牌。');
        return;
    }
    
    playerActions.push({
        player: currentPlayer.name,
        action: 'check',
        round: currentRound,
        betAmount: 0
    });
    
    addToHistory(`${currentPlayer.name} 跳过`);
    
    nextPlayer();
}

// 玩家跟注
function playerCall() {
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    const currentPlayer = activePlayersInHand[currentPlayerIndex % activePlayersInHand.length];
    
    const currentMaxBet = getCurrentMaxBet();
    if (currentMaxBet === 0) {
        alert('当前没有下注，请选择投注或跳过！');
        return;
    }
    
    // 计算当前玩家在本轮已投注的金额
    const playerCurrentRoundBets = playerActions.filter(action => 
        action.player === currentPlayer.name && 
        action.round === currentRound && 
        action.action !== 'fold' && 
        action.action !== 'check'
    ).reduce((sum, action) => sum + action.betAmount, 0);
    // 计算需要跟注的金额（本轮最高投注 - 已投注金额）
    const callAmount = currentMaxBet - playerCurrentRoundBets;
    
    if (callAmount <= 0) {
        alert('您已经跟上了当前投注！');
        return;
    }
    
    if (currentPlayer.chips < callAmount) {
        alert('筹码不足以跟注！');
        return;
    }
    
    currentPlayer.chips -= callAmount;
    pot += callAmount;
    
    playerActions.push({
        player: currentPlayer.name,
        action: 'call',
        round: currentRound,
        betAmount: playerCurrentRoundBets + callAmount
    });
    
    addToHistory(`${currentPlayer.name} 跟注 ${callAmount} 筹码`);
    
    // 检查玩家是否被淘汰
    if (currentPlayer.chips === 0) {
        currentPlayer.eliminated = true;
        addToHistory(`${currentPlayer.name} 筹码耗尽，被淘汰！`);
    }
    
    updatePlayersDisplay();
    updatePotDisplay();
    
    nextPlayer();
}

// 玩家加注
function playerRaise() {
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    const currentPlayer = activePlayersInHand[currentPlayerIndex % activePlayersInHand.length];
    
    // 计算当前玩家在本轮已投注的金额
    const playerCurrentRoundBets = playerActions.filter(action => 
        action.player === currentPlayer.name && 
        action.round === currentRound && 
        action.action !== 'fold' && 
        action.action !== 'check'
    ).reduce((sum, action) => sum + action.betAmount, 0);
    
    // 获取当前轮次最高投注
    const currentMaxBet = getCurrentMaxBet();
    // 加注金额为当前最高投注的2倍，如果没有投注则为20
    const newBetAmount = currentMaxBet * 2 || 20;
    const actualRaiseAmount = newBetAmount - playerCurrentRoundBets;
    
    if (actualRaiseAmount <= 0) {
        alert('加注金额必须大于当前投注！');
        return;
    }
    
    if (currentPlayer.chips < actualRaiseAmount) {
        alert('筹码不足以加注！');
        return;
    }
    
    currentPlayer.chips -= actualRaiseAmount;
    pot += actualRaiseAmount;
    
    playerActions.push({
        player: currentPlayer.name,
        action: 'raise',
        round: currentRound,
        betAmount: newBetAmount
    });
    
    addToHistory(`${currentPlayer.name} 加注 ${actualRaiseAmount} 筹码，总投注 ${newBetAmount} 筹码`);
    
    // 检查玩家是否被淘汰
    if (currentPlayer.chips === 0) {
        currentPlayer.eliminated = true;
        addToHistory(`${currentPlayer.name} 筹码耗尽，被淘汰！`);
    }
    
    updatePlayersDisplay();
    updatePotDisplay();
    updateGameInfo();
    
    nextPlayer();
}

// 玩家投注
function playerBet() {
    const inputBetAmount = parseInt(document.getElementById('betAmount').value);
    
    if (!inputBetAmount || inputBetAmount <= 0) {
        alert('请输入有效的投注金额！');
        return;
    }
    
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    const currentPlayer = activePlayersInHand[currentPlayerIndex % activePlayersInHand.length];
    
    // 计算当前玩家在本轮已投注的金额
    const playerCurrentRoundBets = playerActions.filter(action => 
        action.player === currentPlayer.name && 
        action.round === currentRound && 
        action.action !== 'fold' && 
        action.action !== 'check'
    ).reduce((sum, action) => sum + action.betAmount, 0);
    
    // 获取当前轮次最高投注
    const currentMaxBet = getCurrentMaxBet();
    // 如果当前轮次已有投注，新的总投注金额必须大于当前轮次最高投注
    // 如果当前轮次没有投注，则允许任何正数投注
    if (currentMaxBet > 0 && inputBetAmount <= currentMaxBet) {
        alert(`投注金额必须大于当前最高投注 ${currentMaxBet} 筹码！`);
        return;
    }
    
    // 如果玩家本轮已经投注过，检查是否需要补足
    if (playerCurrentRoundBets > 0 && inputBetAmount <= playerCurrentRoundBets) {
        alert(`您本轮已投注 ${playerCurrentRoundBets} 筹码，新投注必须大于此金额！`);
        return;
    }
    
    // 计算实际需要投注的金额
    const actualBetAmount = inputBetAmount - playerCurrentRoundBets;
    
    if (currentPlayer.chips < actualBetAmount) {
        alert('筹码不足！');
        return;
    }
    
    currentPlayer.chips -= actualBetAmount;
    pot += actualBetAmount;
    
    playerActions.push({
        player: currentPlayer.name,
        action: 'bet',
        round: currentRound,
        betAmount: inputBetAmount
    });
    
    addToHistory(`${currentPlayer.name} 投注 ${actualBetAmount} 筹码，总投注 ${inputBetAmount} 筹码`);
    
    // 清空输入框
    document.getElementById('betAmount').value = '';
    
    // 检查玩家是否被淘汰
    if (currentPlayer.chips === 0) {
        currentPlayer.eliminated = true;
        addToHistory(`${currentPlayer.name} 筹码耗尽，被淘汰！`);
    }
    
    updatePlayersDisplay();
    updatePotDisplay();
    updateGameInfo();
    
    nextPlayer();
}

// 切换到下一个玩家
function nextPlayer() {
    const activePlayersInHand = playersInHand.filter(p => !p.eliminated && !p.folded);
    
    if (activePlayersInHand.length <= 1) {
        endGameRound();
        return;
    }
    
    // 找到下一个未弃牌的玩家索引
    let nextIndex = currentPlayerIndex;
    let attempts = 0;
    const maxAttempts = activePlayersInHand.length;
    
    do {
        nextIndex = (nextIndex + 1) % activePlayersInHand.length;
        attempts++;
        
        // 防止无限循环
        if (attempts >= maxAttempts) {
            break;
        }
    } while (activePlayersInHand[nextIndex] && activePlayersInHand[nextIndex].folded);
    
    currentPlayerIndex = nextIndex;
    
    // 更新当前玩家名字显示
    const currentPlayer = activePlayersInHand[currentPlayerIndex];
    document.getElementById('currentPlayerName').textContent = currentPlayer.name;
    
    updateGameInfo();
    checkRoundComplete();
}

// 分配底池
function distributePot() {
    const winnerName = document.getElementById('winner').value;
    
    if (!winnerName) {
        alert('请选择获胜者！');
        return;
    }
    
    if (pot <= 0) {
        alert('底池为空！');
        return;
    }
    
    const winner = players.find(p => p.name === winnerName);
    if (winner) {
        winner.chips += pot;
        addToHistory(`${winnerName} 获得底池 ${pot} 筹码`);
        pot = 0;
        lastBetAmount = 0; // 重置最后下注金额
        
        updatePlayersDisplay();
        updatePlayerSelects();
        updatePotDisplay();
        
        // 检查游戏是否结束
        checkGameEnd();
    }
}

// 更新底池显示
function updatePotDisplay() {
    document.getElementById('potAmount').textContent = pot;
}

// 添加历史记录
function addToHistory(message) {
    gameHistory.push(message);
    const historyDiv = document.getElementById('gameHistory');
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.textContent = message;
    historyDiv.appendChild(historyItem);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

// 清空历史记录
function clearHistory() {
    if (confirm('确定要清空历史记录吗？')) {
        gameHistory = [];
        document.getElementById('gameHistory').innerHTML = '';
    }
}

// 检查游戏是否结束
function checkGameEnd() {
    const activePlayers = players.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        addToHistory(`🎉 游戏结束！${winner.name} 获得最终胜利！`);
        alert(`游戏结束！${winner.name} 获得最终胜利！`);
    }
}

// 重置游戏
function resetGame() {
    if (confirm('确定要重置游戏吗？这将清除所有数据！')) {
        players = [];
        pot = 0;
        gameHistory = [];
        gameStarted = false;
        lastBetAmount = 0;
        currentDealer = null;
        currentPlayerIndex = 0;
        gameInProgress = false;
        currentRound = 1;
        currentBetInRound = 0;
        playersInHand = [];
        playerActions = [];
        roundComplete = false;
        
        document.getElementById('playersSection').style.display = 'none';
        document.getElementById('gameHistory').innerHTML = '';
        document.getElementById('manualTransfer').style.display = 'block';
        document.getElementById('gameControls').style.display = 'none';
        updatePotDisplay();
        
        // 清空输入框
        document.getElementById('playerName').value = '';
        document.getElementById('initialChips').value = '1000';
        document.getElementById('chipAmount').value = '';
        document.getElementById('betAmount').value = '';
    }
}

// 自动保存游戏状态到本地存储
function saveGameState() {
    const gameState = {
        players,
        pot,
        gameHistory,
        gameStarted,
        lastBetAmount,
        currentDealer,
        currentPlayerIndex,
        gameInProgress,
        currentRound,
        currentBetInRound,
        playersInHand,
        playerActions,
        roundComplete
    };
    localStorage.setItem('pokerChipTracker', JSON.stringify(gameState));
}

// 从本地存储加载游戏状态
function loadGameState() {
    const saved = localStorage.getItem('pokerChipTracker');
    if (saved) {
        const gameState = JSON.parse(saved);
        players = gameState.players || [];
        pot = gameState.pot || 0;
        gameHistory = gameState.gameHistory || [];
        gameStarted = gameState.gameStarted || false;
        lastBetAmount = gameState.lastBetAmount || 0;
        currentDealer = gameState.currentDealer || null;
        currentPlayerIndex = gameState.currentPlayerIndex || 0;
        gameInProgress = gameState.gameInProgress || false;
        currentRound = gameState.currentRound || 1;
        currentBetInRound = gameState.currentBetInRound || 0;
        playersInHand = gameState.playersInHand || [];
        playerActions = gameState.playerActions || [];
        roundComplete = gameState.roundComplete || false;
        
        if (gameStarted) {
            document.getElementById('playersSection').style.display = 'block';
            updatePlayersDisplay();
            updatePlayerSelects();
            updatePotDisplay();
            
            // 恢复游戏界面状态
            if (gameInProgress) {
                document.getElementById('manualTransfer').style.display = 'none';
                document.getElementById('gameControls').style.display = 'block';
                updateGameInfo();
                startGameRound();
            } else {
                document.getElementById('manualTransfer').style.display = 'block';
                document.getElementById('gameControls').style.display = 'none';
            }
            
            // 恢复历史记录
            const historyDiv = document.getElementById('gameHistory');
            gameHistory.forEach(record => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.textContent = record;
                historyDiv.appendChild(historyItem);
            });
        }
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    updatePotDisplay();
    
    // 添加回车键支持
    document.getElementById('playerName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });
    
    document.getElementById('chipAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            transferChips();
        }
    });
    
    // 添加重置按钮
    const resetButton = document.createElement('button');
    resetButton.textContent = '重置游戏';
    resetButton.onclick = resetGame;
    resetButton.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
    resetButton.style.marginLeft = '10px';
    
    const setupControls = document.querySelector('.setup-controls');
    setupControls.appendChild(resetButton);
});

// 页面卸载时保存状态
window.addEventListener('beforeunload', saveGameState);

// 页面加载时恢复状态
window.addEventListener('load', loadGameState);

// 定期自动保存
setInterval(saveGameState, 30000); // 每30秒保存一次