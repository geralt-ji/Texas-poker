// 游戏状态
let players = [];
let pot = 0;
let gameHistory = [];
let gameStarted = false;
let lastBetAmount = 0;
let currentDealer = null;
let currentPlayerIndex = 0;

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
    
    // 如果游戏已开始，更新显示
    if (gameStarted) {
        updatePlayersDisplay();
        updatePlayerSelects();
    }
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
        
        const statusText = player.eliminated ? ' (已淘汰)' : '';
        const dealerText = player.name === currentDealer ? ' 🎯' : '';
        
        playerDiv.innerHTML = `
            <div class="player-name">${player.name}${dealerText}${statusText}</div>
            <div class="player-chips">${player.chips} 筹码</div>
        `;
        
        playersDiv.appendChild(playerDiv);
    });
}

// 更新玩家选择框
function updatePlayerSelects() {
    const fromSelect = document.getElementById('fromPlayer');
    const toSelect = document.getElementById('toPlayer');
    const winnerSelect = document.getElementById('winner');
    const dealerSelect = document.getElementById('dealerSelect');
    
    // 清空选项
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '<option value="pot">底池</option><option value="all">所有人</option>';
    winnerSelect.innerHTML = '<option value="">选择获胜者</option>';
    dealerSelect.innerHTML = '<option value="">选择庄家</option>';
    
    // 添加活跃玩家到转出玩家选择框
    const activePlayers = players.filter(p => !p.eliminated && p.chips > 0);
    activePlayers.forEach((player, index) => {
        const option = document.createElement('option');
        option.value = player.name;
        option.textContent = `${player.name} (${player.chips})`;
        if (index === currentPlayerIndex % activePlayers.length) {
            option.selected = true; // 选择当前玩家
        }
        fromSelect.appendChild(option);
    });
    
    // 添加"所有人"选项到转出玩家选择框
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '所有人';
    fromSelect.appendChild(allOption);
    
    // 添加所有未淘汰玩家到其他选择框
    players.filter(p => !p.eliminated).forEach(player => {
        // 接收玩家选择框
        const toOption = document.createElement('option');
        toOption.value = player.name;
        toOption.textContent = player.name;
        toSelect.appendChild(toOption);
        
        // 获胜者选择框
        const winnerOption = document.createElement('option');
        winnerOption.value = player.name;
        winnerOption.textContent = player.name;
        winnerSelect.appendChild(winnerOption);
        
        // 庄家选择框
        const dealerOption = document.createElement('option');
        dealerOption.value = player.name;
        dealerOption.textContent = player.name;
        if (player.name === currentDealer) {
            dealerOption.selected = true;
        }
        dealerSelect.appendChild(dealerOption);
    });
    
    // 默认选择底池
    toSelect.value = 'pot';
}

// 转移筹码
function transferChips() {
    const fromPlayerName = document.getElementById('fromPlayer').value;
    const toPlayerName = document.getElementById('toPlayer').value;
    const amount = parseInt(document.getElementById('chipAmount').value);
    
    if (!fromPlayerName || !toPlayerName || !amount || amount <= 0) {
        alert('请填写完整的转移信息！');
        return;
    }
    
    if (fromPlayerName === 'all') {
        // 所有人都扣除筹码
        const activePlayers = players.filter(p => !p.eliminated && p.chips > 0);
        
        // 检查所有玩家是否都有足够筹码
        const insufficientPlayers = activePlayers.filter(p => p.chips < amount);
        if (insufficientPlayers.length > 0) {
            alert(`以下玩家筹码不足：${insufficientPlayers.map(p => p.name).join(', ')}`);
            return;
        }
        
        // 从所有玩家扣除筹码
        activePlayers.forEach(player => {
            player.chips -= amount;
            if (player.chips === 0) {
                player.eliminated = true;
                addToHistory(`${player.name} 筹码耗尽，被淘汰！`);
            }
        });
        
        if (toPlayerName === 'pot') {
            // 转入底池
            const totalAmount = amount * activePlayers.length;
            pot += totalAmount;
            addToHistory(`所有玩家每人向底池投入 ${amount} 筹码，共 ${totalAmount} 筹码`);
        } else {
            // 转给指定玩家
            const toPlayer = players.find(p => p.name === toPlayerName);
            if (toPlayer) {
                const totalAmount = amount * activePlayers.length;
                toPlayer.chips += totalAmount;
                addToHistory(`所有玩家每人转给 ${toPlayerName} ${amount} 筹码，共 ${totalAmount} 筹码`);
            }
        }
    } else if (toPlayerName === 'all') {
        // 从一个玩家转给所有其他玩家
        const fromPlayer = players.find(p => p.name === fromPlayerName);
        if (!fromPlayer || fromPlayer.chips < amount) {
            alert('转出玩家筹码不足！');
            return;
        }
        
        const otherPlayers = players.filter(p => !p.eliminated && p.name !== fromPlayerName);
        const totalCost = amount * otherPlayers.length;
        
        if (fromPlayer.chips < totalCost) {
            alert(`转出玩家筹码不足！需要 ${totalCost} 筹码给 ${otherPlayers.length} 个玩家`);
            return;
        }
        
        fromPlayer.chips -= totalCost;
        otherPlayers.forEach(player => {
            player.chips += amount;
        });
        
        addToHistory(`${fromPlayerName} 给所有其他玩家每人转移 ${amount} 筹码，共消耗 ${totalCost} 筹码`);
        
        // 检查玩家是否被淘汰
        if (fromPlayer.chips === 0) {
            fromPlayer.eliminated = true;
            addToHistory(`${fromPlayerName} 筹码耗尽，被淘汰！`);
        }
    } else {
        // 正常转移逻辑
        const fromPlayer = players.find(p => p.name === fromPlayerName);
        
        if (!fromPlayer || fromPlayer.chips < amount) {
            alert('转出玩家筹码不足！');
            return;
        }
        
        // 从转出玩家扣除筹码
        fromPlayer.chips -= amount;
        
        // 更新最后下注金额（只有转入底池时才算下注）
        if (toPlayerName === 'pot') {
            lastBetAmount = amount;
        }
        
        if (toPlayerName === 'pot') {
            // 转入底池
            pot += amount;
            addToHistory(`${fromPlayerName} 向底池投入 ${amount} 筹码`);
        } else {
            // 转给其他玩家
            const toPlayer = players.find(p => p.name === toPlayerName);
            if (toPlayer) {
                toPlayer.chips += amount;
                addToHistory(`${fromPlayerName} 转给 ${toPlayerName} ${amount} 筹码`);
            }
        }
        
        // 检查玩家是否被淘汰
        if (fromPlayer.chips === 0) {
            fromPlayer.eliminated = true;
            addToHistory(`${fromPlayerName} 筹码耗尽，被淘汰！`);
        }
    }
    
    // 切换到下一个玩家
    const activePlayers = players.filter(p => !p.eliminated && p.chips > 0);
    if (activePlayers.length > 0) {
        currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
    }
    
    // 清空输入
    document.getElementById('chipAmount').value = '';
    
    // 更新显示
    updatePlayersDisplay();
    updatePlayerSelects();
    updatePotDisplay();
    
    // 检查游戏是否结束
    checkGameEnd();
}

// 跟注
function callBet() {
    if (lastBetAmount > 0) {
        document.getElementById('chipAmount').value = lastBetAmount;
        document.getElementById('toPlayer').value = 'pot';
    } else {
        alert('还没有人下注！');
    }
}

// 加注
function raiseBet() {
    if (lastBetAmount > 0) {
        document.getElementById('chipAmount').value = lastBetAmount * 2;
    } else {
        document.getElementById('chipAmount').value = 20; // 默认加注金额
    }
    document.getElementById('toPlayer').value = 'pot';
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
    
    // 设置当前玩家为大盲注后的下一个玩家
    currentPlayerIndex = (bigBlindIndex + 1) % activePlayers.length;
    
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
        
        document.getElementById('playersSection').style.display = 'none';
        document.getElementById('gameHistory').innerHTML = '';
        updatePotDisplay();
        
        // 清空输入框
        document.getElementById('playerName').value = '';
        document.getElementById('initialChips').value = '1000';
        document.getElementById('chipAmount').value = '';
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
        currentPlayerIndex
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
        
        if (gameStarted) {
            document.getElementById('playersSection').style.display = 'block';
            updatePlayersDisplay();
            updatePlayerSelects();
            updatePotDisplay();
            
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