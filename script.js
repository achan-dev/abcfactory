// 數據儲存
const state = {
    overtimeRecords: JSON.parse(localStorage.getItem('overtimeRecords')) || [],
    points: parseInt(localStorage.getItem('points')) || 0,
    badges: JSON.parse(localStorage.getItem('badges')) || [],
    currentStartTime: null,
    tomatoMood: 'default',
    challengeClaims: JSON.parse(localStorage.getItem('challengeClaims')) || { today: false, week: false, streak: false, longSession: false },
    currentWeekOffset: 0,
    currentTab: 'month' // 默認顯示本月數據
};

// 圖片預載入
const tomatoImages = {
    default: 'assets/tomato_default.png',
    working: 'assets/tomato_working.png',
    happy: 'assets/tomato_happy.png',
    tired: 'assets/tomato_tired.png'
};

function preloadImages() {
    Object.values(tomatoImages).forEach(src => {
        const img = new Image();
        img.src = src;
        img.onerror = () => {
            console.error(`圖片載入失敗: ${src}`);
            document.getElementById('message').textContent = `圖片載入失敗，請檢查路徑：${src}`;
        };
    });
}

// 模組：數據管理
const DataManager = {
    saveRecords() {
        localStorage.setItem('overtimeRecords', JSON.stringify(state.overtimeRecords));
    },
    savePoints() {
        localStorage.setItem('points', state.points);
        document.getElementById('points').textContent = state.points;
    },
    saveBadges() {
        localStorage.setItem('badges', JSON.stringify(state.badges));
        document.getElementById('badges').textContent = state.badges.length ? state.badges.join(', ') : '無';
    },
    saveChallengeClaims() {
        localStorage.setItem('challengeClaims', JSON.stringify(state.challengeClaims));
    },
    resetAllData() {
        state.overtimeRecords = [];
        state.points = 0;
        state.badges = [];
        state.challengeClaims = { today: false, week: false, streak: false, longSession: false };
        state.currentStartTime = null;
        state.tomatoMood = 'default';
        state.currentWeekOffset = 0;
        state.currentTab = 'month';
        localStorage.clear();
        UIManager.updateOverview();
        UIManager.updateTomatoMood();
        document.getElementById('points').textContent = state.points;
        document.getElementById('badges').textContent = '無';
        document.getElementById('message').textContent = '所有數據已重設！';
        document.getElementById('start-btn').textContent = '開始加班';
        document.getElementById('start-btn').style.background = '#FFAB91';
        ChallengeManager.updateChallenges();
        StatsManager.updateStats();
    }
};

// 模組：UI更新
const UIManager = {
    updateTomatoMood() {
        const img = document.getElementById('tomato-img');
        if (!img) {
            console.error('找不到番茄圖片元素');
            return;
        }

        if (state.currentStartTime) {
            state.tomatoMood = 'working';
        } else if (state.overtimeRecords.length > 0) {
            const lastRecord = state.overtimeRecords[state.overtimeRecords.length - 1];
            state.tomatoMood = lastRecord.duration > 240 ? 'tired' : 'happy';
        } else {
            state.tomatoMood = 'default';
        }

        const newSrc = tomatoImages[state.tomatoMood];
        if (!newSrc) {
            console.error(`無效的圖片路徑，tomatoMood: ${state.tomatoMood}`);
            document.getElementById('message').textContent = `無效的圖片路徑，狀態：${state.tomatoMood}`;
            img.src = tomatoImages.default;
            return;
        }

        img.src = newSrc;
        img.onerror = () => {
            console.error(`無法載入圖片: ${newSrc}`);
            document.getElementById('message').textContent = `無法載入圖片，請檢查路徑：${newSrc}`;
            img.style.display = 'none';
        };
        img.onload = () => {
            img.style.display = 'block';
        };
    },
    updateOverview() {
        const today = new Date();
        const todayStr = today.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const todayRecords = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return recordDate === todayStr;
        });
        const todayMinutes = todayRecords.reduce((sum, record) => sum + record.duration, 0);
        document.getElementById('today-hours').textContent = `${Math.floor(todayMinutes / 60)}時${todayMinutes % 60}分`;

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const yesterdayRecords = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return recordDate === yesterdayStr;
        });
        const yesterdayMinutes = yesterdayRecords.reduce((sum, record) => sum + record.duration, 0);
        const todayCompare = yesterdayMinutes === 0 ? (todayMinutes > 0 ? 100 : 0) : Math.round(((todayMinutes - yesterdayMinutes) / yesterdayMinutes) * 100);
        document.getElementById('kpi-today-compare').textContent = `${todayCompare >= 0 ? '+' : ''}${todayCompare}% 比昨天`;

        // 計算「本週加班時數」
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - startOfCurrentWeek.getDay());
        const weekDays = [];
        for (let i = 0; i <= today.getDay(); i++) {
            const day = new Date(startOfCurrentWeek);
            day.setDate(startOfCurrentWeek.getDate() + i);
            weekDays.push(day.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        }
        const weekRecords = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return weekDays.includes(recordDate);
        });
        const weekMinutes = weekRecords.reduce((sum, record) => sum + record.duration, 0);
        document.getElementById('week-hours').textContent = `${Math.floor(weekMinutes / 60)}時${weekMinutes % 60}分`;

        // 計算「上週加班時數」並比較
        const startOfLastWeek = new Date(startOfCurrentWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfCurrentWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
        const startOfLastWeekStr = startOfLastWeek.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const endOfLastWeekStr = endOfLastWeek.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const lastWeekRecords = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start);
            const startOfLastWeekDate = new Date(startOfLastWeekStr);
            const endOfLastWeekDate = new Date(endOfLastWeekStr);
            return recordDate >= startOfLastWeekDate && recordDate <= endOfLastWeekDate;
        });
        const lastWeekMinutes = lastWeekRecords.reduce((sum, record) => sum + record.duration, 0);
        const weekCompare = lastWeekMinutes === 0 ? (weekMinutes > 0 ? 100 : 0) : Math.round(((weekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100);
        document.getElementById('kpi-week-compare').textContent = `${weekCompare >= 0 ? '+' : ''}${weekCompare}% 比上週`;

        // 計算「本月總計」
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const monthRecords = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start);
            return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
        });
        const monthMinutes = monthRecords.reduce((sum, record) => sum + record.duration, 0);
        document.getElementById('month-hours').textContent = `${Math.floor(monthMinutes / 60)}時${monthMinutes % 60}分`;
        document.getElementById('total-hours').textContent = `${Math.floor(monthMinutes / 60)}時${monthMinutes % 60}分`;
    },
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        document.querySelector(`.nav-item[onclick="showPage('${pageId}')"]`).classList.add('active');
        if (pageId === 'stats') {
            StatsManager.updateStats();
        }
    }
};

// 模組：彈窗管理
const ModalManager = {
    openManualEntryModal() {
        const modal = document.getElementById('manual-entry-modal');
        modal.classList.add('active');
        document.getElementById('start-time-step').style.display = 'block';
        document.getElementById('end-time-step').style.display = 'none';
        const now = new Date();
        const nowStr = now.toISOString().slice(0, 16);
        document.getElementById('manual-start-time').value = nowStr;
        const endTime = new Date(now);
        endTime.setHours(endTime.getHours() + 1);
        document.getElementById('manual-end-time').value = endTime.toISOString().slice(0, 16);
    },
    closeManualEntryModal() {
        document.getElementById('manual-entry-modal').classList.remove('active');
    },
    confirmStartTime() {
        const startTime = new Date(document.getElementById('manual-start-time').value);
        if (startTime) {
            document.getElementById('start-time-step').style.display = 'none';
            document.getElementById('end-time-step').style.display = 'block';
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1);
            document.getElementById('manual-end-time').value = endTime.toISOString().slice(0, 16);
            document.getElementById('manual-end-time').setAttribute('min', document.getElementById('manual-start-time').value);
        } else {
            alert('請選擇有效的開始時間！');
        }
    },
    backToStartTime() {
        document.getElementById('start-time-step').style.display = 'block';
        document.getElementById('end-time-step').style.display = 'none';
    },
    submitManualEntry() {
        const startTime = new Date(document.getElementById('manual-start-time').value);
        const endTime = new Date(document.getElementById('manual-end-time').value);
        const duration = Math.round((endTime - startTime) / 1000 / 60);
        if (duration > 0) {
            const type = document.getElementById('overtime-type').value;
            const record = {
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                duration: duration,
                type: type
            };
            state.overtimeRecords.push(record);
            DataManager.saveRecords();
            document.getElementById('message').textContent = `手動記錄${Math.floor(duration / 60)}時${duration % 60}分！`;
            if (duration > 240) {
                document.getElementById('message').textContent += ' 加班超過4小時啦，休息一下吧！';
            }
            UIManager.updateOverview();
            UIManager.updateTomatoMood();
            OvertimeManager.updatePoints(duration);
            this.closeManualEntryModal();
        } else {
            alert('結束時間需晚於開始時間！');
        }
    }
};

// 模組：加班記錄
const OvertimeManager = {
    startOvertime() {
        const startBtn = document.getElementById('start-btn');
        if (!state.currentStartTime) {
            state.currentStartTime = new Date();
            startBtn.textContent = '結束加班';
            startBtn.style.background = '#EF6C00';
            document.getElementById('message').textContent = '加班中...';
            UIManager.updateTomatoMood();
        } else {
            const endTime = new Date();
            const duration = Math.round((endTime - state.currentStartTime) / 1000 / 60);
            const type = document.getElementById('overtime-type').value;
            const record = {
                start: state.currentStartTime.toISOString(),
                end: endTime.toISOString(),
                duration: duration,
                type: type
            };
            state.overtimeRecords.push(record);
            DataManager.saveRecords();
            state.currentStartTime = null;
            startBtn.textContent = '開始加班';
            startBtn.style.background = '#FFAB91';
            document.getElementById('message').textContent = `本次加班${Math.floor(duration / 60)}時${duration % 60}分！`;
            if (duration > 240) {
                document.getElementById('message').textContent += ' 加班超過4小時啦，休息一下吧！';
            }
            UIManager.updateOverview();
            UIManager.updateTomatoMood();
            this.updatePoints(duration);
        }
    },
    updatePoints(minutes) {
        state.points += Math.floor(minutes / 60) * 10;
        DataManager.savePoints();
        this.checkBadges();
    },
    checkBadges() {
        const monthMinutes = state.overtimeRecords.reduce((sum, record) => sum + record.duration, 0);
        if (monthMinutes >= 300 && !state.badges.includes('加班達人')) {
            state.badges.push('加班達人');
            DataManager.saveBadges();
            alert('恭喜獲得「加班達人」徽章！');
        }
    }
};

// 模組：統計頁
const StatsManager = {
    prevWeek() {
        state.currentWeekOffset--;
        this.updateStats();
    },
    nextWeek() {
        state.currentWeekOffset++;
        this.updateStats();
    },
    currentWeek() {
        state.currentWeekOffset = 0;
        this.updateStats();
    },
    updateStats() {
        const today = new Date();
        
        // 更新圓環圖（本週或本月加班類型）
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - startOfCurrentWeek.getDay());
        const weekDays = [];
        for (let i = 0; i <= today.getDay(); i++) {
            const day = new Date(startOfCurrentWeek);
            day.setDate(startOfCurrentWeek.getDate() + i);
            weekDays.push(day.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        }

        const typeRecords = state.currentTab === 'week'
            ? state.overtimeRecords.filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return weekDays.includes(recordDate);
            })
            : state.overtimeRecords.filter(record => {
                const recordDate = new Date(record.start);
                return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
            });

        const totalMinutes = typeRecords.reduce((sum, record) => sum + record.duration, 0);
        document.getElementById('total-hours').textContent = `${Math.floor(totalMinutes / 60)}時${totalMinutes % 60}分`;

        const typeData = {};
        typeRecords.forEach(record => {
            typeData[record.type] = (typeData[record.type] || 0) + record.duration;
        });

        const typeChartCanvas = document.getElementById('type-chart');
        if (typeChartCanvas) {
            if (typeChartCanvas.chart) {
                typeChartCanvas.chart.destroy();
            }
            typeChartCanvas.chart = new Chart(typeChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeData),
                    datasets: [{
                        data: Object.values(typeData),
                        backgroundColor: ['#FFAB91', '#A5D6A7', '#B0BEC5', '#FFCA28']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom', // 標籤移到圖表下方
                            labels: {
                                boxWidth: 20,
                                padding: 20,
                                font: {
                                    size: 14,
                                    family: "'Noto Sans TC', sans-serif"
                                },
                                color: '#5D4037'
                            }
                        },
                        title: {
                            display: true,
                            text: '本月加班類型',
                            color: '#5D4037',
                            font: {
                                size: 16,
                                family: "'Noto Sans TC', sans-serif"
                            }
                        }
                    },
                    layout: {
                        padding: {
                            bottom: 20 // 為下方標籤留出空間
                        }
                    }
                }
            });
        }

        // 更新柱狀圖（最近7天加班趨勢）
        const startOfCurrentWeekChart = new Date(today);
        startOfCurrentWeekChart.setDate(startOfCurrentWeekChart.getDate() - startOfCurrentWeekChart.getDay() + (state.currentWeekOffset * 7));
        const weekData = Array(7).fill(0);
        const trendData = Array(7).fill(0);
        const labels = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfCurrentWeekChart);
            date.setDate(startOfCurrentWeekChart.getDate() + i);
            const dateStr = date.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            const dayRecords = state.overtimeRecords.filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return recordDate === dateStr;
            });
            const minutes = dayRecords.reduce((sum, record) => sum + record.duration, 0);
            weekData[i] = minutes / 60;
            trendData[i] = minutes / 60;
            const dayOfWeek = date.getDay();
            const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
            labels[i] = `${dayNames[dayOfWeek]} (${dateStr.split('/')[2]})`;
        }

        const weeklyChartCanvas = document.getElementById('weekly-chart');
        if (weeklyChartCanvas) {
            if (weeklyChartCanvas.chart) {
                weeklyChartCanvas.chart.destroy();
            }
            weeklyChartCanvas.chart = new Chart(weeklyChartCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '加班時數（小時）',
                            data: weekData,
                            backgroundColor: '#FFAB91',
                            type: 'bar'
                        },
                        {
                            label: '趨勢線',
                            data: trendData,
                            borderColor: '#EF6C00',
                            borderWidth: 2,
                            fill: false,
                            type: 'line',
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: '時數（小時）', color: '#5D4037' },
                            ticks: {
                                callback: function(value) {
                                    return Number(value).toFixed(2);
                                }
                            }
                        },
                        x: { title: { display: true, text: '日期', color: '#5D4037' } }
                    },
                    plugins: {
                        title: { display: true, text: `最近7天加班趨勢 (${state.currentWeekOffset === 0 ? '本' : state.currentWeekOffset > 0 ? `後${state.currentWeekOffset}` : `前${-state.currentWeekOffset}`} 週)`, color: '#5D4037' }
                    }
                }
            });
        }

        // 設置 Tab 切換事件
        const tabs = document.querySelectorAll('.chart-tabs .tab');
        tabs.forEach(tab => {
            tab.addEventListener('mouseover', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                state.currentTab = tab.getAttribute('data-tab');
                StatsManager.updateStats();
            });
        });

        // 設置默認選中 Tab
        tabs.forEach(tab => tab.classList.remove('active'));
        document.querySelector(`.chart-tabs .tab[data-tab="${state.currentTab}"]`).classList.add('active');
    }
};

// 模組：挑戰頁
const ChallengeManager = {
    updateChallenges() {
        const challengeList = document.getElementById('challenge-list');
        const claimAllBtn = document.getElementById('claim-all-btn');
        const challenges = [
            { name: '今日加班2小時', goal: 120, reward: 20, key: 'today', bonus: '隨機番茄幣' },
            { name: '本週加班10小時', goal: 600, reward: 50, key: 'week', bonus: '特殊徽章' },
            { name: '連續加班3天', goal: 3, reward: 30, key: 'streak', bonus: '隨機番茄幣', type: 'streak' },
            { name: '單次加班超過5小時', goal: 300, reward: 40, key: 'longSession', bonus: '特殊徽章', type: 'longSession' },
            { name: '今日加班1小時', goal: 60, reward: 10, key: 'today_1h', bonus: '隨機番茄幣' },
            { name: '今日加班4小時', goal: 240, reward: 30, key: 'today_4h', bonus: '隨機番茄幣' },
            { name: '本週加班5小時', goal: 300, reward: 25, key: 'week_5h', bonus: '隨機番茄幣' },
            { name: '本週加班15小時', goal: 900, reward: 60, key: 'week_15h', bonus: '特殊徽章' },
            { name: '本月加班20小時', goal: 1200, reward: 80, key: 'month_20h', bonus: '特殊徽章' },
            { name: '本月加班30小時', goal: 1800, reward: 100, key: 'month_30h', bonus: '特殊徽章' },
            { name: '連續加班2天', goal: 2, reward: 20, key: 'streak_2d', bonus: '隨機番茄幣', type: 'streak' },
            { name: '連續加班5天', goal: 5, reward: 40, key: 'streak_5d', bonus: '特殊徽章', type: 'streak' },
            { name: '連續加班7天', goal: 7, reward: 50, key: 'streak_7d', bonus: '特殊徽章', type: 'streak' },
            { name: '單次加班超過3小時', goal: 180, reward: 30, key: 'longSession_3h', bonus: '隨機番茄幣', type: 'longSession' },
            { name: '單次加班超過6小時', goal: 360, reward: 50, key: 'longSession_6h', bonus: '特殊徽章', type: 'longSession' },
            { name: '單次加班超過8小時', goal: 480, reward: 60, key: 'longSession_8h', bonus: '特殊徽章', type: 'longSession' },
            { name: '公司加班5小時', goal: 300, reward: 30, key: 'company_5h', bonus: '隨機番茄幣' },
            { name: '在家加班5小時', goal: 300, reward: 30, key: 'home_5h', bonus: '隨機番茄幣' },
            { name: '出差加班5小時', goal: 300, reward: 30, key: 'travel_5h', bonus: '隨機番茄幣' },
            { name: '公司加班10小時', goal: 600, reward: 50, key: 'company_10h', bonus: '特殊徽章' },
            { name: '在家加班10小時', goal: 600, reward: 50, key: 'home_10h', bonus: '特殊徽章' },
            { name: '出差加班10小時', goal: 600, reward: 50, key: 'travel_10h', bonus: '特殊徽章' },
            { name: '本週完成3次單次加班超過3小時', goal: 3, reward: 50, key: 'week_3h_3times', bonus: '特殊徽章', type: 'week_longSession_3h' },
            { name: '本月完成5次單次加班超過3小時', goal: 5, reward: 60, key: 'month_3h_5times', bonus: '特殊徽章', type: 'month_longSession_3h' }
        ];
        challengeList.innerHTML = '';

        const today = new Date();
        const todayStr = today.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const todayMinutes = state.overtimeRecords
            .filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return recordDate === todayStr;
            })
            .reduce((sum, record) => sum + record.duration, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = startOfWeek.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const weekDays = [];
        for (let i = 0; i <= today.getDay(); i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDays.push(day.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        }
        const weekMinutes = state.overtimeRecords
            .filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return weekDays.includes(recordDate);
            })
            .reduce((sum, record) => sum + record.duration, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const monthDays = [];
        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
            monthDays.push(new Date(d).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        }
        const monthMinutes = state.overtimeRecords
            .filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return monthDays.includes(recordDate);
            })
            .reduce((sum, record) => sum + record.duration, 0);

        const uniqueDays = new Set(state.overtimeRecords.map(record => new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' })));
        let streak = 0;
        let currentDate = new Date(today);
        let hasRecordToday = uniqueDays.has(currentDate.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        if (hasRecordToday) {
            streak = 1;
            currentDate.setDate(currentDate.getDate() - 1);
            while (uniqueDays.has(currentDate.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }))) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
        }

        const longSession = state.overtimeRecords.reduce((max, record) => Math.max(max, record.duration), 0);

        const weekLongSession3h = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return weekDays.includes(recordDate) && record.duration >= 180;
        }).length;

        const monthLongSession3h = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return monthDays.includes(recordDate) && record.duration >= 180;
        }).length;

        // 計算每個挑戰的進度和狀態
        const challengeData = challenges.map(challenge => {
            let progress;
            if (challenge.type === 'streak') {
                progress = streak;
            } else if (challenge.type === 'longSession') {
                progress = longSession;
            } else if (challenge.type === 'week_longSession_3h') {
                progress = weekLongSession3h;
            } else if (challenge.type === 'month_longSession_3h') {
                progress = monthLongSession3h;
            } else {
                progress = challenge.key.includes('today') ? todayMinutes : 
                          challenge.key.includes('week') ? weekMinutes : 
                          challenge.key.includes('month') ? monthMinutes : 0;
            }
            const canClaim = progress >= challenge.goal && !state.challengeClaims[challenge.key];
            const claimed = state.challengeClaims[challenge.key];
            const progressPercent = Math.min((progress / challenge.goal) * 100, 100);
            return { challenge, progress, canClaim, claimed, progressPercent };
        });

        // 檢查是否有可領取的挑戰，控制「一鍵領取」按鈕顯示
        const hasClaimable = challengeData.some(item => item.canClaim);
        claimAllBtn.style.display = hasClaimable ? 'block' : 'none';

        // 排序：已完成的任務排在前面，未完成的排在後面
        challengeData.sort((a, b) => {
            if (a.claimed && !b.claimed) return -1;
            if (!a.claimed && b.claimed) return 1;
            return 0;
        });

        // 渲染排序後的挑戰
        challengeData.forEach(item => {
            const { challenge, progress, canClaim, claimed, progressPercent } = item;
            const div = document.createElement('div');
            div.className = 'challenge-item';
            div.innerHTML = `
                ${challenge.name}：${progress}/${challenge.goal}${challenge.type === 'streak' ? '天' : challenge.type === 'longSession' ? '分' : challenge.type === 'week_longSession_3h' || challenge.type === 'month_longSession_3h' ? '次' : '分'}<br>
                獎勵：${challenge.reward}番茄幣 + ${challenge.bonus}<br>
                <div class="progress-bar"><div class="progress" style="width: ${progressPercent}%"></div></div>
            `;
            if (canClaim) {
                div.innerHTML += ` <button onclick="ChallengeManager.claimReward('${challenge.key}', ${challenge.reward}, ${challenge.goal}, '${challenge.bonus}')">領取</button>`;
            } else if (claimed) {
                div.innerHTML += ` <span>已領取</span>`;
            }
            challengeList.appendChild(div);
        });
    },
    claimReward(key, reward, goal, bonus) {
        if (!state.challengeClaims[key]) {
            const today = new Date();
            const todayStr = today.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            const todayMinutes = state.overtimeRecords
                .filter(record => {
                    const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                    return recordDate === todayStr;
                })
                .reduce((sum, record) => sum + record.duration, 0);

            const startOfWeek = new Date(today);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const startOfWeekStr = startOfWeek.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            const weekDays = [];
            for (let i = 0; i <= today.getDay(); i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                weekDays.push(day.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
            }
            const weekMinutes = state.overtimeRecords
                .filter(record => {
                    const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                    return weekDays.includes(recordDate);
                })
                .reduce((sum, record) => sum + record.duration, 0);

            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const monthDays = [];
            for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
                monthDays.push(new Date(d).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
            }
            const monthMinutes = state.overtimeRecords
                .filter(record => {
                    const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                    return monthDays.includes(recordDate);
                })
                .reduce((sum, record) => sum + record.duration, 0);

            const uniqueDays = new Set(state.overtimeRecords.map(record => new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' })));
            let streak = 0;
            let currentDate = new Date(today);
            let hasRecordToday = uniqueDays.has(currentDate.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
            if (hasRecordToday) {
                streak = 1;
                currentDate.setDate(currentDate.getDate() - 1);
                while (uniqueDays.has(currentDate.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }))) {
                    streak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                }
            }

            const longSession = state.overtimeRecords.reduce((max, record) => Math.max(max, record.duration), 0);

            const weekLongSession3h = state.overtimeRecords.filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return weekDays.includes(recordDate) && record.duration >= 180;
            }).length;

            const monthLongSession3h = state.overtimeRecords.filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return monthDays.includes(recordDate) && record.duration >= 180;
            }).length;

            const progress = key.includes('today') ? todayMinutes : 
                           key.includes('week') ? weekMinutes : 
                           key.includes('month') ? monthMinutes : 
                           key.includes('streak') ? streak : 
                           key.includes('longSession') ? longSession :
                           key.includes('week_3h') ? weekLongSession3h :
                           key.includes('month_3h') ? monthLongSession3h : 0;

            if (progress >= goal) {
                state.points += reward;
                if (bonus === '隨機番茄幣') {
                    const randomBonus = Math.floor(Math.random() * 10) + 1;
                    state.points += randomBonus;
                    alert(`額外獲得 ${randomBonus} 番茄幣！`);
                } else if (bonus === '特殊徽章') {
                    const newBadge = '挑戰大師';
                    if (!state.badges.includes(newBadge)) {
                        state.badges.push(newBadge);
                        alert(`獲得特殊徽章：${newBadge}！`);
                    }
                }
                state.challengeClaims[key] = true;
                DataManager.savePoints();
                DataManager.saveBadges();
                DataManager.saveChallengeClaims();

                const animation = document.getElementById('challenge-animation');
                animation.innerHTML = '🎉 挑戰完成！';
                animation.classList.remove('active');
                void animation.offsetWidth;
                animation.classList.add('active');
                animation.addEventListener('animationend', () => {
                    animation.style.display = 'none';
                });

                this.updateChallenges();
            }
        }
    },
    claimAllRewards() {
        const challenges = [
            { name: '今日加班2小時', goal: 120, reward: 20, key: 'today', bonus: '隨機番茄幣' },
            { name: '本週加班10小時', goal: 600, reward: 50, key: 'week', bonus: '特殊徽章' },
            { name: '連續加班3天', goal: 3, reward: 30, key: 'streak', bonus: '隨機番茄幣', type: 'streak' },
            { name: '單次加班超過5小時', goal: 300, reward: 40, key: 'longSession', bonus: '特殊徽章', type: 'longSession' },
            { name: '今日加班1小時', goal: 60, reward: 10, key: 'today_1h', bonus: '隨機番茄幣' },
            { name: '今日加班4小時', goal: 240, reward: 30, key: 'today_4h', bonus: '隨機番茄幣' },
            { name: '本週加班5小時', goal: 300, reward: 25, key: 'week_5h', bonus: '隨機番茄幣' },
            { name: '本週加班15小時', goal: 900, reward: 60, key: 'week_15h', bonus: '特殊徽章' },
            { name: '本月加班20小時', goal: 1200, reward: 80, key: 'month_20h', bonus: '特殊徽章' },
            { name: '本月加班30小時', goal: 1800, reward: 100, key: 'month_30h', bonus: '特殊徽章' },
            { name: '連續加班2天', goal: 2, reward: 20, key: 'streak_2d', bonus: '隨機番茄幣', type: 'streak' },
            { name: '連續加班5天', goal: 5, reward: 40, key: 'streak_5d', bonus: '特殊徽章', type: 'streak' },
            { name: '連續加班7天', goal: 7, reward: 50, key: 'streak_7d', bonus: '特殊徽章', type: 'streak' },
            { name: '單次加班超過3小時', goal: 180, reward: 30, key: 'longSession_3h', bonus: '隨機番茄幣', type: 'longSession' },
            { name: '單次加班超過6小時', goal: 360, reward: 50, key: 'longSession_6h', bonus: '特殊徽章', type: 'longSession' },
            { name: '單次加班超過8小時', goal: 480, reward: 60, key: 'longSession_8h', bonus: '特殊徽章', type: 'longSession' },
            { name: '公司加班5小時', goal: 300, reward: 30, key: 'company_5h', bonus: '隨機番茄幣' },
            { name: '在家加班5小時', goal: 300, reward: 30, key: 'home_5h', bonus: '隨機番茄幣' },
            { name: '出差加班5小時', goal: 300, reward: 30, key: 'travel_5h', bonus: '隨機番茄幣' },
            { name: '公司加班10小時', goal: 600, reward: 50, key: 'company_10h', bonus: '特殊徽章' },
            { name: '在家加班10小時', goal: 600, reward: 50, key: 'home_10h', bonus: '特殊徽章' },
            { name: '出差加班10小時', goal: 600, reward: 50, key: 'travel_10h', bonus: '特殊徽章' },
            { name: '本週完成3次單次加班超過3小時', goal: 3, reward: 50, key: 'week_3h_3times', bonus: '特殊徽章', type: 'week_longSession_3h' },
            { name: '本月完成5次單次加班超過3小時', goal: 5, reward: 60, key: 'month_3h_5times', bonus: '特殊徽章', type: 'month_longSession_3h' }
        ];

        const today = new Date();
        const todayStr = today.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const todayMinutes = state.overtimeRecords
            .filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return recordDate === todayStr;
            })
            .reduce((sum, record) => sum + record.duration, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = startOfWeek.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
        const weekDays = [];
        for (let i = 0; i <= today.getDay(); i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDays.push(day.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        }
        const weekMinutes = state.overtimeRecords
            .filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return weekDays.includes(recordDate);
            })
            .reduce((sum, record) => sum + record.duration, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const monthDays = [];
        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
            monthDays.push(new Date(d).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        }
        const monthMinutes = state.overtimeRecords
            .filter(record => {
                const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
                return monthDays.includes(recordDate);
            })
            .reduce((sum, record) => sum + record.duration, 0);

        const uniqueDays = new Set(state.overtimeRecords.map(record => new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' })));
        let streak = 0;
        let currentDate = new Date(today);
        let hasRecordToday = uniqueDays.has(currentDate.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }));
        if (hasRecordToday) {
            streak = 1;
            currentDate.setDate(currentDate.getDate() - 1);
            while (uniqueDays.has(currentDate.toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' }))) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
        }

        const longSession = state.overtimeRecords.reduce((max, record) => Math.max(max, record.duration), 0);

        const weekLongSession3h = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return weekDays.includes(recordDate) && record.duration >= 180;
        }).length;

        const monthLongSession3h = state.overtimeRecords.filter(record => {
            const recordDate = new Date(record.start).toLocaleDateString('zh-TW', { timeZone: 'America/Los_Angeles' });
            return monthDays.includes(recordDate) && record.duration >= 180;
        }).length;

        // 遍歷所有挑戰，領取符合條件的獎勵
        challenges.forEach(challenge => {
            let progress;
            if (challenge.type === 'streak') {
                progress = streak;
            } else if (challenge.type === 'longSession') {
                progress = longSession;
            } else if (challenge.type === 'week_longSession_3h') {
                progress = weekLongSession3h;
            } else if (challenge.type === 'month_longSession_3h') {
                progress = monthLongSession3h;
            } else {
                progress = challenge.key.includes('today') ? todayMinutes : 
                          challenge.key.includes('week') ? weekMinutes : 
                          challenge.key.includes('month') ? monthMinutes : 0;
            }
            const canClaim = progress >= challenge.goal && !state.challengeClaims[challenge.key];
            if (canClaim) {
                this.claimReward(challenge.key, challenge.reward, challenge.goal, challenge.bonus);
            }
        });

        // 更新挑戰列表
        this.updateChallenges();
    }
};

// 模組：設定頁
const SettingsManager = {
    saveSettings() {
        const theme = document.getElementById('theme-color').value;
        if (theme === 'blue') {
            document.body.style.background = '#B3E5FC';
            document.querySelector('.navbar').style.background = '#42A5F5';
        } else if (theme === 'green') {
            document.body.style.background = '#C5E1A5';
            document.querySelector('.navbar').style.background = '#7CB342';
        } else {
            document.body.style.background = '#FFE8D8';
            document.querySelector('.navbar').style.background = '#FFAB91';
        }
        localStorage.setItem('theme', theme);
    }
};

// 全局函數
function showPage(pageId) {
    UIManager.showPage(pageId);
}

function startOvertime() {
    OvertimeManager.startOvertime();
}

function openManualEntryModal() {
    ModalManager.openManualEntryModal();
}

function closeManualEntryModal() {
    ModalManager.closeManualEntryModal();
}

function confirmStartTime() {
    ModalManager.confirmStartTime();
}

function backToStartTime() {
    ModalManager.backToStartTime();
}

function submitManualEntry() {
    ModalManager.submitManualEntry();
}

function saveSettings() {
    SettingsManager.saveSettings();
}

function resetAllData() {
    if (confirm('確定要重設所有數據嗎？此操作無法恢復！')) {
        DataManager.resetAllData();
    }
}

// 初始化
window.onload = () => {
    preloadImages();
    UIManager.updateOverview();
    UIManager.updateTomatoMood();
    document.getElementById('points').textContent = state.points;
    document.getElementById('badges').textContent = state.badges.length ? state.badges.join(', ') : '無';
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.getElementById('theme-color').value = savedTheme;
        SettingsManager.saveSettings();
    }
    document.querySelector('.nav-item[onclick="showPage(\'stats\')"]').addEventListener('click', () => StatsManager.updateStats());
    document.querySelector('.nav-item[onclick="showPage(\'challenges\')"]').addEventListener('click', () => ChallengeManager.updateChallenges());
};