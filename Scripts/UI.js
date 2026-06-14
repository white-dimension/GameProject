/**
 * UI.js — v5.3 沉浸式图标映射版
 */
window.UISystem = (function () {
    'use strict';
    var GS = function () { return window.GameState.getState(); };
    var WS = function () { return window.WorldSystem; };
    var CS = function () { return window.CombatSystem; };
    var GD = function () { return window.GameData; };

    var _root, _mainView, _battleView, _viewport, _modalOverlay, _msgOverlay, _juiceContainer;
    var _wakingUp = true, _showScan = false, _tasksDone = false, _tasksAnimating = false, _discoveryDone = false, _discoveryAnimating = false;
    var _isFirstLoad = true;
    var _introActive = false;

    // 模块级日志辅助（init / _renderTasks / _renderDiscovery 共用）
    function _pushLog(msg, cb) {
        var el = document.getElementById('ui-log');
        if (!el) { if (cb) cb(); return; }
        var div = document.createElement('div');
        div.className = 'txt-xs txt-dim';
        div.style.cssText = 'margin-bottom:5px;';
        div.innerHTML = '<span class="txt-green">></span> <span class="typewriter"></span>';
        el.insertBefore(div, el.firstChild);
        _typeText(div.querySelector('.typewriter'), msg, cb || function(){});
    }

    function init() {
        _root = document.getElementById('app'); if (!_root) return;
        _root.innerHTML = '';
        _root.style.cssText = 'width:100vw;height:100vh;display:flex;flex-direction:column;position:relative;background:var(--bg-deep);';

        var topBar = _ce('div', 'hud-top');
        topBar.style.cssText = 'position:relative;display:flex;flex-direction:row;justify-content:center;padding:8px 25px 4px 25px;min-height:60px;background:rgba(10,14,20,0.95);border-bottom:1px solid var(--border-dim);z-index:500;';
        _root.appendChild(topBar);

        _viewport = _ce('div', 'main-viewport');
        _viewport.style.cssText = 'flex:1;position:relative;display:flex;overflow:hidden;background:radial-gradient(circle at center, #0d1117, #050508);';
        _root.appendChild(_viewport);

        // 左侧面板（任务 + 日志）— 必须排在 _mainView 前面
        var leftPanelCol = _ce('div', 'left-panel-col');
        var taskPanel = _ce('div', 'task-panel');
        taskPanel.id = 'ui-task-panel';
        taskPanel.style.cssText = 'background:var(--bg-card);border:1px solid var(--border-dim);border-radius:6px;padding:15px;';
        leftPanelCol.appendChild(taskPanel);
        var roomInfoWrap = _ce('div');
        roomInfoWrap.id = 'ui-room-info';
        roomInfoWrap.style.cssText = 'position:absolute;top:50%;transform:translateY(-50%);width:100%;padding:0 15px;z-index:1;';
        leftPanelCol.appendChild(roomInfoWrap);
        var logWrap = _ce('div', 'log-wrap');
        var logTitle = _ce('div');
        logTitle.className = 'txt-xs txt-green txt-bold';
        logTitle.style.cssText = 'letter-spacing:2px;margin-bottom:10px;';
        logTitle.textContent = '> 日志';
        logWrap.appendChild(logTitle);
        var logPanel = _ce('div', 'log-panel');
        logPanel.id = 'ui-log';
        logPanel.style.cssText = 'max-height:180px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:6px;padding:15px;box-shadow:0 10px 30px rgba(0,0,0,0.8);';
        logPanel.innerHTML = '';
        logWrap.appendChild(logPanel);
        leftPanelCol.appendChild(logWrap);
        _viewport.appendChild(leftPanelCol);
        var divider = _ce('div');
        divider.id = 'ui-divider';
        divider.style.cssText = 'width:1px;align-self:stretch;background:var(--border-dim);margin:25px 30px 25px 0;';
        _viewport.appendChild(divider);

        _mainView = _ce('div', 'discovery-view');
        _mainView.style.cssText = 'flex:0 0 460px;display:flex;justify-content:center;padding:30px 0;gap:20px;margin-right:30px;';
        _viewport.appendChild(_mainView);

        _battleView = _ce('div', 'battle-view');
        _battleView.style.cssText = 'display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:30px;';
        _viewport.appendChild(_battleView);
        // 初始加载序列 — 由 closeIntro() 在点击"激活原体"后触发
        var _animBar = function(fillClass, cb) {
            var bar = document.querySelector('.' + fillClass);
            if (bar) {
                bar.style.transition = 'width 1.2s ease-out';
                bar.style.width = '100%';
                setTimeout(cb, 1300);
            } else { setTimeout(cb, 100); }
        };
        var _animLog = function(msg, cb) { setTimeout(function() { _pushLog(msg, cb); }, 400); };

        var _bootSkip = false;
        var _bootSkipFn = function() { _bootSkip = true; };
        document.addEventListener('click', _bootSkipFn, { once: true });
        window._bootSequence = function() {
            var _animLogSkip = function(msg, cb) {
                if (_bootSkip) { _pushLog(msg, function(){}); cb(); return; }
                setTimeout(function() { _pushLog(msg, cb); }, 400);
            };
            var _animBarSkip = function(fillClass, cb) {
                if (_bootSkip) { var bar = document.querySelector('.' + fillClass); if (bar) { bar.style.transition = 'none'; bar.style.width = '100%'; } cb(); return; }
                var bar = document.querySelector('.' + fillClass);
                if (bar) { bar.style.transition = 'width 1.2s ease-out'; bar.style.width = '100%'; setTimeout(cb, 1300); } else { setTimeout(cb, 100); }
            };
            _animLogSkip('神经链路已建立。', function() {
                _animBarSkip('hp-fill', function() {
                    _animLogSkip('生命已补充完成。', function() {
                        _animBarSkip('ram-fill', function() {
                            _animLogSkip('进程已补充完成。', function() {
                                _animLogSkip('指令扫描中...', function() {
                                    document.removeEventListener('click', _bootSkipFn);
                                    _showScan = true;
                                    _wakingUp = false;
                                    UISystem.render();
                                });
                            });
                        });
                    });
                });
            });
        };

        var skillInfo = _ce('div', 'skill-info-panel');
        skillInfo.id = 'ui-skill-info';
        skillInfo.style.cssText = 'position:absolute;right:25px;bottom:25px;';
        _viewport.appendChild(skillInfo);

        var actionBar = _ce('div', 'action-bar');
        actionBar.id = 'ui-action-bar';
        actionBar.style.cssText = 'position:relative;height:130px;background:#0a0a14;border-top:1px solid var(--border-dim);display:flex;align-items:center;justify-content:center;gap:20px;z-index:500;';
        _root.appendChild(actionBar);

        _modalOverlay = _ce('div', 'modal-overlay');
        _modalOverlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:3000;align-items:center;justify-content:center;flex-direction:column;gap:0;';
        _modalOverlay.addEventListener('click', function(e) { if (e.target === _modalOverlay && !_introActive) { if (_modalOverlay._returnToLab) { _modalOverlay._returnToLab = false; UISystem.showReorganizeModal(); } else { closeModal(); } } });
        _root.appendChild(_modalOverlay);

        _msgOverlay = _ce('div', 'msg-overlay');
        _msgOverlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:3100;align-items:center;justify-content:center;';
        _msgOverlay.addEventListener('click', function(e) { if (e.target === _msgOverlay) _msgOverlay.style.display = 'none'; });
        _root.appendChild(_msgOverlay);

        _juiceContainer = _ce('div', 'juice-container');
        _juiceContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2500;';
        _root.appendChild(_juiceContainer);

        document.addEventListener('click', function(e) {
            var t = e.target.closest && (e.target.closest('button:not(:disabled)') || e.target.closest('.path-card') || e.target.closest('.monster-card'));
            if (t && window.Sound) window.Sound.click();
        });
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        // 统一详情浮窗
        document.addEventListener('mouseover', function(e) {
            var t = e.target.closest && e.target.closest('.help-tip');
            if (!t) return;
            if (t._tip) return;
            var tip = document.createElement('div');
            tip.className = 'help-popup';
            tip.innerHTML = '<div style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:10px 14px;line-height:1.7;max-width:280px;font-size:13px;color:var(--text-dim);word-wrap:break-word;white-space:normal;">' + (t.getAttribute('data-tip') || '').replace(/\n/g, '<br>') + '</div>';
            tip.style.cssText = 'position:fixed;z-index:5000;pointer-events:none;white-space:normal;visibility:hidden;';
            document.body.appendChild(tip);
            t._tip = tip;
            var r = t.getBoundingClientRect();
            var th = tip.offsetHeight;
            tip.style.visibility = 'visible';
            tip.style.left = Math.min(r.left, window.innerWidth - 310) + 'px';
            tip.style.top = (r.top - th - 6) + 'px';
        });
        document.addEventListener('mouseout', function(e) {
            var t = e.target.closest && e.target.closest('.help-tip');
            if (!t || !t._tip) return;
            if (t.contains && t.contains(e.relatedTarget)) return;
            document.body.removeChild(t._tip);
            t._tip = null;
        });
        document.addEventListener('keydown', function(e) {
            // ESC 关闭弹窗/遮罩
            if (e.key === 'Escape') {
                if (_msgOverlay && _msgOverlay.style.display !== 'none') { _msgOverlay.style.display = 'none'; return; }
                if (_modalOverlay.style.display !== 'none' && !_introActive) { if (_modalOverlay._returnToLab) { _modalOverlay._returnToLab = false; UISystem.showReorganizeModal(); } else { closeModal(); } return; }
            }
            // 弹窗打开时阻止战斗键盘操作
            if (_modalOverlay.style.display !== 'none' || (_msgOverlay && _msgOverlay.style.display !== 'none')) return;
            if (CS() && CS().isInBattle()) {
                var gameKeys = ['1','2','3','4','5','6',' ','e','E'];
                if (gameKeys.indexOf(e.key) !== -1) {
                    e.preventDefault();
                    var btns = document.querySelectorAll('.btn-battle-card');
                    var bs4 = CS().getBattleState();
                    var endIdx = bs4 && bs4.phase === 'victory' ? btns.length - 1 : btns.length - 2;
                    var btnIdx = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, ' ': Math.max(0, endIdx), 'e': Math.max(0, btns.length - 1), 'E': Math.max(0, btns.length - 1) }[e.key];
                    if (btnIdx !== undefined && btns[btnIdx]) {
                        var btn = btns[btnIdx];
                        btn.style.transform = 'translateY(2px)'; btn.style.filter = 'brightness(0.8)';
                        setTimeout(function() { btn.style.transform = ''; btn.style.filter = ''; }, 100);
                    }
                    // 同步高亮战斗提示
                    var si = document.getElementById('ui-skill-info');
                    if (si) {
                        var target = si.querySelector('[data-key="' + (e.key === ' ' ? 'Space' : (e.key === 'E' || e.key === 'e' ? 'E' : e.key)) + '"]');
                        if (target) { target.style.filter = 'brightness(1.4)'; target.style.transform = 'translateY(1px)'; }
                    }
                }
                var k = { '1': 'predatory_organ', '2': 'chitin_epidermis', '3': 'gland_core' }[e.key];
                if (k) { var s = k; setTimeout(function() { CS().playCard(s); }, 100); }
                var pIdx = { '4': 0, '5': 1, '6': 2 }[e.key];
                if (pIdx !== undefined) {
                    var potPid = GS().inventory.potions[pIdx];
                    if (potPid) { setTimeout(function() { CS().playCard(null, potPid); }, 100); }
                }
                if (e.key === ' ') { var bs2 = CS().getBattleState(); setTimeout(function() { if (bs2 && bs2.phase === 'victory') CS().exitBattle(); else CS().endTurn(); }, 100); }
                if (e.key === 'e' || e.key === 'E') { setTimeout(function() { CS().flee(); }, 100); }
                if (e.key === 'Tab') {
                    e.preventDefault();
                    var bs3 = CS().getBattleState();
                    if (bs3 && bs3.monsters && bs3.monsters.length > 1) {
                        var next = (bs3.currentTarget + 1) % bs3.monsters.length;
                        CS().selectTarget(next);
                    }
                }
            }
        });
    }

    function render() {
        if (!_root) init(); var gs = GS(); if (!gs) return;
        if (!gs.player.introSeen) { _showIntro(gs); return; }
        // 已有进度的存档直接跳过加载动画
        if (_isFirstLoad && gs.mapState.stepsTaken > 0) {
            _wakingUp = false; _tasksDone = true; _discoveryDone = true; _showScan = true;
            _pushLog('神经链路重新校准。步数 ' + gs.mapState.stepsTaken + ' | B' + (gs.mapState.currentFloor || 1) + 'F');
        }
        // 新游戏（intro已看过）自动启动加载序列
        if (_isFirstLoad && gs.mapState.stepsTaken === 0 && window._bootSequence) { window._bootSequence(); }
        _isFirstLoad = false;
        _renderHUD(gs);
        var inBattle = CS() && CS().isInBattle();
        var taskEl = document.getElementById('ui-task-panel');
        if (taskEl) taskEl.style.display = inBattle ? 'none' : '';
        var roomInfo = document.getElementById('ui-room-info');
        var divider = document.getElementById('ui-divider');
        if (roomInfo) roomInfo.style.display = inBattle ? 'none' : '';
        if (divider) divider.style.display = inBattle ? 'none' : '';
        if (!inBattle) _renderTasks(gs);
        if (inBattle) {
            _mainView.style.display = 'none';
            // 左栏 pointer-events:none 让点击穿透到怪物卡片，但日志保持可滚动
            var leftCol = document.querySelector('.left-panel-col');
            if (leftCol) { leftCol.style.pointerEvents = 'none'; }
            var logEl = document.getElementById('ui-log');
            if (logEl) { logEl.style.pointerEvents = 'auto'; }
            if (_battleView) _battleView.style.cssText = 'position:absolute;inset:0;z-index:350;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;';
            _renderBattle(gs);
        } else {
            var leftCol2 = document.querySelector('.left-panel-col');
            if (leftCol2) { leftCol2.style.pointerEvents = ''; }
            if (_battleView) _battleView.style.cssText = 'display:none;';
            _mainView.style.display = 'flex'; _mainView.style.visibility = 'visible';
            _renderDiscovery(gs);
        }
        _renderActions(gs, inBattle); _updateLog();
    }

    // --- HUD（左中右三列） ---
    function _renderHUD(gs) {
        var p = gs.player;
        var top = document.querySelector('.hud-top');
        top.innerHTML =
            '<div class="hud-col hud-col-l">' +
            '<div class="txt-md txt-green txt-bold"><span class="icon icon-dna icon-pulse"></span>原体-II</div>' +
            '<div class="txt-xs txt-dim" style="margin-top:4px;">路径: ' + gs.mapState.stepsTaken + ' | <span class="txt-gold">基因: ' + p.bp + '</span></div>' +
            '</div>' +
            '<div class="hud-col hud-col-c">' +
            '<div class="hud-labels txt-xs">' +
            _hudLabel('生命', p.hp, p.hp_max, 'icon-health') +
            _hudLabel('进程', p.ram, 10, 'icon-ram') +
            _hudLabel('毒性', p.toxicity, 50, 'icon-tox') +
            _hudLabel('等阶 ' + p.level, p.xp, p.xpToNext, 'icon-upgrade') +
            '</div>' +
            '<div class="hud-bars">' +
            _hudBarFill(p.hp, p.hp_max, (CS() && CS().getBattleState() && CS().getBattleState().playerStatus && CS().getBattleState().playerStatus['toxDebuff'] ? 'tox-fill' : 'hp-fill')) +
            _hudBarFill(p.ram, 10, 'ram-fill') +
            _hudBarFill(p.toxicity, 50, 'tox-fill') +
            _hudBarFill(p.xp, p.xpToNext, 'xp-fill') +
            '</div>' +
            '</div>' +
            '<div class="hud-col hud-col-r">' +
            '<button class="btn btn-blue btn-sm" onclick="UISystem.showHelpPanel()">?</button>' +
            '</div>';
    }

    function _hudLabel(label, val, max, iconClass) {
        return '<div class="hud-bar"><span><span class="icon ' + iconClass + '"></span>' + label + '</span><span>' + val + '/' + max + '</span></div>';
    }

    function _hudBarFill(val, max, fillClass) {
        var pct = Math.min(100, Math.max(0, val / max * 100));
        var startPct = _wakingUp ? '0' : pct;
        return '<div style="width:130px;"><div class="progress-container hp-bar"><div class="progress-fill ' + fillClass + '" style="width:' + startPct + '%;transition:width 1.2s ease-out;"></div></div></div>';
    }

    function _renderDiscovery(gs) {
        _mainView.innerHTML = '';
        var room = gs.mapState.currentRoom;
        var paths = gs.mapState.discoveryPaths || [];
        // 母巢新手区：只显示普通怪物和遗物
        var _campHide = room.type === 'camp' ? { camp: true, elite: true, dungeon: true, portal: true } : null;

        // 初始化完成后直接静态渲染，不再做动画
        if (_discoveryDone) {
            _mainView.style.cssText = 'flex:0 0 460px;display:flex;justify-content:center;padding:30px 0;gap:20px;margin-right:30px;';
            _mainView.innerHTML = '';
            var left = _ce('div');
            left.style.cssText = 'display:flex;flex-direction:column;gap:20px;padding:0 20px 0 0;';
            var roomRaceClr = ''; if (room.monsterId) { var rm = GD().MONSTERS[room.monsterId]; if (rm) { var rcMap = { mutant:'#ff6b4a', swarm:'#9acd32', ember:'#4ab8ff' }; roomRaceClr = rcMap[rm.race] || ''; } }
            left.innerHTML = '<div class="txt-xs txt-green txt-bold" style="letter-spacing:2px;">[传感器扫描完成]</div>' +
                '<div class="txt-lg txt-bold" style="' + (roomRaceClr ? 'color:' + roomRaceClr + ';' : 'color:var(--text-white);') + '"><span class="txt-green">> </span>' + (room.label || '...') + '</div>' +
                '<div class="txt-sm" style="line-height:1.8;color:var(--text-dim);"><span class="txt-green">> </span>' + (room.desc || '...') + '</div>';
            var roomInfo = document.getElementById('ui-room-info');
        if (roomInfo) { roomInfo.innerHTML = ''; roomInfo.appendChild(left); }
            var right = _ce('div');
            right.style.cssText = 'width:100%;max-width:400px;display:flex;flex-direction:column;gap:15px;justify-content:center;';
            if (paths.length === 0) {
                right.innerHTML = '<div class="txt-red txt-center" style="animation:glitch 1s infinite;"><span class="icon icon-hazard-sign"></span>&nbsp;战斗协议激活</div>';
            } else {
                paths.forEach(function(p, i) {
                    if (_campHide && _campHide[p.type]) return;
                    var card = _ce('div', 'path-card');
                    var clrStyle = p.raceClr ? 'color:' + p.raceClr + ';' : '';
                    card.innerHTML = '<div class="txt-xs txt-green">[ 路径 0' + (i+1) + ' ]</div>' +
                        '<div class="txt-sm txt-bold" style="display:flex;align-items:center;gap:6px;margin:8px 0;' + clrStyle + '">' + p.label + '</div>' +
                        '<div class="txt-xs txt-dim">' + p.desc + '</div>';
                    card.onclick = function() {
                        var isCombat = ['monster','elite','boss','dungeon'].indexOf(p.type) !== -1;
                        if (isCombat) {
                            _fadeOutCards(function() {
                                var res = WS().discover(i);
                                if (res.success && res.events && res.events.length > 0) {
                                    res.events.forEach(function(ev) { if (ev.msg) UISystem.showNotification(ev.msg, null, 'var(--accent-yellow)'); });
                                }
                                if (res.success && res.room.type === 'boss') { CS().startBattle(res.room.monsterId); }
                                else if (res.success && res.room.type === 'dungeon') {
                                    var dPool = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'];
                                    var dIds = [dPool[Math.floor(Math.random() * dPool.length)], dPool[Math.floor(Math.random() * dPool.length)]];
                                    CS().startBattle(dIds, { isDungeon: true });
                                }
                                else if (res.success && res.room.type === 'elite') {
                                    var ePool = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'];
                                    var eid = ePool[Math.floor(Math.random() * ePool.length)];
                                    var extras = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER'];
                                    CS().startBattle([eid, extras[Math.floor(Math.random() * extras.length)]], {});
                                }
                                else if (res.success && res.room.type === 'monster') {
                                    var commons = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER'];
                                    var cnt = 1 + Math.floor(Math.random() * 3);
                                    var mids = []; for (var mi = 0; mi < cnt; mi++) mids.push(commons[Math.floor(Math.random() * commons.length)]);
                                    CS().startBattle(mids);
                                }
                                else { render(); }
                            });
                        } else if (p.type === 'portal') {
                            _fadeOutCards(function() { var res = WS().discover(i); render(); });
                        } else if (p.type === 'victory') {
                            _fadeOutCards(function() { var res = WS().discover(i); _showVictoryOverlay(); });
                        } else {
                            // 营地/遗物：只消耗当前卡片，保留其余手牌
                            var res = WS().discover(i);
                            if (res.success && res.events && res.events.length > 0) {
                                res.events.forEach(function(ev) { if (ev.msg) UISystem.showNotification(ev.msg, null, 'var(--accent-yellow)'); });
                            }
                            p._used = true;
                            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                            card.style.opacity = '0'; card.style.transform = 'scale(0.85)';
                            card.style.pointerEvents = 'none';
                            setTimeout(function() {
                                if (card.parentNode) card.remove();
                                var remaining = gs.mapState.discoveryPaths.filter(function(pp) { return !pp._used; });
                                if (remaining.length === 0) { WS().generateNextPaths(); render(); }
                            }, 300);
                        }
                    };
                    right.appendChild(card);
                });
            }
            _mainView.appendChild(right);
            return;
        }

        // === 初始加载动画（只跑一次） ===
        if (_discoveryAnimating) return;
        if (!_tasksDone) return;
        _discoveryAnimating = true;
        _mainView.style.cssText = 'flex:0 0 460px;display:flex;justify-content:center;padding:30px 0;gap:20px;margin-right:30px;';
        _mainView.innerHTML = '';

        var left = _ce('div');
        left.style.cssText = 'display:flex;flex-direction:column;gap:20px;padding:0 20px 0 0;';
        var scanStatus = _ce('div');
        scanStatus.className = 'txt-xs txt-green txt-bold';
        scanStatus.style.cssText = 'font-weight:bold;letter-spacing:2px;' + (_showScan ? '' : 'opacity:0;');
        scanStatus.innerHTML = '<span class="scan-label">[传感器扫描</span>';
        left.appendChild(scanStatus);
        var onScanDone = function() { scanStatus.innerHTML = '[传感器扫描完成]'; };
        var roomTitle = _ce('div');
        roomTitle.className = 'txt-lg txt-white txt-bold';
        roomTitle.innerHTML = '<span class="typewriter"></span>';
        left.appendChild(roomTitle);
        var roomDesc = _ce('div');
        roomDesc.className = 'txt-sm';
        roomDesc.style.cssText = 'line-height:1.8;color:var(--text-dim);';
        roomDesc.innerHTML = '<span class="txt-green">> </span><span class="typewriter"></span>';
        left.appendChild(roomDesc);
        var roomInfo = document.getElementById('ui-room-info');
        if (roomInfo) { roomInfo.innerHTML = ''; roomInfo.appendChild(left); }

        var right = _ce('div');
        right.style.cssText = 'width:100%;max-width:400px;display:flex;flex-direction:column;gap:15px;justify-content:center;';
        if (paths.length === 0) {
            right.innerHTML = '<div class="txt-red txt-center" style="animation:glitch 1s infinite;"><span class="icon icon-hazard-sign"></span>&nbsp;战斗协议激活</div>';
            _mainView.appendChild(right);
        } else {
            var showNextCard = function(idx) {
                if (idx >= paths.length) {
                    _discoveryDone = true;
                    return;
                }
                var p = paths[idx];
                if (_campHide && _campHide[p.type]) { showNextCard(idx + 1); return; }
                var card = _ce('div', 'path-card');
                card.style.cssText = 'opacity:0;transform:translateY(28px) scale(0.9);transition:all 0.55s cubic-bezier(0.34,1.56,0.64,1);';
                var aClrStyle2 = p.raceClr ? 'color:' + p.raceClr + ';' : '';
                card.innerHTML = '<div class="txt-xs txt-green">[ 路径 0' + (idx+1) + ' ]</div>' +
                    '<div class="txt-sm txt-bold" style="display:flex;align-items:center;gap:6px;margin:8px 0;' + aClrStyle2 + '">' + p.label + '</div>' +
                    '<div class="txt-xs txt-dim">' + p.desc + '</div>';
                card.onclick = function() {
                    var res = WS().discover(idx);
                    if (res.success && res.events && res.events.length > 0) {
                        res.events.forEach(function(ev) { if (ev.msg) UISystem.showNotification(ev.msg, null, 'var(--accent-yellow)'); });
                    }
                    if (res.success && res.room.type === 'boss') { CS().startBattle(res.room.monsterId); }
                    else if (res.success && res.room.type === 'dungeon') {
                        var dpool = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'];
                        CS().startBattle([dpool[Math.floor(Math.random()*dpool.length)], dpool[Math.floor(Math.random()*dpool.length)]], { isDungeon: true });
                    }
                    else if (res.success && res.room.type === 'elite') {
                        var epool = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'];
                        var ee = epool[Math.floor(Math.random()*epool.length)];
                        var xp = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER'];
                        CS().startBattle([ee, xp[Math.floor(Math.random()*xp.length)]], {});
                    }
                    else if (res.success && res.room.type === 'monster') {
                        var commons2 = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER'];
                        var cnt2 = 1 + Math.floor(Math.random() * 3);
                        var mids2 = []; for (var mj = 0; mj < cnt2; mj++) mids2.push(commons2[Math.floor(Math.random() * commons2.length)]);
                        CS().startBattle(mids2);
                    }
                    else { render(); }
                };
                right.appendChild(card);
                getComputedStyle(card).opacity; // 强制提交初始状态
                card.style.opacity = '1'; card.style.transform = 'translateY(0) scale(1)';
                setTimeout(function() { showNextCard(idx + 1); }, 650);
            };
            _mainView.appendChild(right);
        }
        roomTitle.innerHTML = '<span class="txt-green">> </span><span class="typewriter"></span>';
        _typeText(roomTitle.querySelector('.typewriter'), (room.label || '...'), function() {
            _typeText(roomDesc.querySelector('.typewriter'), room.desc || '...', function() {
                onScanDone();
                _pushLog('传感器扫描完成。', function() {
                    _pushLog('当前位置已锚定。', function() {
                        if (typeof showNextCard === 'function') showNextCard(0);
                    });
                });
            });
        });
    }

    function _renderBattle(gs) {
        var bs = CS().getBattleState(); if (!bs) return;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _battleView.innerHTML = '';
        var monsters = bs.monsters || [];
        var isVictory = bs.phase === 'victory';
        var raceIcons = { mutant: 'icon-mutant', swarm: 'icon-swarm', ember: 'icon-ember' };
        var raceCardClrs = { mutant: '#ff6b4a', swarm: '#9acd32', ember: '#4ab8ff' };

        // 怪物行容器
        var row = _ce('div');
        row.style.cssText = 'display:flex;gap:25px;justify-content:center;flex-wrap:wrap;width:100%;';
        monsters.forEach(function(mon, idx) {
            var md = GD().MONSTERS[mon.id]; if (!md) return;
            var isTarget = idx === bs.currentTarget;
            var dead = mon.hp <= 0;
            var hpPct = dead ? 0 : Math.min(100, mon.hp / mon.hpMax * 100);
            var mclr = raceCardClrs[md.race] || '#ff4455';

            // 每个怪物一个纵向包裹（relative 定位基准）
            var wrap = _ce('div');
            wrap.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;';

            // 选中怪物的意图详情横条（absolute 在卡片上方，不影响卡片位置）
            var curIntent = mon.intent;
            if (isTarget && !dead && !isVictory && curIntent) {
                var intentClrs = { physical: 'var(--accent-red)', shield: 'var(--accent-blue)', toxin: 'var(--accent-purple)', electric: 'var(--accent-blue)', drain: 'var(--accent-purple)', summon: 'var(--accent-yellow)', scan: 'var(--accent-blue)', charge: 'var(--accent-orange)', stun: 'var(--accent-purple)', enrage: 'var(--accent-red)' };
                var iclr = intentClrs[curIntent.type] || 'var(--accent-red)';
                var intentBar = _ce('div');
                intentBar.style.cssText = 'position:absolute;bottom:calc(100% + 16px);left:0;right:0;background:rgba(255,255,255,0.03);border:1px solid ' + iclr + ';border-radius:4px;padding:8px 14px;';
                var labelText = curIntent.label.replace(/<[^>]*>/g, '').trim();
                intentBar.innerHTML = '<div class="txt-xs txt-bold" style="text-align:center;margin-bottom:2px;color:' + iclr + ';">' + labelText + '</div>' +
                    '<div class="txt-xs txt-dim" style="text-align:left;">' + (curIntent.desc || '') + '</div>';
                wrap.appendChild(intentBar);
            }

            // 怪物卡片
            var card = _ce('div');
            card.className = 'monster-card';
            var cardBorder = dead ? 'var(--border-dim)' : mclr;
            var cardGlow = (isTarget && !dead && !isVictory) ? 'box-shadow:0 0 20px ' + (raceCardClrs[md.race] || '#ff4455') + ';' : '';
            card.style.cssText = 'background:var(--bg-card);border:2px solid ' + cardBorder + ';border-radius:8px;padding:24px;text-align:center;min-width:260px;max-width:340px;' + cardGlow +
                (dead ? 'opacity:0.4;filter:grayscale(0.5);' : '') + 'cursor:' + (isVictory || dead ? 'default' : 'pointer') + ';';
            if (!isVictory && !dead) {
                card.onclick = function() { CS().selectTarget(idx); };
                card.onmouseenter = function() { this.style.borderColor = mclr; this.style.boxShadow = '0 0 12px ' + mclr; };
                card.onmouseleave = function() { this.style.borderColor = isTarget ? mclr : (dead ? 'var(--border-dim)' : mclr); this.style.boxShadow = cardGlow || 'none'; };
            }

            // 图标
            var iconClass = raceIcons[md.race] || 'icon-mutant';
            var ico = _ce('div');
            ico.className = 'icon ' + iconClass + ' icon-lg icon-pulse';
            ico.style.cssText = 'margin:0 auto;' + (dead ? 'color:var(--text-disabled);' : 'color:' + mclr + ';');
            card.appendChild(ico);

            // 名称 + 目标标记
            var nameClr = dead ? 'var(--text-disabled)' : mclr;
            var raceNames = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
            card.innerHTML += '<div class="txt-md txt-bold" style="margin-top:8px;color:' + nameClr + ';">' +
                (isTarget && !dead && !isVictory ? '<span style="color:var(--accent-red);">▸</span> ' : '') + mon.name + '</div>' +
                '<div class="txt-xs" style="margin-top:2px;color:' + (dead ? 'var(--text-disabled)' : mclr) + ';opacity:0.7;">' + (raceNames[md.race] || '') + '</div>';

            // 所有怪物显示简版意图标签
            if (mon.intent && !dead) {
                var intentClrs2 = { physical: 'var(--accent-red)', shield: 'var(--accent-blue)', toxin: 'var(--accent-purple)', electric: 'var(--accent-blue)', drain: 'var(--accent-purple)', summon: 'var(--accent-yellow)', scan: 'var(--accent-blue)', charge: 'var(--accent-orange)', stun: 'var(--accent-purple)', enrage: 'var(--accent-red)' };
                var iclr2 = intentClrs2[mon.intent.type] || 'var(--accent-red)';
                var labelText = mon.intent.label.replace(/<[^>]*>/g, '').trim();
                card.innerHTML += '<div class="txt-xs" style="margin-top:6px;color:' + iclr2 + ';">' + labelText + '</div>';
            }
            if (dead) {
                card.innerHTML += '<div class="txt-xs txt-dim" style="margin-top:6px;">已融毁</div>';
            }

            // HP 条 — 根据状态变色
            var hpBarClass = 'hp-fill';
            if (!dead && !isVictory) {
                if (mon.status['poison']) hpBarClass = 'tox-fill';
                if (mon._dodging) hpBarClass = 'xp-fill';
            }
            card.innerHTML += '<div class="progress-container monster-bar" style="max-width:200px;width:100%;margin:8px auto 0;border:1px solid #442222;">' +
                '<div class="progress-fill ' + hpBarClass + '" style="width:' + hpPct + '%;"></div></div>' +
                '<div class="txt-xs txt-dim" style="margin-top:4px;">' + mon.hp + ' / ' + mon.hpMax + '</div>';

            wrap.appendChild(card);

            // 怪物状态标签（卡片外下方）
            if (!dead && !isVictory) {
                var statusRow = _ce('div');
                statusRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:6px;';
                var hasStatus = false;
                if (mon.status['poison']) {
                    hasStatus = true;
                    var dotPct = bs.dualKey === 'swarm+swarm' ? 8 : 5;
                    statusRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.15);border:1px solid rgba(206,147,216,0.3);border-radius:3px;color:var(--accent-purple);" data-tip="<b>基因毒素</b>&#10;每回合扣除 ' + dotPct + '% 最大HP&#10;剩余 ' + mon.status['poison'] + ' 回合&#10;使用 [腺体脉冲] 可引爆并吸血"><span class="icon icon-poison-gas"></span> 中毒 ' + mon.status['poison'] + '</span>';
                }
                if (mon._shield > 0) {
                    hasStatus = true;
                    statusRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.25);border-radius:3px;color:var(--accent-blue);" data-tip="<b>科技护盾</b>&#10;吸收 ' + mon._shield + ' 点伤害&#10;护盾耗尽后才扣减HP"><span class="icon icon-energy-shield"></span> ' + mon._shield + '</span>';
                }
                if (mon._dodging) {
                    hasStatus = true;
                    statusRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid rgba(255,213,79,0.3);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>产卵闪避</b>&#10;所有攻击全部落空&#10;每3回合切换一次"><span class="icon icon-dodge"></span> 闪避</span>';
                }
                if (mon._charged) {
                    hasStatus = true;
                    statusRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(245,124,0,0.12);border:1px solid rgba(245,124,0,0.3);border-radius:3px;color:var(--accent-orange);" data-tip="<b>蓄力中</b>&#10;下回合释放强力攻击&#10;可在蓄力期使用 [神经阻断] 打断"><span class="icon icon-lightning-arc"></span> 蓄力</span>';
                }
                if (mon._enraged) {
                    hasStatus = true;
                    statusRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,68,85,0.15);border:1px solid rgba(255,68,85,0.3);border-radius:3px;color:var(--accent-red);" data-tip="<b>狂怒</b>&#10;攻击力永久翻倍&#10;速战速决，拖延必败"><span class="icon icon-enrage"></span> 狂怒</span>';
                }
                if (mon._defBuff > 0) {
                    hasStatus = true;
                    statusRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(120,144,156,0.12);border:1px solid rgba(120,144,156,0.25);border-radius:3px;color:var(--text-dim);" data-tip="<b>防御强化</b>&#10;防御力 +' + mon._defBuff + '&#10;建议使用破甲组件或涂层"><span class="icon icon-energy-shield"></span>+ ' + mon._defBuff + '</span>';
                }
                if (hasStatus) wrap.appendChild(statusRow);
            }

            row.appendChild(wrap);
        });
        _battleView.appendChild(row);

        // 玩家状态 — 底部居中，不挤怪物卡片
        if (!isVictory) {
            var pRow = _ce('div');
            pRow.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';
            var p2 = gs.player;
            if (bs.playerStatus['berserk']) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.15);border:1px solid rgba(206,147,216,0.3);border-radius:3px;color:var(--accent-purple);" data-tip="<b>狂暴</b>&#10;攻击力 +50%&#10;每回合扣除 1% 最大HP&#10;剩余 ' + bs.playerStatus['berserk'] + ' 回合"><span class="icon icon-enrage"></span> 狂暴</span>';
            if (bs.playerStatus['bleed']) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,107,122,0.15);border:1px solid rgba(255,107,122,0.3);border-radius:3px;color:var(--accent-red);" data-tip="<b>流血</b>&#10;每回合扣除 4 HP&#10;剩余 ' + bs.playerStatus['bleed'] + ' 回合"><span class="icon icon-dripping-blade"></span> 流血</span>';
            if (bs.shieldAmount > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.3);border-radius:3px;color:var(--accent-blue);" data-tip="<b>科技护盾</b>&#10;吸收 ' + bs.shieldAmount + ' 点伤害"><span class="icon icon-energy-shield"></span> ' + bs.shieldAmount + '</span>';
            var counterTargets = { mutant: '寄生群落', swarm: '机械余烬', ember: '异变者' };
            if (bs.playerRaces && bs.playerRaces.length > 0) {
                var countered = {};
                bs.playerRaces.forEach(function(r) { countered[counterTargets[r]] = true; });
                var cNames = Object.keys(countered);
                if (cNames.length > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid rgba(255,213,79,0.3);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>种族克制 +50%</b>&#10;对 ' + cNames.join('、') + ' 伤害 +50%，无视防御"><span class="icon icon-crossed-swords"></span> ' + cNames.map(function(n) { return '克' + n.slice(0,2); }).join(' ') + '</span>';
            }
            // 组件效果
            var cfx = bs.componentEffects;
            if (cfx) {
                if (cfx.armorPen > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:3px;color:var(--accent-blue);" data-tip="<b>破甲</b>&#10;无视目标 ' + Math.round(cfx.armorPen*100) + '% 防御"><span class="icon icon-shield-crack"></span> ' + Math.round(cfx.armorPen*100) + '%破</span>';
                if (cfx.toxinConv > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.12);border:1px solid rgba(206,147,216,0.25);border-radius:3px;color:var(--accent-purple);" data-tip="<b>毒素转化</b>&#10;攻击伤害的 ' + Math.round(cfx.toxinConv*100) + '% 转为额外毒素伤害"><span class="icon icon-poison-gas"></span> ' + Math.round(cfx.toxinConv*100) + '%毒转</span>';
                if (cfx.lifeDrainChance > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.2);border-radius:3px;color:var(--accent-green);" data-tip="<b>吸血</b>&#10;毒素自溶时 ' + Math.round(cfx.lifeDrainChance*100) + '% 概率吸取 ' + (cfx.lifeDrainAmt||0) + ' HP"><span class="icon icon-dripping-blade"></span> ' + Math.round(cfx.lifeDrainChance*100) + '%吸血</span>';
                if (cfx.thornsPct > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:3px;color:var(--accent-blue);" data-tip="<b>电磁反伤</b>&#10;受到攻击时反弹 ' + Math.round(cfx.thornsPct*100) + '% 伤害"><span class="icon icon-lightning-arc"></span> ' + Math.round(cfx.thornsPct*100) + '%反伤</span>';
                if (cfx.dotBonus > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.12);border:1px solid rgba(206,147,216,0.25);border-radius:3px;color:var(--accent-purple);" data-tip="<b>DOT强化</b>&#10;每回合毒素伤害 +' + cfx.dotBonus + '"><span class="icon icon-poison-gas"></span>+ ' + cfx.dotBonus + '</span>';
                if (cfx.bonusVsSwarm > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.1);border:1px solid rgba(255,213,79,0.2);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>对寄生增伤</b>&#10;对寄生群落种族伤害 +' + Math.round(cfx.bonusVsSwarm*100) + '%"><span class="icon icon-insect"></span> +' + Math.round(cfx.bonusVsSwarm*100) + '%</span>';
            }
            if (p2.toxicity > 0) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.1);border:1px solid rgba(206,147,216,0.2);border-radius:3px;color:var(--accent-purple);" data-tip="<b>基因毒性</b>&#10;当前 ' + p2.toxicity + '/' + (p2.toxicity_max||50) + '&#10;超过 50 时每回合扣血 2%"><span class="icon icon-biohazard"></span> ' + p2.toxicity + '</span>';
            if (p2.activeCoating) pRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid rgba(255,213,79,0.25);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>基因涂层</b>&#10;剩余 ' + (p2.coatingTurnsLeft||0) + ' 回合"><span class="icon icon-paintbrush"></span>涂层</span>';
            if (pRow.children.length > 0) _battleView.appendChild(pRow);
        }
    }

    function _renderActions(gs, inBattle) {
        var bar = document.getElementById('ui-action-bar'); if (!bar) return; bar.innerHTML = '';
        if (inBattle) {
            // 技能详情面板 — 底部左侧，与日志栏对齐
            var bsv = CS().getBattleState();
            var skillInfo = document.getElementById('ui-skill-info');
            if (skillInfo) {
                var ram = gs.player.ram, atk = gs.player.atk;
                var isVictory = bsv && bsv.phase === 'victory';
                var curMonStatus = bsv && bsv.monsters && bsv.monsters[bsv.currentTarget] ? bsv.monsters[bsv.currentTarget].status['poison'] : false;
                var bos2 = GD().BOSS_ORGANS || {};
                var s1Name = (gs.player.predatory_organ.equipped && bos2[gs.player.predatory_organ.equipped] ? bos2[gs.player.predatory_organ.equipped].skillName : '捕食打击');
                var s1Cost = (gs.player.predatory_organ.equipped && bos2[gs.player.predatory_organ.equipped] ? bos2[gs.player.predatory_organ.equipped].skillCost : 2);
                var s2Name = (gs.player.chitin_epidermis.equipped && bos2[gs.player.chitin_epidermis.equipped] ? bos2[gs.player.chitin_epidermis.equipped].skillName : '生物防御');
                var s2Cost = (gs.player.chitin_epidermis.equipped && bos2[gs.player.chitin_epidermis.equipped] ? bos2[gs.player.chitin_epidermis.equipped].skillCost : 3);
                var s3Name = (gs.player.gland_core.equipped && bos2[gs.player.gland_core.equipped] ? bos2[gs.player.gland_core.equipped].skillName : '腺体脉冲');
                var s3Cost = (gs.player.gland_core.equipped && bos2[gs.player.gland_core.equipped] ? bos2[gs.player.gland_core.equipped].skillCost : 3);
                var c1 = isVictory ? false : ram >= s1Cost, c2 = isVictory ? false : ram >= s2Cost, c3 = isVictory ? false : ram >= s3Cost;
                var gc = function(ok, clr) { return ok ? clr : 'var(--text-disabled)'; };
                skillInfo.innerHTML = '<div class="txt-xs txt-green txt-bold" style="margin-bottom:10px;">> 战斗提示</div>' +
                    '<div style="display:flex;flex-direction:column;gap:6px;">' +
                    '<div data-key="1" class="help-tip" style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:6px 14px;' + (c1 ? '' : 'opacity:0.5;') + '" data-tip="<b style=color:var(--accent-red)>' + s1Name + '</b> (' + s1Cost + '进程)&#10;造成 <b>' + atk + '</b> 点<span style=color:var(--accent-red)>物理伤害</span>&#10;30% 概率施加<span style=color:var(--accent-purple)>毒素标记</span>&#10;涂有涂层时附加种族特效">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(c1, 'var(--accent-red)') + ';">[1] ' + s1Name + '</span> <span class="txt-xs txt-dim">' + s1Cost + '进程 · ' + atk + '伤害 · 30%挂毒</span></div>' +
                    '<div data-key="2" class="help-tip" style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:6px 14px;' + (c2 ? '' : 'opacity:0.5;') + '" data-tip="<b style=color:var(--accent-green)>' + s2Name + '</b> (' + s2Cost + '进程)&#10;获得 <b>' + Math.ceil(atk * 0.6) + '</b> 点<span style=color:var(--accent-blue)>临时护盾</span>&#10;优先吸收所有类型伤害&#10;护盾耗尽后才扣减HP">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(c2, 'var(--accent-green)') + ';">[2] ' + s2Name + '</span> <span class="txt-xs txt-dim">' + s2Cost + '进程 · +' + Math.ceil(atk * 0.6) + '护盾</span></div>' +
                    '<div data-key="3" class="help-tip" style="background:var(--bg-card);border:1px solid ' + (c3 && curMonStatus ? 'rgba(255,213,79,0.8)' : 'var(--border-dim)') + ';border-radius:4px;padding:6px 14px;' + (c3 ? '' : 'opacity:0.5;') + (c3 && curMonStatus ? 'box-shadow:0 0 10px rgba(255,213,79,0.4);' : '') + '" data-tip="<b style=color:var(--accent-yellow)>' + s3Name + '</b> (' + s3Cost + '进程)&#10;<span style=color:var(--accent-purple)>目标中毒时</span>：<b>' + (atk * 3) + '</b> 点爆破 + <span style=color:var(--accent-green)>100%吸血</span>&#10;无中毒时：仅轻微酸蚀">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(c3, 'var(--accent-yellow)') + ';">[3] ' + s3Name + '</span> <span class="txt-xs txt-dim">' + s3Cost + '进程 · ' + (c3 && curMonStatus ? '<span style="color:var(--accent-yellow);">⚡连招!</span> ' : '') + (atk * 3) + '爆破</span></div>' +
                    '<div data-key="Space" style="background:var(--bg-card);border:1px solid ' + (isVictory ? 'rgba(0,255,136,0.3)' : 'var(--border-dim)') + ';border-radius:4px;padding:6px 14px;">' +
                    '<span class="txt-xs txt-bold" style="color:' + 'var(--accent-orange)' + ';">[空格] ' + (isVictory ? '退出战斗' : '回合结束 · 回复 3 进程') + '</span></div>' +
                    (isVictory ? '' : '<div data-key="E" style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:6px 14px;' + (ram >= 4 ? '' : 'opacity:0.5;') + '">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(ram >= 4, 'var(--accent-red)') + ';">[E] 紧急切断</span> <span class="txt-xs txt-dim">· 消耗 4 进程 · 脱离战斗</span></div>') +
                    ((!isVictory && gs.inventory.potions.length > 0) ? '<div class="txt-xs txt-purple txt-bold" style="margin-top:4px;">> 魔药 [' + ['4','5','6'].slice(0, gs.inventory.potions.length).join('][') + '] 不消耗进程</div>' : '') +
                    (!isVictory ? gs.inventory.potions.map(function(pid, pi) {
                        var pt = GD().POTIONS[pid]; if (!pt) return '';
                        var pkeys = ['4','5','6'];
                        return '<div data-key="' + pkeys[pi] + '" class="help-tip" style="background:var(--bg-card);border:1px solid rgba(156,39,176,0.3);border-radius:4px;padding:4px 14px;" data-tip="<b style=color:var(--accent-purple)>' + pt.name + '</b>&#10;<span style=color:var(--accent-green)>' + (pt.effect.desc || '') + '</span>&#10;<span style=color:var(--accent-purple)>毒性+' + pt.toxicity + '</span>&#10;<span style=color:var(--accent-red)>' + (pt.sideEffect && pt.sideEffect.desc ? pt.sideEffect.desc : '') + '</span>">' +
                            '<span class="txt-xs txt-bold" style="color:var(--accent-purple);">[' + pkeys[pi] + '] ' + pt.name + '</span> <span class="txt-xs txt-dim">毒性+' + pt.toxicity + '</span></div>';
                    }).join('') : '') +
                    '</div>';
            }

            var bos = GD().BOSS_ORGANS || {};
            var defs = [
                { s: 'predatory_organ', l: '捕食打击', c: 2, cls: 'btn-red', k: '1', i: 'icon-atk' },
                { s: 'chitin_epidermis', l: '生物防御', c: 3, cls: 'btn-green', k: '2', i: 'icon-def' },
                { s: 'gland_core', l: '腺体脉冲', c: 3, cls: 'btn-gold', k: '3', i: 'icon-gland' }
            ];
            var organRaceCls = { '暴君核心': 'btn-red', '蜂后髓核': 'btn-green', '高能电泳核': 'btn-blue' };
            defs.forEach(function (btn) {
                var eq = gs.player[btn.s].equipped;
                if (eq && bos[eq] && bos[eq].skillName) { btn.l = bos[eq].skillName; btn.c = bos[eq].skillCost || btn.c; btn.cls = organRaceCls[eq] || btn.cls; }
                var can = gs.player.ram >= btn.c;
                var b = _ce('button', 'btn btn-battle-card ' + (can ? btn.cls : 'btn-gray'));
                b.innerHTML = '<span class="txt-sm txt-bold"><span class="icon '+btn.i+'"></span>' + btn.l + '</span>' +
                              '<span class="txt-xs">' + btn.c + ' 进程</span>';
                if (can) b.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; var s = btn.s; setTimeout(function() { CS().playCard(s); }, 80); };
                bar.appendChild(b);
            });
            // 魔药按钮
            if (!isVictory) {
                var potions = gs.inventory.potions || [];
                var potData = GD().POTIONS || {};
                potions.forEach(function(pid, pidx) {
                    var pt = potData[pid]; if (!pt) return;
                    var pb = _ce('button', 'btn btn-purple btn-battle-card');
                    pb.innerHTML = '<span class="txt-sm txt-bold"><span class="icon icon-biohazard"></span>' + pt.name + '</span><span class="txt-xs">毒性+' + pt.toxicity + '</span>';
                    pb.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; setTimeout(function() { CS().playCard(null, pid); }, 80); };
                    bar.appendChild(pb);
                });
            }
            // 结束回合 / 逃跑
            var bs = CS().getBattleState();
            if (bs && bs.phase === 'victory') {
                // 地下城：深入按钮
                if (bs.isDungeon && (bs._dungeonFloor || 0) < 2) {
                    var deep = _ce('button', 'btn btn-green btn-battle-card');
                    deep.innerHTML = '<span class="txt-sm">深入地下城</span><span class="txt-xs">B' + ((bs._dungeonFloor||0)+2) + 'F</span>';
                    deep.onclick = function() { this.style.transform = 'translateY(2px)'; setTimeout(function() { CS().dungeonDeep(); }, 80); };
                    bar.appendChild(deep);
                }
                var end = _ce('button', 'btn btn-orange btn-battle-card');
                end.innerHTML = '<span class="txt-sm">退出战斗</span><span class="txt-xs">返回探索</span>';
                end.onclick = function() { this.style.transform = 'translateY(2px)'; setTimeout(function() { CS().exitBattle(); }, 80); };
                bar.appendChild(end);
            } else {
                var end = _ce('button', 'btn btn-orange btn-battle-card');
                end.innerHTML = '<span class="txt-sm">结束回合</span><span class="txt-xs">回复 3 进程</span>';
                end.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; setTimeout(function() { CS().endTurn(); }, 80); };
                bar.appendChild(end);
                // 逃跑按钮
                var fleeBtn = _ce('button', 'btn btn-red btn-battle-card');
                fleeBtn.innerHTML = '<span class="txt-sm">紧急切断</span><span class="txt-xs">消耗 4 进程</span>';
                fleeBtn.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; setTimeout(function() { CS().flee(); }, 80); };
                bar.appendChild(fleeBtn);
            }
        } else {
            var skillInfo = document.getElementById('ui-skill-info');
            if (skillInfo) skillInfo.innerHTML = '';
            // 楼层信息条
            var floor = gs.mapState.currentFloor || 1;
            var pool = gs.mapState.floorNodePool || [];
            var totalN = 0, doneN = 0;
            for (var fi = 0; fi < pool.length; fi++) { if (!pool[fi].hidden) { totalN++; if (pool[fi].exhausted) doneN++; } }
            var pct = totalN > 0 ? Math.round(doneN / totalN * 100) : 0;
            var floorBar = _ce('div');
            floorBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;padding-left:35px;padding-right:25px;font-size:14px;font-family:inherit;';
            floorBar.innerHTML = '<div style="display:flex;align-items:center;gap:16px;">' +
                '<span class="txt-bold" style="color:var(--accent-blue);font-size:16px;">B' + floor + 'F</span>' +
                '<span class="txt-sm txt-bold" style="color:var(--text-main);">节点 ' + doneN + '/' + totalN + '</span>' +
                '<div class="progress-container" style="width:180px;height:8px;"><div class="progress-fill ram-fill" style="width:' + pct + '%;"></div></div>' +
                (gs.mapState.bossDefeated ? '<span style="color:var(--accent-red);">领主已击杀</span>' : (pct >= 60 ? '<span style="color:var(--accent-yellow);">领主已现身</span>' : '')) +
                '</div>' +
                '<div style="display:flex;gap:10px;">' +
                '<button class="btn btn-green" onclick="UISystem.showReorganizeModal()"><span class="icon icon-dna"></span>实验室</button>' +
                '<button class="btn btn-blue" onclick="UISystem.showStatusModal()"><span class="icon icon-archive"></span>档案</button>' +
                '<button class="btn btn-gold" onclick="UISystem.showBestiaryModal()"><span class="icon icon-insect"></span>图鉴</button>' +
                '<button class="btn btn-purple" onclick="UISystem.showSaveModal()"><span class="icon icon-save"></span>存档</button></div>';
            bar.appendChild(floorBar);
        }
    }

    function showHelpPanel() {
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(700px,90vw);max-height:55vh;background:var(--bg-modal);border:2px solid var(--accent-blue);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(0,212,255,0.05);border-bottom:1px solid var(--accent-blue);display:flex;justify-content:space-between;align-items:center;';
        var tabNames = { stats: '基础', fight: '战斗', lab: '实验室', craft: '配方' };
        var tabColors = { stats: 'btn-blue', fight: 'btn-red', lab: 'btn-green', craft: 'btn-gold' };
        var tabBtns = {};
        head.innerHTML = '<div class="txt-md txt-blue txt-bold">[ 原体操作手册 ]</div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-sm" id="help-tab-stats">基础</button>' +
            '<button class="btn btn-sm" id="help-tab-fight">战斗</button>' +
            '<button class="btn btn-sm" id="help-tab-lab">实验室</button>' +
            '<button class="btn btn-sm" id="help-tab-craft">配方</button>' +
            '<button class="btn btn-tab-close btn-sm" onclick="UISystem.closeModal()">关闭</button></div>';
        box.appendChild(head);
        var body = _ce('div');
        body.id = 'ui-help-body';
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;';
        box.appendChild(body);
        _modalOverlay.appendChild(box);
        tabBtns.stats = document.getElementById('help-tab-stats');
        tabBtns.fight = document.getElementById('help-tab-fight');
        tabBtns.lab = document.getElementById('help-tab-lab');
        tabBtns.craft = document.getElementById('help-tab-craft');
        tabBtns.stats.onclick = function() { UISystem._helpTab = 'stats'; UISystem._refreshHelpBody(); };
        tabBtns.fight.onclick = function() { UISystem._helpTab = 'fight'; UISystem._refreshHelpBody(); };
        tabBtns.lab.onclick = function() { UISystem._helpTab = 'lab'; UISystem._refreshHelpBody(); };
        tabBtns.craft.onclick = function() { UISystem._helpTab = 'craft'; UISystem._refreshHelpBody(); };
        UISystem._refreshHelpBody = function() {
            var sel = UISystem._helpTab || 'stats';
            ['stats','fight','lab','craft'].forEach(function(t) { tabBtns[t].className = 'btn btn-sm ' + (sel === t ? tabColors[t] : 'btn-gray'); });
            var el = document.getElementById('ui-help-body'); if (!el) return;
            var tut = GD().TUTORIALS[sel]; if (!tut) return;
            var html = '';
            tut.sections.forEach(function(s) {
                html += '<div style="padding:10px 14px;background:rgba(0,212,255,0.03);border:1px solid rgba(0,212,255,0.12);border-radius:6px;">' +
                    '<div class="txt-xs txt-bold" style="display:flex;align-items:center;gap:6px;' + (s.color ? 'color:' + s.color + ';' : '') + '">' + (s.key || '') + '<span>' + s.label + '</span></div>' +
                    '<div class="txt-xs txt-dim" style="margin-top:4px;">' + s.desc + '</div></div>';
            });
            if (tut.tip) html += '<div style="padding:12px;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.2);border-radius:6px;"><span class="txt-xs txt-green txt-bold">提示：</span><span class="txt-xs txt-dim">' + tut.tip + '</span></div>';
            el.innerHTML = html;
            el.scrollTop = 0;
        };
        UISystem._refreshHelpBody();
    }

    function showSaveModal() {
        var gs = GS(); var p = gs.player;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(700px,90vw);max-height:85vh;background:var(--bg-modal);border:2px solid #9c27b0;border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(156,39,176,0.08);border-bottom:1px solid #9c27b0;display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;">' +
            '<div class="txt-md txt-bold" style="color:var(--accent-purple);">[ 神经序列存档管理 ]</div>' +
            '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button></div>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:15px;overflow-y:auto;flex:1;';
        // 自动存档
        body.innerHTML += '<div style="padding:10px 16px;background:rgba(255,255,255,0.03);border-radius:6px;display:flex;justify-content:space-between;align-items:center;">' +
            '<span class="txt-sm txt-white">自动存档</span><span class="txt-xs txt-dim">等阶 ' + p.level + ' · 步数 ' + gs.mapState.stepsTaken + '</span>' +
            '<span class="txt-xs txt-green">✓ 已保存</span></div>';
        // 3 槽位
        var slots = window.GameState.listSlots();
        for (var i = 0; i < 3; i++) {
            var s = slots[i];
            var infoHTML = '';
            if (s.empty) {
                infoHTML = '<span class="txt-xs txt-dim">空槽位</span>';
            } else {
                var d = new Date(s.time);
                var ts = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
                infoHTML = '<span class="txt-xs txt-dim">等阶 ' + s.level + ' · ' + s.steps + '步 · ' + s.bp + 'BP · ' + ts + '</span>';
            }
            body.innerHTML += '<div style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid var(--border-dim);border-radius:6px;display:flex;justify-content:space-between;align-items:center;">' +
                '<div style="display:flex;flex-direction:column;"><span class="txt-sm txt-white">槽位 ' + (i+1) + '</span>' + infoHTML + '</div>' +
                '<div style="display:flex;gap:10px;">' +
                '<button class="btn btn-green btn-sm" style="padding:2px 10px;font-size:12px;" onclick="GameState.saveToSlot(' + i + ');UISystem.showSaveModal();">保存</button>' +
                (!s.empty ? '<button class="btn btn-blue btn-sm" style="padding:2px 10px;font-size:12px;" onclick="var d=GameState.loadFromSlot(' + i + ');if(d){window._activeGameState=d;location.reload();}">读取</button>' : '') +
                (!s.empty ? '<button class="btn btn-red btn-sm" style="padding:2px 10px;font-size:12px;" onclick="if(confirm(\'删除槽位' + (i+1) + '?\\n不可恢复。\')){GameState.deleteSlot(' + i + ');UISystem.showSaveModal();}">删除</button>' : '') +
                '</div></div>';
        }
        // 导入导出
        body.innerHTML += '<div style="display:flex;gap:10px;margin-top:10px;">' +
            '<button class="btn btn-blue btn-sm" onclick="var t=GameState.exportSaveText();if(t){navigator.clipboard.writeText(t).then(function(){alert(\'序列已复制到剪贴板。\')});}">导出到剪贴板</button>' +
            '<button class="btn btn-blue btn-sm" onclick="var t=prompt(\'粘贴存档序列:\');if(t){var r=GameState.importSaveText(t);if(r.success){alert(\'序列注入成功，即将刷新。\');location.reload();}else{alert(\'错误: \'+r.error);}}">从剪贴板导入</button>' +
            '</div>';
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function showBestiaryModal() {
        var gs = GS();
        var allMonsters = GD().MONSTERS;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box status-modal');
        box.style.cssText = 'width:min(700px,90vw);max-height:55vh;background:var(--bg-modal);border:2px solid #f57f17;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var killedCount = 0; Object.keys(gs.bestiary.killCount || {}).forEach(function(id) { killedCount += (gs.bestiary.killCount[id] || 0); });
        var infoBar = _ce('div');
        infoBar.style.cssText = 'margin-bottom:20px;padding:8px 16px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;width:min(700px,90vw);text-align:left;';
        infoBar.innerHTML = '<span class="txt-xs txt-gold">已击杀 ' + killedCount + ' 只</span><span class="txt-xs txt-dim"> · 共收录 ' + Object.keys(allMonsters).length + ' 种</span>' +
            '<div class="txt-xs txt-dim" style="margin-top:4px;">种族克制：<span style="color:#ff6b4a;">异变者</span> → <span style="color:#9acd32;">寄生</span> → <span style="color:#4ab8ff;">机械</span> → <span style="color:#ff6b4a;">异变者</span> · 对被克种族 +50% 伤害且无视防御</div>';
        _modalOverlay.appendChild(infoBar);
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(245,124,0,0.08);border-bottom:1px solid #f57f17;display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-gold txt-bold">[ 变异体图鉴 ]</div>' +
            '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:15px;overflow-y:auto;flex:1;';
        var killed = gs.bestiary.killCount || {};
        var tierNames = { common: '普通', elite: '精英', world_boss: '世界首领' };
        var raceNames = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
        var raceIcons = { mutant: 'icon-mutant', swarm: 'icon-swarm', ember: 'icon-ember' };
        ['mutant','swarm','ember'].forEach(function(race) {
            var raceHeaderClrs = { mutant: '#ff6b4a', swarm: '#9acd32', ember: '#4ab8ff' };
            body.innerHTML += '<div class="txt-sm txt-bold" style="margin-top:8px;color:' + (raceHeaderClrs[race] || '#ffd54f') + ';"><span class="icon ' + raceIcons[race] + '"></span> ' + raceNames[race] + '</div>';
            Object.keys(allMonsters).forEach(function(id) {
                var m = allMonsters[id];
                if (m.race !== race) return;
                var kc = killed[id] || 0;
                var known = kc > 0;
                var rclr = raceHeaderClrs[m.race] || '#ffd54f';
                var bgClr = known ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)';
                body.innerHTML += '<div style="padding:10px 14px;background:' + bgClr + ';border-radius:4px;border-left:3px solid ' + (known ? rclr : '#333') + ';">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<span class="txt-sm txt-bold" style="color:' + (known ? rclr : 'var(--text-disabled)') + ';">' + (known ? m.name : '???') + '</span>' +
                    '<span class="txt-xs txt-dim">' + (known ? tierNames[m.tier] + ' · Lv.' + m.level : '未遭遇') + '</span>' +
                    '</div>' +
                    (known ? '<div class="txt-xs txt-dim" style="margin-top:4px;">生命:' + m.hp + ' 攻击:' + m.atk + ' 防御:' + m.def + ' | 击杀: ' + kc + ' | ' + m.weakness + '</div>' : '') +
                    '</div>';
            });
        });
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function showStatusModal() {
        var gs = GS(); var p = gs.player;
        // 清除残留悬浮提示
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        // 说明栏（与其他弹窗统一）
        var infoBar = _ce('div');
        infoBar.style.cssText = 'margin-bottom:20px;padding:8px 16px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;width:min(700px,90vw);text-align:left;';
        infoBar.innerHTML = '<div style="margin-bottom:4px;"><span class="txt-xs txt-blue">核心指标</span><span class="txt-xs txt-dim"> — 当前原体的攻击、防御、生命、进程等基础属性</span></div>' +
            '<div style="margin-bottom:4px;"><span class="txt-xs txt-blue">器官状态</span><span class="txt-xs txt-dim"> — 捕食器官、生物表皮、腺体核心的阶位与挂载</span></div>' +
            '<div><span class="txt-xs txt-blue help-tip" data-tip="<b style=\'font-size:14px;color:var(--accent-blue);\'>专精流派：</b>&#10;每升一级获得 1 专精点&#10;可重复投入同一流派叠加属性&#10;双流派组合激活全局被动">专精流派</span><span class="txt-xs txt-dim"> — 升级获得专精点，投入流派叠加属性，双组合激活被动</span></div>';
        _modalOverlay.appendChild(infoBar);
        var box = _ce('div', 'modal-box status-modal');
        box.style.cssText = 'width:min(700px,90vw);max-height:85vh;background:var(--bg-modal);border:2px solid var(--accent-blue);display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(0,212,255,0.05);border-bottom:1px solid var(--accent-blue);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-blue txt-bold">[ 原体序列深度扫描档案 ]</div>' +
                         '<div style="display:flex;gap:10px;">' +
                         (p.masteries[0] || p.masteries[1] ? '<button class="btn btn-red btn-sm" onclick="if(confirm(\'重置全部专精？\\n消耗 50 基因点数。\')){if(' + p.bp + '>=50){var gs=window.GameState.getState();gs.player.bp-=50;gs.player.masteries=[null,null];gs.player.masteryPoints={mutant:0,swarm:0,ember:0};gs.player.availableMasteryPoints+=1;window.GameState.recalcPlayerStats();window.GameState.save();UISystem.render();UISystem.showStatusModal();}}">重置专精</button>' : '') +
                         '<button class="btn btn-red btn-sm" onclick="UISystem.resetGame()">重置序列</button>' +
                         '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button>' +
                         '</div>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;flex:1;';
        // 核心指标
        var atkBase2 = p.atk_base, defBase2 = p.def_base;
        var atkBonus2 = p.atk - atkBase2, defBonus2 = p.def - defBase2, hpBonus2 = p.hp_max - 100, ramBonus2 = p.ram_max - 10;
        var _sv = function(base, bonus) { return bonus > 0 ? base + '<span style="color:var(--accent-green);"> +' + bonus + '</span>' : (bonus < 0 ? base + '<span style="color:var(--accent-red);"> ' + bonus + '</span>' : '' + base); };
        var _tip = function(val, base, bonus) { return '<b>最终: ' + val + '</b>&#10;基础: ' + base + (bonus > 0 ? '&#10;装备/专精加成: +' + bonus : ''); };
        var coreHTML2 = '<div style="padding:15px 20px;background:rgba(0,212,255,0.03);border:1px solid rgba(0,212,255,0.15);border-radius:6px;display:flex;flex-direction:column;gap:10px;">' +
            '<div class="txt-sm txt-blue txt-bold">> 核心序列指标</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="txt-sm">' +
            '<div class="stat-row help-tip" data-tip="' + _tip(p.atk, atkBase2, atkBonus2) + '"><span class="icon icon-atk"></span>攻击: <span class="stat-val txt-bold">' + _sv(atkBase2, atkBonus2) + '</span></div>' +
            '<div class="stat-row help-tip" data-tip="' + _tip(p.def, defBase2, defBonus2) + '"><span class="icon icon-def"></span>防御: <span class="stat-val txt-bold">' + _sv(defBase2, defBonus2) + '</span></div>' +
            '<div class="stat-row help-tip" data-tip="' + _tip(p.hp_max, 100, hpBonus2) + '"><span class="icon icon-health"></span>生命: <span class="stat-val txt-bold">' + _sv(100, hpBonus2) + '</span></div>' +
            '<div class="stat-row help-tip" data-tip="' + _tip(p.ram_max, 10, ramBonus2) + '"><span class="icon icon-ram"></span>进程: <span class="stat-val txt-bold">' + _sv(10, ramBonus2) + '</span></div>' +
            '<div class="stat-row"><span class="icon icon-tox"></span>毒性: <span class="stat-val txt-bold">' + p.toxicity + '/' + (p.toxicity_max||50) + '</span></div>' +
            '<div class="stat-row"><span class="icon icon-upgrade"></span>等级: <span class="stat-val txt-bold">' + p.level + '</span></div>' +
            '<div class="stat-row"><span class="icon icon-dna"></span>基因: <span class="stat-val txt-bold">' + p.bp + '</span></div></div></div>';
        body.innerHTML += coreHTML2;
        // 器官状态
        var organHTML = '<div style="padding:15px 20px;background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.15);border-radius:6px;display:flex;flex-direction:column;gap:10px;">' +
            '<div class="txt-sm txt-green txt-bold">> 已挂载器官状态</div>';
        var organNames = { predatory_organ: '捕食器官', chitin_epidermis: '生物表皮', gland_core: '腺体核心' };
        var organClrs2 = { '暴君核心': { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.08)', bd: 'rgba(255,107,74,0.2)' }, '蜂后髓核': { hex: '#9acd32', bg: 'rgba(154,205,50,0.08)', bd: 'rgba(154,205,50,0.2)' }, '高能电泳核': { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.08)', bd: 'rgba(74,184,255,0.2)' } };
        ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function(s) {
            var d = p[s];
            var ocl = organClrs2[d.equipped] || { hex: 'var(--accent-green)', bg: 'rgba(0,255,136,0.08)', bd: 'rgba(0,255,136,0.2)' };
            organHTML += '<div style="display:flex;flex-direction:column;gap:6px;">' +
                '<div style="display:flex;align-items:center;gap:8px;"><span class="txt-xs txt-green txt-bold">' + organNames[s] + '</span> <span class="txt-xs" style="color:var(--accent-green);">[' + d.tier + '阶]</span></div>' +
                '<div class="txt-xs txt-dim" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
                '<span>挂载: </span><span class="help-tip" style="padding:6px 10px;font-size:13px;background:' + ocl.bg + ';border:1px solid ' + ocl.bd + ';border-radius:4px;color:' + ocl.hex + ';" data-tip="' + (d.equipped ? '<b style=color:' + ocl.hex + '>' + d.equipped + '：</b>&#10;' + ((GD().BOSS_ORGANS[d.equipped] || {}).skillEffect ? GD().BOSS_ORGANS[d.equipped].skillName + '&#10;消耗 ' + GD().BOSS_ORGANS[d.equipped].skillCost + ' 进程' : 'Boss 专属器官') : '<b style=color:var(--accent-green)>标准原型：</b>&#10;默认器官，可被 Boss 掉落替换') + '">' + (d.equipped || '标准原型') + '</span>';
            var slots = d.component_slots || [null, null];
            var comps = GD().COMPONENTS || {};
            [0,1].forEach(function(si) {
                var cid = slots[si];
                if (cid && comps[cid] && comps[cid].affixes) {
                    var sa = comps[cid].affixes; var sp2 = [];
                    if (sa.atkBonus) sp2.push('攻击+' + sa.atkBonus);
                    if (sa.flatDefBonus) sp2.push('防御+' + sa.flatDefBonus);
                    if (sa.shieldBonus) sp2.push('生命+' + sa.shieldBonus);
                    if (sa.physMultiplier) sp2.push('物理×' + sa.physMultiplier);
                    if (sa.armorPenetration) sp2.push('破甲' + Math.round(sa.armorPenetration*100) + '%');
                    if (sa.toxinConversion) sp2.push('毒素转化' + Math.round(sa.toxinConversion*100) + '%');
                    if (sa.lifeDrainChance) sp2.push('吸血' + Math.round(sa.lifeDrainChance*100) + '%' + (sa.lifeDrainAmount ? '·' + sa.lifeDrainAmount + 'HP' : ''));
                    if (sa.thornsPercent) sp2.push('反伤' + Math.round(sa.thornsPercent*100) + '%');
                    if (sa.dotBonus) sp2.push('毒伤+' + sa.dotBonus);
                    if (sa.bonusVsSwarm) sp2.push('对寄生+' + Math.round(sa.bonusVsSwarm*100) + '%');
                    organHTML += '<span class="txt-xs txt-dim"> 组件: </span><span class="help-tip" style="padding:6px 10px;font-size:13px;background:rgba(255,213,79,0.08);border:1px solid rgba(255,213,79,0.2);border-radius:4px;color:var(--accent-yellow);" data-tip="<b>' + cid + '</b>&#10;' + sp2.join(' · ') + '">' + cid + '</span>';
                } else if (!cid) {
                    organHTML += '<span class="txt-xs txt-dim"> 组件: </span><span style="padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:4px;color:var(--text-dim);">空槽</span>';
                }
            });
            organHTML += '</div>';
            organHTML += '</div>';
        });
        organHTML += '</div>';
        body.innerHTML += organHTML;
        // 专精流派
        var mk = (p.masteries[0] && p.masteries[1]) ? [p.masteries[0], p.masteries[1]].sort().join('+') : '';
        var races = ['mutant', 'swarm', 'ember'];
        var raceNames = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
        var raceClrs = { mutant: { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.08)', bd: 'rgba(255,107,74,0.2)', txt: '#ff6b4a' }, swarm: { hex: '#9acd32', bg: 'rgba(154,205,50,0.08)', bd: 'rgba(154,205,50,0.2)', txt: '#9acd32' }, ember: { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.08)', bd: 'rgba(74,184,255,0.2)', txt: '#4ab8ff' } };
        var dc = mk ? GD().DUAL_CLASSES[mk] : null;
        var selRace = p.masteries[0] || p.masteries[1] || 'mutant';
        var mc = raceClrs[selRace] || raceClrs.mutant;
        var masteryHTML = '<div style="padding:15px 20px;background:' + mc.bg + ';border:1px solid ' + mc.bd + ';border-radius:6px;display:flex;flex-direction:column;gap:10px;">' +
            '<div class="txt-sm txt-bold" style="color:' + mc.txt + ';">> 专精流派（每点提升属性，双流派激活被动） <span class="txt-gold">可用:' + p.availableMasteryPoints + '</span></div>';
        if (dc) { var dcClr2 = dc.color || 'var(--accent-yellow)'; masteryHTML += '<div style="padding:12px;background:rgba(255,213,79,0.05);border:1px solid var(--accent-yellow);border-radius:4px;"><div class="txt-sm txt-bold help-tip" style="color:' + dcClr2 + ';" data-tip="<b style=color:' + dcClr2 + '>' + dc.name + '：</b>&#10;<b>' + dc.passive + '</b>&#10;' + dc.passiveDesc + '">' + dc.name + '</div><div class="txt-xs" style="color:' + dcClr2 + ';">' + dc.passiveDesc + '</div></div>'; }
        // 只选一个时，预览可选的双专精
        var selOne = p.masteries[0] || p.masteries[1];
        if (selOne && !dc) {
            var previewHTML = '';
            var selRaceName = raceNames[selOne] || selOne;
            races.forEach(function(r2) {
                var key = [selOne, r2].sort().join('+');
                var d2 = GD().DUAL_CLASSES[key];
                if (d2) {
                    var rc2 = raceClrs[r2] || raceClrs.mutant;
                    var needRace = r2 === selOne ? selRaceName + '（再投入1点）' : (raceNames[r2] || r2);
                    var dcClr = d2.color || 'var(--accent-yellow)';
                    previewHTML += '<div style="padding:10px 14px;background:' + rc2.bg + ';border:1px solid ' + rc2.bd + ';border-radius:6px;display:flex;flex-direction:column;gap:4px;">' +
                        '<div style="display:flex;align-items:center;gap:8px;"><span class="txt-sm txt-bold" style="color:' + dcClr + ';">' + d2.name + '</span><span class="txt-xs txt-dim">需要：' + needRace + '</span></div>' +
                        '<div class="txt-xs txt-dim" style="color:' + dcClr + ';">' + d2.passiveDesc + '</div></div>';
                }
            });
            if (previewHTML) masteryHTML += '<div class="txt-xs txt-dim" style="margin-top:8px;">单流派已提供属性加成。选两个不同流派可激活下方双专精被动：</div><div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">' + previewHTML + '</div>';
        }
        var mData = GD().MASTERIES || {};
        var raceTips = {};
        races.forEach(function(r) {
            var m = mData[r]; if (!m) return;
            var rc3 = raceClrs[r] || raceClrs.mutant;
            var parts = [];
            if (m.statsPerPoint.hp_max) parts.push('生命+' + m.statsPerPoint.hp_max);
            if (m.statsPerPoint.atk) parts.push('攻击+' + m.statsPerPoint.atk);
            if (m.statsPerPoint.def) parts.push('防御+' + m.statsPerPoint.def);
            if (m.statsPerPoint.ram_max) parts.push('进程上限+' + m.statsPerPoint.ram_max);
            var pts = p.masteryPoints[r] || 0;
            raceTips[r] = '<b style=\'font-size:14px;color:' + rc3.txt + ';\'>' + m.name + '：</b>&#10;<span style=\'font-size:14px;\'>每级：' + parts.join('、') + '</span>&#10;<b>特质：</b>' + (m.traits ? m.traits.join(' · ') : '') + (pts > 0 ? '&#10;<b>已投入：</b>' + pts + ' 点' : '');
        });
        masteryHTML += '<div style="display:flex;flex-direction:column;gap:10px;">';
        [0, 1].forEach(function(si) {
            masteryHTML += '<div class="txt-xs txt-dim" style="display:flex;align-items:center;gap:10px;">流派' + (si+1) + ': ';
            if (p.masteries[si]) {
                var src = raceClrs[p.masteries[si]] || raceClrs.mutant;
                var pts2 = p.masteryPoints[p.masteries[si]] || 0;
                masteryHTML += '<span class="help-tip mastery-btn" style="display:inline-block;min-width:90px;text-align:center;padding:6px 10px;font-size:13px;background:' + src.bg + ';border:1px solid ' + src.bd + ';border-radius:4px;color:' + src.txt + ';" data-tip="' + (raceTips[p.masteries[si]] || '') + '&#10;&#10;点击流派可重置退还全部点数" onclick="GameState.resetMastery(' + si + ');UISystem.render();UISystem.showStatusModal();">' + raceNames[p.masteries[si]] + ' <span class="txt-xs" style="color:' + src.txt + ';">+' + pts2 + '</span></span>';
                if (p.availableMasteryPoints > 0) {
                    masteryHTML += '<button class="btn btn-green btn-sm" style="padding:2px 8px;font-size:12px;margin-left:4px;" onclick="GameState.learnMastery(\'' + p.masteries[si] + '\',' + si + ');UISystem.render();UISystem.showStatusModal();">+1</button>';
                }
                // 切换流派选项
                masteryHTML += '<span class="txt-xs txt-dim" style="margin-left:6px;">切换:</span>';
                races.forEach(function(r) {
                    if (r === p.masteries[si]) return;
                    var srr = raceClrs[r] || raceClrs.mutant;
                    if (p.availableMasteryPoints > 0) {
                        masteryHTML += '<span style="display:inline-block;padding:4px 8px;font-size:12px;background:' + srr.bg + ';border:1px solid ' + srr.bd + ';border-radius:4px;cursor:pointer;color:' + srr.txt + ';margin-left:4px;" onclick="GameState.learnMastery(\'' + r + '\',' + si + ');UISystem.render();UISystem.showStatusModal();">' + raceNames[r] + '</span>';
                    } else {
                        masteryHTML += '<span style="display:inline-block;padding:4px 8px;font-size:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--text-disabled);margin-left:4px;">' + raceNames[r] + '</span>';
                    }
                });
            } else {
                masteryHTML += '<span style="display:inline-block;min-width:90px;text-align:center;padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--text-disabled);">空</span>';
                races.forEach(function(r) {
                    var srr = raceClrs[r] || raceClrs.mutant;
                    if (p.availableMasteryPoints > 0) {
                        masteryHTML += '<span class="help-tip" style="display:inline-block;min-width:90px;text-align:center;padding:6px 10px;font-size:13px;background:' + srr.bg + ';border:1px solid ' + srr.bd + ';border-radius:4px;cursor:pointer;color:' + srr.txt + ';" data-tip="' + (raceTips[r] || '') + '" onclick="GameState.learnMastery(\'' + r + '\',' + si + ');UISystem.render();UISystem.showStatusModal();">' + raceNames[r] + '</span>';
                    } else {
                        masteryHTML += '<span class="help-tip" style="display:inline-block;min-width:90px;text-align:center;padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--text-disabled);" data-tip="' + (raceTips[r] || '') + '">' + raceNames[r] + '</span>';
                    }
                });
            }
            masteryHTML += '</div>';
        });
        masteryHTML += '</div>';
        body.innerHTML += masteryHTML;
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function _claimReward(taskId, reward, rewardDesc) {
        var gs = GS(); if (!gs) return;
        var p = gs.player;
        if (!p.claimedTaskRewards) p.claimedTaskRewards = [];
        if (p.claimedTaskRewards.indexOf(taskId) !== -1) return;
        p.claimedTaskRewards.push(taskId);
        p.bp += (reward || 0);
        window.GameState.save();
        _pushLog('指令完成：' + rewardDesc);
        UISystem.showNotification(rewardDesc || '奖励已领取', null, 'var(--accent-yellow)');
        UISystem.render();
    }

    function _renderTasks(gs) {
        var el = document.getElementById('ui-task-panel'); if (!el) return;
        // 已完成动态加载，直接静态显示
        if (_tasksDone) {
            var p2 = gs.player; var comp2 = gs.mapState.completedTasks || [];
            var claimed = p2.claimedTaskRewards || [];
            var h = '<div class="txt-xs txt-green txt-bold" style="margin-bottom:6px;letter-spacing:2px;">[指令扫描完成]</div>';
            var stages2 = _getTaskStages(gs);
            if (!gs.mapState._taskJustDone) gs.mapState._taskJustDone = {};
            stages2.forEach(function(tier) { tier.forEach(function(t) { if (t.c() && comp2.indexOf(t.id) === -1) { comp2.push(t.id); gs.mapState._taskJustDone[t.id] = true; } }); });
            var allPending = [];
            for (var ii = 0; ii < stages2.length; ii++) {
                var stage = stages2[ii];
                var unclaimed = stage.filter(function(t) { return t.c() && claimed.indexOf(t.id) === -1; });
                if (unclaimed.length > 0) { allPending = unclaimed; break; }
                var incomplete = stage.filter(function(t) { return comp2.indexOf(t.id) === -1; });
                if (incomplete.length > 0) { allPending = incomplete; break; }
            }
            var showing = [];
            for (var j = 0; j < allPending.length; j++) {
                var t = allPending[j];
                var isDone = t.c();
                var justDone = isDone && gs.mapState._taskJustDone && gs.mapState._taskJustDone[t.id];
                var isClaimed = claimed.indexOf(t.id) !== -1;
                showing.push({ t: t, done: isDone, justDone: !!justDone, claimed: isClaimed });
            }
            if (showing.length === 0) showing.push({ t: { t: '所有序列指令已完成', id: '_all' }, done: true, justDone: false, claimed: true });
if (showing.length === 0) h += '<div class="txt-xs txt-dim" style="margin-top:4px;">探索路径 → 击败 Boss → 进入传送门推进楼层</div>';
            showing.forEach(function(s) {
                var style = '';
                var tag = '';
                if (s.justDone && !s.claimed) {
                    tag = ' <span class="txt-green" style="cursor:pointer;" onclick="UISystem._claimReward(\'' + s.t.id + '\',' + (s.t.reward||0) + ',\'' + (s.t.rewardDesc||'奖励') + '\')">[领取' + (s.t.rewardDesc||'') + ']</span>';
                } else if (s.done && s.claimed) {
                    style = 'text-decoration:line-through;color:var(--text-disabled);';
                }
                h += '<div class="txt-xs" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;' + style + '"><span><span class="' + ('txt-green') + '">></span> ' + s.t.t + '</span>' + tag + '</div>';
            });
            el.style.display = '';
            el.innerHTML = h;
            return;
        }
        var p = gs.player; var comp = gs.mapState.completedTasks || [];
        var stages = _getTaskStages(gs);

        // 自动完成已达成的任务
        stages.forEach(function(tier) {
            tier.forEach(function(t) { if (t.c() && comp.indexOf(t.id) === -1) comp.push(t.id); });
        });

        // 找当前阶段未完成的任务
        var pending = [];
        for (var i = 0; i < stages.length; i++) {
            var tierPending = stages[i].filter(function(t) { return comp.indexOf(t.id) === -1; });
            if (tierPending.length > 0) {
                pending = tierPending.slice(0, 3);
                break;
            }
        }
        // 全完成了
        if (pending.length === 0) pending = [{ t: '> 所有序列指令已完成', c: function(){return true;} }];

        if (!_showScan) { el.style.display = 'none'; return; }
        if (_tasksAnimating) return;
        el.style.display = '';
        _tasksAnimating = true;
        // 先显示背景框+扫描标题
        el.innerHTML = '<div class="txt-xs txt-green txt-bold scan-label" style="margin-bottom:6px;letter-spacing:2px;">[指令扫描</div>';
        // 等扫描动画后开始逐行打字
        setTimeout(function() {
            var titleEl = el.querySelector('.scan-label');
            var taskDelay = 0;
            var taskCount = pending.length;
            var taskDone = 0;
            pending.forEach(function (t, ti) {
                var done = t.c ? t.c() : false;
                var prefix = done ? '✓ ' : '';
                var msg = prefix + t.t;
                setTimeout(function() {
                    var div = document.createElement('div');
                    div.className = 'txt-xs ' + (done ? 'txt-dim' : '');
                    div.style.cssText = 'margin-bottom:8px;letter-spacing:1px;';
                    div.innerHTML = '<span class="' + (done ? 'txt-green' : 'txt-dim') + '">></span> <span class="typewriter"></span>';
                    el.appendChild(div);
                    _typeText(div.querySelector('.typewriter'), msg, function() {
                        taskDone++;
                        if (taskDone >= taskCount && titleEl) {
                            titleEl.className = 'txt-xs txt-green txt-bold';
                            titleEl.style.cssText = 'margin-bottom:6px;letter-spacing:2px;';
                            titleEl.innerHTML = '[指令扫描完成]';
                            // 日志: 指令扫描完成 → 传感器扫描中... → 触发房间动画
                            _pushLog('指令扫描完成。', function() {
                                _pushLog('传感器扫描中...', function() {
                                    _tasksDone = true;
                                    UISystem.render();
                                });
                            });
                        }
                    });
                }, taskDelay);
                taskDelay += msg.length * 40 + 1200;
            });
        }, 1200);
    }

    function _getTaskStages(gs) {
        var p = gs.player;
        var killCount = Object.values(gs.bestiary.killCount || {}).reduce(function(a,b){return a+b;}, 0);
        var hasEliteKill = Object.keys(gs.bestiary.killCount || {}).some(function(k) { var m = GD().MONSTERS[k]; return m && m.tier === 'elite'; });
        var hasBossKill = Object.keys(gs.bestiary.killCount || {}).some(function(k) { var m = GD().MONSTERS[k]; return m && m.tier === 'world_boss'; });
        var hasUpgraded = (p.predatory_organ.tier > 1 || p.chitin_epidermis.tier > 1 || p.gland_core.tier > 1);
        var potionUsed = p._potionsUsed > 0;
        var hasRelic = (p.relicsFound || 0) > 0;
        var hasDungeon = (p.dungeonsEntered || 0) > 0;
        var _r = function(id, text, cond, reward, rewardDesc) {
            return { id: id, t: text, c: cond, reward: reward || 0, rewardDesc: rewardDesc || '' };
        };
        return [
            [_r('explore3', '探索 3 条路径', function () { return gs.mapState.stepsTaken >= 3; }, 10, '+10 基因点数'),
             _r('first_kill', '完成首次击杀', function () { return killCount >= 1; }, 15, '+15 基因点数'),
             _r('reach_lv2', '原体升至等阶 2', function () { return p.level >= 2; }, 20, '+20 基因点数')],
            [_r('find_relic', '发现基因遗物', function () { return hasRelic; }, 25, '+25 基因点数'),
             _r('kill_elite', '击败精英变异体', function () { return hasEliteKill; }, 30, '+30 基因点数'),
             _r('use_potion', '使用一次炼金魔药', function () { return potionUsed; }, 20, '+20 基因点数')],
            [_r('upgrade_organ', '进阶任意器官至阶 2', function () { return hasUpgraded; }, 30, '+30 基因点数'),
             _r('enter_dungeon', '深入地下城', function () { return hasDungeon; }, 40, '+40 基因点数'),
             _r('reach_lv5', '原体升至等阶 5', function () { return p.level >= 5; }, 50, '+50 基因点数')],
            [_r('kill_15', '累计击杀 15 只变异体', function () { return killCount >= 15; }, 60, '+60 基因点数'),
             _r('kill_boss', '挑战并击败区域领主', function () { return hasBossKill; }, 100, '+100 基因点数'),
             _r('reach_lv8', '原体升至等阶 8', function () { return p.level >= 8; }, 80, '+80 基因点数')]
        ];
    }

    function triggerShake(id) {
        var el = document.getElementById(id); if (!el) return;
        el.style.transform = 'translateX(10px)'; setTimeout(function(){ el.style.transform = 'translateX(-10px)'; }, 50); setTimeout(function(){ el.style.transform = 'translateX(5px)'; }, 100); setTimeout(function(){ el.style.transform = 'translateX(0)'; }, 150);
    }

    function showDamageFloat(val, color, targetId) {
        var el = _ce('div', 'damage-float'); el.style.cssText = 'position:fixed;font-weight:bold;font-size:32px;color:' + color + ';z-index:4000;pointer-events:none;transition:all 0.8s ease-out;'; el.innerHTML = val;
        var startX = (targetId === 'monster') ? window.innerWidth / 2 : 200;
        var startY = (targetId === 'monster') ? window.innerHeight / 2 - 50 : 100;
        el.style.left = startX + 'px'; el.style.top = startY + 'px'; document.body.appendChild(el);
        requestAnimationFrame(function() { el.style.opacity = '0'; el.style.transform = 'translateY(-80px) scale(1.5)'; });
        setTimeout(function() { document.body.removeChild(el); }, 800);
    }

    function _ce(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
    function _fadeOutCards(cb) {
        var cards = document.querySelectorAll('.path-card');
        cards.forEach(function(c) {
            c.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
            c.style.opacity = '0';
            c.style.transform = 'translateY(8px)';
        });
        setTimeout(function() { if (cb) cb(); }, 250);
    }

    function _showVictoryOverlay() {
        var gs = GS();
        var p = gs.player;
        var stats = '原体等级 ' + p.level + '  |  击杀 ' + Object.values(gs.bestiary.killCount || {}).reduce(function(a,b){return a+b;},0) + '  |  遗物 ' + (p.relicsFound || 0) + '  |  地下城 ' + (p.dungeonsEntered || 0);
        var ov = document.createElement('div');
        ov.id = 'victory-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,0.95);';
        ov.innerHTML = '<div style="width:min(650px,90vw);padding:50px 40px 30px 40px;text-align:left;">' +
            '<div class="txt-lg txt-green txt-bold" style="margin-bottom:24px;">基因序列 · 完整</div>' +
            '<div style="display:flex;flex-direction:column;gap:0;" id="victory-log"></div>' +
            '<div class="txt-xs txt-green" style="margin-top:20px;opacity:0;transition:opacity 0.5s;" id="victory-stats">' + stats + '</div>' +
            '<button class="btn btn-green btn-capsule" id="victory-restart-btn" style="margin-top:24px;padding:10px 40px;font-size:14px;opacity:0;transition:opacity 0.5s;">开始新的循环</button></div>';
        document.body.appendChild(ov);
        var lines = [
            { text: '三股毁灭力量已被清除。', cls: 'txt-sm txt-dim', delay: 400 },
            { text: '变异血肉 — 暴君序列崩解。', cls: 'txt-sm txt-dim', delay: 300 },
            { text: '寄生群落 — 蜂后巢穴坍塌。', cls: 'txt-sm txt-dim', delay: 300 },
            { text: '机械余烬 — 安保核心融毁。', cls: 'txt-sm txt-dim', delay: 300 },
            { text: '黑平线实验室终于归于沉寂。', cls: 'txt-sm txt-dim', delay: 400 },
            { text: '你的原体完成了不可能的终极进化。', cls: 'txt-md txt-green txt-bold', delay: 600 }
        ];
        var log = document.getElementById('victory-log');
        var idx = 0;
        var showNext = function() {
            if (idx >= lines.length) {
                var statsEl = document.getElementById('victory-stats');
                var btn = document.getElementById('victory-restart-btn');
                if (statsEl) statsEl.style.opacity = '1';
                if (btn) { btn.style.opacity = '1'; btn.onclick = function() { ov.remove(); window.GameState.reset(); window.GameState.init(); render(); }; }
                return;
            }
            var li = lines[idx];
            var div = document.createElement('div');
            div.className = li.cls;
            div.style.cssText = 'margin-bottom:10px;';
            div.innerHTML = '<span class="txt-green">></span> <span class="typewriter"></span>';
            log.appendChild(div);
            _typeText(div.querySelector('.typewriter'), li.text, function() {
                idx++;
                setTimeout(showNext, li.delay);
            }, 30);
        };
        setTimeout(showNext, 500);
    }

    function _showIntro(gs) {
        _introActive = true;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div');
        box.style.cssText = 'width:min(650px,90vw);padding:50px 40px 30px 40px;text-align:left;';
        box.innerHTML = '<div class="txt-lg txt-green txt-bold" style="margin-bottom:24px;">黑平线：原体觉醒</div>' +
            '<div style="display:flex;flex-direction:column;gap:0;" id="intro-log"></div>' +
            '<button class="btn btn-green btn-capsule" id="intro-btn" style="margin-top:24px;padding:10px 40px;font-size:14px;opacity:0;transition:opacity 0.5s;">激活原体</button>';
        _modalOverlay.appendChild(box);
        var lines = [
            { text: '神经链路初始化...', cls: 'txt-xs txt-dim', delay: 200 },
            { text: '黑平线超生物复合实验室 B1F', cls: 'txt-xs txt-green', delay: 600 },
            { text: '2099年，基因剥离计划「余烬」彻底失控。', cls: 'txt-sm txt-dim', delay: 400 },
            { text: '三股力量在深达数千米的地下疯狂增殖：变异血肉、寄生毒素飞蛾、纳米真菌改写的安保机械。', cls: 'txt-sm txt-dim', delay: 300 },
            { text: '你是唯一的——', cls: 'txt-sm txt-dim', delay: 200 },
            { text: '原体-II · 无限拟态白血球始祖', cls: 'txt-md txt-green txt-bold', delay: 600 },
            { text: '链接已建立。苏醒吧。', cls: 'txt-sm txt-green', delay: 500 }
        ];
        var log = document.getElementById('intro-log');
        var idx = 0;
        var showNext = function() {
            if (idx >= lines.length) {
                var btn = document.getElementById('intro-btn');
                if (btn) { btn.style.opacity = '1'; btn.onclick = function() { UISystem.closeIntro(); }; }
                return;
            }
            var li = lines[idx];
            var div = document.createElement('div');
            div.className = li.cls;
            div.style.cssText = 'margin-bottom:10px;';
            div.innerHTML = '<span class="txt-green">></span> <span class="typewriter"></span>';
            log.appendChild(div);
            _typeText(div.querySelector('.typewriter'), li.text, function() {
                idx++;
                setTimeout(showNext, li.delay);
            }, 30);
        };
        setTimeout(showNext, 300);
    }
    function closeIntro() {
        _introActive = false;
        var gs = GS(); if (gs) { gs.player.introSeen = true; GameState.save(); }
        _modalOverlay.style.display = 'none';
        _wakingUp = true;
        _isFirstLoad = false;
        UISystem.render();
        // 激活原体后启动加载动画序列
        setTimeout(function() {
            if (window._bootSequence) window._bootSequence();
        }, 600);
    }
    function showNotification(title, subtitle, color) {
        var el = _ce('div');
        el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3500;' +
            'background:rgba(5,8,12,0.95);border:1px solid ' + (color || 'var(--accent-green)') + ';' +
            'border-radius:8px;padding:20px 40px;min-width:280px;text-align:center;pointer-events:none;opacity:0;';
        el.innerHTML = '<div class="txt-lg txt-bold" style="color:' + (color || 'var(--accent-green)') + ';">' + title + '</div>' +
            (subtitle ? '<div class="txt-sm txt-dim" style="margin-top:10px;">' + subtitle + '</div>' : '');
        document.body.appendChild(el);
        requestAnimationFrame(function() {
            el.style.transition = 'opacity 0.4s, transform 0.4s';
            el.style.opacity = '1';
            el.style.transform = 'translate(-50%,-50%) scale(1.05)';
        });
        setTimeout(function() {
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%,-50%) translateY(-20px)';
        }, 1600);
        setTimeout(function() { document.body.removeChild(el); }, 2100);
    }
    function closeModal() { _modalOverlay.style.display = 'none'; }
    function resetGame() {
        if (confirm('确认重置全部序列数据？\n\n此操作将清除所有存档、装备和探索进度，且不可撤销。')) {
            GameState.reset();
            location.reload();
        }
    }
    var _lastLogLen = 0;
    function _updateLog() { var el = document.getElementById('ui-log'); if (!el) return; var bs = CS().getBattleState(); if (bs && bs.log) { var entries = bs.log; if (entries.length === _lastLogLen) return; var newEntries = entries.slice(_lastLogLen); _lastLogLen = entries.length; newEntries.reverse().forEach(function(l, i) { var div = document.createElement('div'); div.className = 'txt-xs txt-dim'; div.style.cssText = 'margin-bottom:5px;'; div.innerHTML = '<span class="txt-green">></span> <span class="typewriter"></span>'; el.insertBefore(div, el.firstChild); setTimeout(function() { _typeText(div.querySelector('.typewriter'), l.msg, null, 20); }, i * 30); }); while (el.children.length > 30) { el.removeChild(el.lastChild); } el.scrollTop = 0; } else { _lastLogLen = 0; } }

    function _typeText(el, text, cb, speed) {
        if (/<[^>]+>/.test(text)) { el.innerHTML = text; if (cb) cb(); return; }
        var i = 0;
        el.textContent = '';
        var finished = false;
        var finish = function() {
            if (finished) return;
            finished = true;
            clearInterval(timer);
            el.textContent = text;
            document.removeEventListener('click', skip);
            if (cb) cb();
        };
        var skip = function(e) { finish(); };
        document.addEventListener('click', skip, { once: true });
        var timer = setInterval(function() {
            el.textContent += text.charAt(i);
            i++;
            if (i >= text.length) { finish(); }
        }, speed || 40);
    }
    function _showSynthesizeModal() {
        var gs = GS(); if (!gs) return;
        var inv = gs.inventory.components;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = '';
        _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(500px,90vw);background:var(--bg-modal);border:2px solid #f57f17;border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:16px 24px;background:rgba(245,124,0,0.08);border-bottom:1px solid #f57f17;display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-gold txt-bold">[ 组件合成 ]</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:16px 24px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:50vh;';
        body.innerHTML = '<div class="txt-xs txt-dim">选择 3 个组件（同种 → 升级版，不同 → 随机）</div>';
        var selected = {};
        var selectCount = 0;
        var keys = []; Object.keys(inv).forEach(function(k) { if (inv[k] > 0) keys.push(k); });
        var updatePreview = function() {
            var selKeys = Object.keys(selected);
            var selNames = []; selKeys.forEach(function(sk) { for (var si = 0; si < selected[sk]; si++) selNames.push(sk); });
            var allSame = selKeys.length === 1 && selectCount === 3;
            var dots = ''; for (var di = 0; di < 3; di++) {
                if (di < selectCount) { dots += '<span style="display:inline-block;padding:4px 10px;margin:0 2px;border-radius:3px;background:rgba(255,213,79,0.15);border:1px solid #f57f17;font-size:12px;color:var(--accent-yellow);">' + selNames[di] + '</span>'; }
                else { dots += '<span style="display:inline-block;padding:4px 10px;margin:0 2px;border-radius:3px;border:1px dashed var(--border-dim);font-size:12px;color:var(--text-disabled);">空槽</span>'; }
            }
            if (selectCount === 3 && allSame) {
                var c = GD().COMPONENTS && GD().COMPONENTS[selKeys[0]];
                var affixes = c && c.affixes ? c.affixes : {};
                var parts = [];
                if (affixes.atkBonus) parts.push('攻击+' + (affixes.atkBonus*2));
                if (affixes.flatDefBonus) parts.push('防御+' + (affixes.flatDefBonus*2));
                if (affixes.shieldBonus) parts.push('生命+' + (affixes.shieldBonus*2));
                if (affixes.physMultiplier) parts.push('物理×' + (affixes.physMultiplier*2).toFixed(1));
                if (affixes.armorPenetration) parts.push('破甲' + Math.round(affixes.armorPenetration*200) + '%');
                if (affixes.toxinConversion) parts.push('毒转' + Math.round(affixes.toxinConversion*200) + '%');
                if (affixes.lifeDrainChance) parts.push('吸血' + Math.round(affixes.lifeDrainChance*200) + '%' + (affixes.lifeDrainAmount ? '·' + (affixes.lifeDrainAmount*2) + 'HP' : ''));
                if (affixes.thornsPercent) parts.push('反伤' + Math.round(affixes.thornsPercent*200) + '%');
                if (affixes.dotBonus) parts.push('毒伤+' + (affixes.dotBonus*2));
                if (affixes.bonusVsSwarm) parts.push('对寄生+' + Math.round(affixes.bonusVsSwarm*200) + '%');
                var base2 = selKeys[0];
                var tiers2 = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ']; var ct2 = 0; var comps2 = GD().COMPONENTS || {};
                for (var t2 = tiers2.length - 1; t2 >= 0; t2--) { if (comps2[base2 + tiers2[t2]]) { ct2 = t2; break; } }
                var nextName = base2 + (tiers2[ct2 + 1] || 'Ⅰ');
                preview.innerHTML = '<div class="txt-xs txt-gold">→ <b>' + nextName + '</b></div><div class="txt-xs txt-dim">' + parts.join(' · ') + '</div>';
            } else if (selectCount === 3) {
                preview.innerHTML = '<div class="txt-xs txt-gold">→ 随机新组件</div>';
            } else {
                preview.innerHTML = dots + ' <span class="txt-xs txt-dim">' + selectCount + '/3</span>';
            }
        };
        var compRow = _ce('div');
        compRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
        keys.forEach(function(k) {
            var count = inv[k]; if (count <= 0) return;
            var chip = _ce('div');
            chip.style.cssText = 'padding:6px 12px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;cursor:pointer;font-size:13px;color:var(--text-main);';
            chip.textContent = k + ' ×' + count;
            chip.onclick = function() {
                if (selectCount >= 3 && !selected[k]) return;
                var cur = selected[k] || 0;
                if (cur < count) { selected[k] = cur + 1; selectCount++; }
                else { selectCount -= cur; delete selected[k]; }
                chip.style.background = selected[k] ? 'rgba(255,213,79,0.15)' : 'var(--bg-card)';
                chip.style.borderColor = selected[k] ? '#f57f17' : 'var(--border-dim)';
                chip.innerHTML = '<span>' + k + '</span> <span class="txt-xs txt-dim">×' + count + '</span>' + (selected[k] ? ' <span class="txt-xs txt-gold">已选' + selected[k] + '</span>' : '');
                updatePreview();
            };
            compRow.appendChild(chip);
        });
        body.appendChild(compRow);
        var preview = _ce('div');
        preview.style.cssText = 'text-align:center;padding:10px;';
        var dots = ''; for (var di = 0; di < 3; di++) dots += '<span style="display:inline-block;width:28px;height:28px;border-radius:3px;border:1px solid var(--border-dim);background:transparent;margin:0 3px;vertical-align:middle;"> </span>';
        preview.innerHTML = dots + ' <span class="txt-xs txt-dim">0/3</span>';
        body.appendChild(preview);
        var btnRow = _ce('div');
        btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';
        var confirmBtn = _ce('button', 'btn btn-gold btn-capsule');
        confirmBtn.textContent = '确认合成';
        confirmBtn.onclick = function() {
            if (selectCount !== 3) return;
            var selKeys = Object.keys(selected);
            var allSame = selKeys.length === 1;
            var consumed = [];
            selKeys.forEach(function(k) { for (var si = 0; si < selected[k]; si++) { inv[k]--; consumed.push(k); } });
            var comps = GD().COMPONENTS || {};
            if (allSame) {
                var base = selKeys[0];
                var tiers = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'];
                var currentTier = 0;
                for (var ti = tiers.length - 1; ti >= 0; ti--) { if (comps[base + tiers[ti]]) { currentTier = ti; break; } }
                var upgradedName = base + (tiers[currentTier + 1] || 'Ⅰ');
                if (!comps[upgradedName]) {
                    var orig = comps[base];
                    var mult = Math.pow(2, currentTier + 1);
                    comps[upgradedName] = { id: upgradedName, allowedSlots: (orig||{}).allowedSlots||[], affixes: {} };
                    if (orig && orig.affixes) { Object.keys(orig.affixes).forEach(function(ak) { comps[upgradedName].affixes[ak] = orig.affixes[ak] * mult; }); }
                }
                inv[upgradedName] = (inv[upgradedName] || 0) + 1;
            } else {
                var allNames = Object.keys(comps);
                var result = allNames[Math.floor(Math.random() * allNames.length)];
                inv[result] = (inv[result] || 0) + 1;
            }
            window.GameState.save();
            UISystem.showNotification('合成完成！', consumed.join(' + ') + ' → ' + (allSame ? selKeys[0] + '+' : '新组件'), 'var(--accent-yellow)');
            UISystem.showReorganizeModal();
        };
        btnRow.appendChild(confirmBtn);
        body.appendChild(btnRow);
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function _showSocketPicker(slot, socketIndex) {
        var gs = GS(); if (!gs) return;
        _modalOverlay._returnToLab = true;
        var inv = gs.inventory.components;
        var comps = GD().COMPONENTS || {};
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = '';
        _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(450px,90vw);background:var(--bg-modal);border:2px solid var(--accent-green);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:14px 20px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        var slotNames = { predatory_organ: '捕食器官', chitin_epidermis: '生物表皮', gland_core: '腺体核心' };
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ 选择组件 ]</div><div class="txt-xs txt-dim">' + (slotNames[slot] || slot) + ' 槽' + (socketIndex+1) + '</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:12px 20px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;max-height:50vh;';
        var hasAny = false;
        Object.keys(inv).forEach(function(ck) {
            if (inv[ck] <= 0 || !comps[ck] || !comps[ck].allowedSlots || comps[ck].allowedSlots.indexOf(slot) === -1) return;
            hasAny = true;
            var sc = comps[ck]; var parts = []; var sa = sc.affixes;
            if (sa) {
                if (sa.atkBonus) parts.push('攻击+' + sa.atkBonus);
                if (sa.flatDefBonus) parts.push('防御+' + sa.flatDefBonus);
                if (sa.shieldBonus) parts.push('生命+' + sa.shieldBonus);
                if (sa.physMultiplier) parts.push('物理×' + sa.physMultiplier);
                if (sa.armorPenetration) parts.push('破甲' + Math.round(sa.armorPenetration*100) + '%');
                if (sa.toxinConversion) parts.push('毒转' + Math.round(sa.toxinConversion*100) + '%');
                if (sa.lifeDrainChance) parts.push('吸血' + Math.round(sa.lifeDrainChance*100) + '%' + (sa.lifeDrainAmount ? '·' + sa.lifeDrainAmount + 'HP' : ''));
                if (sa.thornsPercent) parts.push('反伤' + Math.round(sa.thornsPercent*100) + '%');
                if (sa.dotBonus) parts.push('毒伤+' + sa.dotBonus);
                if (sa.bonusVsSwarm) parts.push('对寄生+' + Math.round(sa.bonusVsSwarm*100) + '%');
            }
            var row = _ce('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,213,79,0.06);border:1px solid rgba(255,213,79,0.2);border-radius:4px;cursor:pointer;';
            row.innerHTML = '<div><span class="txt-xs txt-gold txt-bold">' + ck + '</span><span class="txt-xs txt-gold"> ×' + inv[ck] + '</span></div><span class="txt-xs txt-dim">' + (parts.length > 0 ? parts.join(' · ') : '') + '</span>';
            row.onclick = function() { try { window.GameState.socketComponent(slot, socketIndex, ck); } catch(e) {} UISystem.showReorganizeModal(); UISystem.render(); };
            body.appendChild(row);
        });
        if (!hasAny) body.innerHTML = '<div class="txt-xs txt-dim txt-center">没有可装备的组件</div>';
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function _showOrganPicker(slot) {
        var gs = GS(); if (!gs) return;
        _modalOverlay._returnToLab = true;
        var organs = gs.inventory.organs || [];
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(450px,90vw);background:var(--bg-modal);border:2px solid var(--accent-green);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:14px 20px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ 器官挂载 ]</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div'); body.style.cssText = 'padding:12px 20px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;max-height:50vh;';
        if (organs.length === 0) {
            body.innerHTML = '<div class="txt-xs txt-dim txt-center">暂无可用器官</div>';
        } else {
            var bos = GD().BOSS_ORGANS || {};
            var oClrs = { '暴君核心': { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.1)', bd: 'rgba(255,107,74,0.2)' }, '蜂后髓核': { hex: '#9acd32', bg: 'rgba(154,205,50,0.1)', bd: 'rgba(154,205,50,0.2)' }, '高能电泳核': { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.1)', bd: 'rgba(74,184,255,0.2)' } };
            var filtered = organs.filter(function(oid) { var bo = bos[oid]; return bo && bo.slotType === slot; });
            if (filtered.length === 0) {
                body.innerHTML = '<div class="txt-xs txt-dim txt-center">没有适配该插槽的器官</div>';
            } else {
            filtered.forEach(function(oid) {
                var oc = oClrs[oid] || { hex: 'var(--accent-green)', bg: 'rgba(0,255,136,0.08)', bd: 'rgba(0,255,136,0.2)' };
                var bo = bos[oid]; var desc = bo ? '<span style=color:var(--accent-green)>' + bo.skillName + '</span> | <span style=color:var(--accent-green)>' + bo.skillCost + '进程</span> | ' + (bo.skillEffect ? ('<span style=color:var(--accent-red)>×' + (bo.skillEffect.baseMultiplier || '召唤') + '</span>' + (bo.skillEffect.armorPenetration ? ' <span style=color:var(--accent-blue)>破甲' + Math.round(bo.skillEffect.armorPenetration*100) + '%</span>' : '') + (bo.skillEffect.chainTargets ? ' <span style=color:var(--accent-blue)>链' + bo.skillEffect.chainTargets + '</span>' : '') + (bo.skillEffect.summonCount ? ' <span style=color:var(--accent-yellow)>召' + bo.skillEffect.summonCount + '</span>' : '')) : '') : '';
                var row = _ce('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:' + oc.bg + ';border:1px solid ' + oc.bd + ';border-radius:4px;cursor:pointer;';
                row.innerHTML = '<div><span class="txt-xs txt-bold" style="color:' + oc.hex + ';">' + oid + '</span><span class="txt-xs txt-dim"> ' + desc + '</span></div>';
                row.onclick = function() { try { window.GameState.equipOrgan(slot, oid); } catch(e) {} UISystem.showReorganizeModal(); UISystem.render(); };
                body.appendChild(row);
            });
            }
        }
        box.appendChild(body); _modalOverlay.appendChild(box);
    }

    function showReorganizeModal() {
        var gs = GS(); var p = gs.player;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box status-modal');
        box.style.cssText = 'width:min(700px,90vw);max-height:90vh;background:var(--bg-modal);border:1px solid var(--accent-green);display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ 基因重组实验室 ]</div>' +
                         '<div style="display:flex;align-items:center;gap:10px;"><span class="txt-xs txt-gold" style="margin-right:20px;line-height:1;">基因点数: ' + p.bp + '</span>' +
                         '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button></div>';
        box.appendChild(head);
        // 框外顶部说明
        var infoBar = _ce('div');
        infoBar.style.cssText = 'margin-bottom:20px;padding:8px 16px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;width:min(700px,90vw);text-align:left;';
        infoBar.innerHTML = '<div style="margin-bottom:4px;"><span class="txt-xs txt-green">进阶</span><span class="txt-xs txt-dim"> — 消耗碎片提升器官阶位（公式 5×1.6^当前阶）</span></div>' +
            '<div style="margin-bottom:4px;"><span class="txt-xs txt-green">挂载</span><span class="txt-xs txt-dim"> — 更换器官，Boss 器官提供专属主动技能</span></div>' +
            '<div style="margin-bottom:4px;"><span class="txt-xs txt-green">组件</span><span class="txt-xs txt-dim"> — 点击空槽嵌入碎片，获得攻击/防御/护盾等词条加成</span></div>' +
            '<div style="margin-bottom:4px;"><span class="txt-xs txt-purple">魔药</span><span class="txt-xs txt-dim"> — 消耗碎片炼制战斗药剂，最多 3 瓶，注意毒性阈值</span></div>' +
            '<div style="margin-bottom:4px;"><span class="txt-xs txt-gold">涂层</span><span class="txt-xs txt-dim"> — 为捕食器官涂抹基因涂层，针对特定种族造成融毁伤害</span></div>' +
            '<div><span class="txt-xs txt-gold">基因点数</span><span class="txt-xs txt-dim"> — 卸载组件花费 10 BP，击败怪物获得</span></div>';
        _modalOverlay.appendChild(infoBar);
        var body = _ce('div');
        body.style.cssText = 'padding:30px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;flex:1;';
        var organNames = { predatory_organ: '捕食器官', chitin_epidermis: '生物表皮', gland_core: '腺体核心' };
        var _organColors = { '暴君核心': { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.12)', bd: 'rgba(255,107,74,0.25)' }, '蜂后髓核': { hex: '#9acd32', bg: 'rgba(154,205,50,0.12)', bd: 'rgba(154,205,50,0.25)' }, '高能电泳核': { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.12)', bd: 'rgba(74,184,255,0.25)' }, _default: { hex: 'var(--accent-green)', bg: 'rgba(0,255,136,0.08)', bd: 'rgba(0,255,136,0.2)' } };
        var inv = gs.inventory.components;
        var comps = GD().COMPONENTS || {};
        var organBlock = _ce('div');
        organBlock.style.cssText = 'padding:20px;background:rgba(0,255,136,0.02);border:1px solid rgba(0,255,136,0.15);border-radius:8px;display:flex;flex-direction:column;gap:12px;';
        organBlock.innerHTML = '<div class="txt-sm txt-green txt-bold">> 器官装备</div>';
        ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function(s) {
            var d = p[s];
            var cost = Math.ceil(5 * Math.pow(1.6, d.tier));
            var canUpgrade = Object.values(inv).reduce(function(a,b){return a+b;},0) >= cost;
            var row = _ce('div');
            row.style.cssText = 'padding:14px;background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.1);border-radius:6px;display:flex;flex-direction:column;gap:10px;';
            var slots = d.component_slots || [null, null];
            var slotHTML = '';
            [0, 1].forEach(function(si) {
                var cid = slots[si];
                if (cid) {
                    var ec = GD().COMPONENTS && GD().COMPONENTS[cid];
                    var etip = '<b>' + cid + '</b>';
                    if (ec && ec.affixes) {
                        var ep = []; var ea = ec.affixes;
                        if (ea.atkBonus) ep.push('攻击+' + ea.atkBonus);
                        if (ea.flatDefBonus) ep.push('防御+' + ea.flatDefBonus);
                        if (ea.shieldBonus) ep.push('生命+' + ea.shieldBonus);
                        if (ea.physMultiplier) ep.push('物理×' + ea.physMultiplier);
                        if (ea.armorPenetration) ep.push('破甲' + Math.round(ea.armorPenetration*100) + '%');
                        if (ea.toxinConversion) ep.push('毒素转化' + Math.round(ea.toxinConversion*100) + '%');
                        if (ea.lifeDrainChance) ep.push('吸血' + Math.round(ea.lifeDrainChance*100) + '%' + (ea.lifeDrainAmount ? '·' + ea.lifeDrainAmount + 'HP' : ''));
                        if (ea.thornsPercent) ep.push('反伤' + Math.round(ea.thornsPercent*100) + '%');
                        if (ea.dotBonus) ep.push('毒伤+' + ea.dotBonus);
                        if (ea.bonusVsSwarm) ep.push('对寄生+' + Math.round(ea.bonusVsSwarm*100) + '%');
                        if (ep.length > 0) etip += '&#10;' + ep.join(' · ');
                    }
                    slotHTML += '<span class="help-tip" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;font-size:13px;background:rgba(255,213,79,0.08);border:1px solid rgba(255,213,79,0.2);border-radius:4px;color:var(--accent-yellow);cursor:pointer;" data-tip="' + etip + '&#10;点击卸下" data-slot="' + s + '" data-sidx="' + si + '">' + cid + '</span>';
                } else {
                    var hasAvail = false; Object.keys(inv).forEach(function(ck) { if (inv[ck] > 0 && comps[ck] && comps[ck].allowedSlots && comps[ck].allowedSlots.indexOf(s) !== -1) hasAvail = true; });
                    var slotCls = hasAvail ? 'slot-ready' : '';
                    var slotStyle = hasAvail ? 'padding:6px 10px;font-size:13px;background:rgba(0,255,136,0.04);border:1px dashed rgba(0,255,136,0.3);border-radius:4px;color:var(--accent-green);cursor:pointer;' : 'padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:4px;color:var(--text-dim);cursor:pointer;';
                    slotHTML += '<span class="' + slotCls + '" style="' + slotStyle + '" onclick="UISystem._showSocketPicker(\'' + s + '\',' + si + ')">+ 空槽</span>';
                }
            });
            row.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;width:100%;">' +
                '<div class="txt-sm txt-green txt-bold">' + organNames[s] + ' <span class="txt-xs">[' + d.tier + '阶]</span></div>' +
                '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;">' +
                '<span class="txt-xs txt-dim" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">挂载: ' + (d.equipped ? '<span class="help-tip btn-organ" style="padding:6px 10px;font-size:13px;background:' + (_organColors[d.equipped]||_organColors._default).bg + ';border:1px solid ' + (_organColors[d.equipped]||_organColors._default).bd + ';border-radius:4px;color:' + (_organColors[d.equipped]||_organColors._default).hex + ';cursor:pointer;" data-tip="点击卸下该器官" onclick="try{GameState.equipOrgan(\'' + s + '\',null);}catch(e){}UISystem.showReorganizeModal();UISystem.render();">' + d.equipped + '</span>' : '<span class="btn-organ' + (gs.inventory.organs.length > 0 ? ' slot-ready' : '') + '" style="padding:6px 10px;font-size:13px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.2);border-radius:4px;color:var(--accent-green);cursor:pointer;" onclick="UISystem._showOrganPicker(\'' + s + '\')">标准原型</span>') + ' 组件: <span style="display:inline-flex;align-items:center;gap:8px;">' + slotHTML + '</span></span>' +
                '<button class="btn btn-green btn-sm help-tip" ' + (canUpgrade ? '' : 'disabled') + ' data-tip="' + (canUpgrade ? '当前 ' + d.tier + '阶 → ' + (d.tier + 1) + '阶&#10;消耗任意组件 ×' + cost + '&#10;库存共 ' + Object.values(inv).reduce(function(a,b){return a+b;},0) + ' 个' : '当前 ' + d.tier + '阶 → ' + (d.tier + 1) + '阶（不足）&#10;需要任意组件 ×' + cost + '&#10;库存仅 ' + Object.values(inv).reduce(function(a,b){return a+b;},0) + ' 个&#10;击败怪物或合成获得') + '" onclick="GameState.upgradeOrganTier(\'' + s + '\'); UISystem.showReorganizeModal();">' +
                '进阶</button></div>' +
                '</div>';
            organBlock.appendChild(row);
        });
        body.appendChild(organBlock);
        // 卸载组件事件委托（点击已装备组件即卸载）
        organBlock.addEventListener('click', function(e) {
            var t = e.target.closest('.help-tip[data-slot]');
            if (!t) return;
            var sl = t.getAttribute('data-slot');
            var sx = parseInt(t.getAttribute('data-sidx'), 10);
            try { window.GameState.unloadComponent(sl, sx); } catch(e) {}
            UISystem.showReorganizeModal();
            UISystem.render();
        });
        // --- 魔药炼制 ---
        var potData = GD().POTIONS || {};
        var potSection = _ce('div');
        potSection.style.cssText = 'padding:15px 20px;background:rgba(156,39,176,0.03);border:1px solid rgba(156,39,176,0.15);border-radius:6px;';
        var potHTML = '<div class="txt-xs txt-bold" style="color:var(--accent-purple);margin-bottom:10px;">> 生物炼金釜 — 魔药炼制（最多携带3瓶）</div>';
        potHTML += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        var potIds = ['POT_BERSERK', 'POT_ANTIDOTE', 'POT_SHIELD_CORE'];
        var hasCrafted = false;
        potIds.forEach(function(pid) {
            var pt = potData[pid]; if (!pt) return;
            var totalMats = Object.values(inv).reduce(function(a,b){return a+b;},0);
            var cost = pt.toxicity >= 35 ? 3 : 2;
            var canCraft = totalMats >= cost && gs.inventory.potions.length < 3;
            hasCrafted = true;
            potHTML += '<span class="help-tip" style="padding:6px 10px;background:rgba(206,147,216,0.1);border:1px solid rgba(206,147,216,0.2);border-radius:4px;" data-tip="<b style=\'font-size:14px;color:var(--accent-purple);\'>' + pt.name + '：</b>&#10;<span style=\'font-size:14px;\'>' + (pt.effect.desc || '') + '</span>&#10;<b>副作用：</b>' + (pt.sideEffect.desc || '') + '&#10;毒性+' + pt.toxicity + ' | 炼制消耗任意组件 ×' + cost + (canCraft ? '' : '（不足，库存' + totalMats + '）') + '">' +
                '<span class="txt-xs txt-bold" style="color:var(--accent-purple);">' + pt.name + '</span>' +
                '<span class="txt-xs txt-dim"> 毒性+' + pt.toxicity + '</span>' +
                (canCraft ? ' <button class="btn btn-purple" style="padding:1px 8px;font-size:12px;" onclick="GameState.craftPotion(\'' + pid + '\');UISystem.showReorganizeModal();">炼制</button>' : '') +
                '</span>';
        });
        if (!hasCrafted) potHTML += '<span class="txt-xs txt-dim">暂无可用配方</span>';
        potHTML += '</div>';
        // 已携带魔药
        if (gs.inventory.potions.length > 0) {
            potHTML += '<div class="txt-xs txt-dim" style="margin-top:10px;">已携带: ';
            gs.inventory.potions.forEach(function(p2) {
                var pn = potData[p2] ? potData[p2].name : p2;
                potHTML += '<span class="txt-bold" style="color:var(--accent-purple);">' + pn + '</span> ';
            });
            potHTML += '</div>';
        }
        potSection.innerHTML = potHTML;
        body.appendChild(potSection);

        // --- 涂层涂抹 ---
        var coatData = GD().COATINGS || {};
        var coatSection = _ce('div');
        coatSection.style.cssText = 'padding:15px 20px;background:rgba(255,213,79,0.03);border:1px solid rgba(255,213,79,0.15);border-radius:6px;';
        var coatHTML = '<div class="txt-xs txt-gold txt-bold" style="margin-bottom:10px;">> 基因涂层涂抹（捕食器官 · 当前: ' + (p.activeCoating ? (coatData[p.activeCoating] ? coatData[p.activeCoating].name : p.activeCoating) + ' (' + p.coatingTurnsLeft + '回合)' : '无') + '）</div>';
        coatHTML += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        var coatRaceColors = { COAT_ANTI_MUTANT: { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.1)', border: 'rgba(255,107,74,0.25)' }, COAT_ANTI_SWARM: { hex: '#9acd32', bg: 'rgba(154,205,50,0.1)', border: 'rgba(154,205,50,0.25)' }, COAT_ANTI_EMBER: { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.1)', border: 'rgba(74,184,255,0.25)' } };
        var coatIds = ['COAT_ANTI_MUTANT', 'COAT_ANTI_SWARM', 'COAT_ANTI_EMBER'];
        coatIds.forEach(function(cid) {
            var ct = coatData[cid]; if (!ct) return;
            var clr = coatRaceColors[cid] || { hex: '#ffd54f', bg: 'rgba(255,213,79,0.1)', border: 'rgba(255,213,79,0.2)' };
            var canApply = true;
            var costText = '';
            Object.keys(ct.cost).forEach(function(mk) { if (!inv[mk] || inv[mk] < ct.cost[mk]) canApply = false; costText += (costText ? '、' : '') + mk + '×' + ct.cost[mk]; });
            var effects = [];
            if (ct.effect.damageBonus) effects.push('伤害+' + Math.round(ct.effect.damageBonus*100) + '%');
            if (ct.effect.ignoreDefense) effects.push('无视防御');
            if (ct.effect.toxinBonus) effects.push('毒素+' + Math.round(ct.effect.toxinBonus*100) + '%');
            if (ct.effect.shieldStrip) effects.push('拆' + ct.effect.shieldStrip + '盾');
            coatHTML += '<span class="help-tip" style="padding:6px 10px;background:' + clr.bg + ';border:1px solid ' + clr.border + ';border-radius:4px;color:' + clr.hex + ';" data-tip="<b style=\'font-size:14px;color:' + clr.hex + ';\'>' + ct.name + '：</b>&#10;<span style=\'font-size:14px;\'>' + effects.join('&#10;') + '</span>&#10;<b>效果：</b>持续' + ct.duration + '回合&#10;<b>消耗：</b>' + costText + '">' +
                '<span class="txt-xs" style="color:' + clr.hex + ';">' + ct.name + '</span>' +
                (canApply && !p.activeCoating ? ' <button class="btn btn-gold" style="padding:1px 8px;font-size:12px;" onclick="GameState.applyCoating(\'' + cid + '\');UISystem.showReorganizeModal();">涂抹</button>' : '') +
                '</span>';
        });
        coatHTML += '</div>';
        coatSection.innerHTML = coatHTML;
        body.appendChild(coatSection);

        // 器官背包
        var bos3 = GD().BOSS_ORGANS || {};
        var organColors3 = { '暴君核心': { hex:'#ff6b4a', bg:'rgba(255,107,74,0.08)', bd:'rgba(255,107,74,0.2)' }, '蜂后髓核': { hex:'#9acd32', bg:'rgba(154,205,50,0.08)', bd:'rgba(154,205,50,0.2)' }, '高能电泳核': { hex:'#4ab8ff', bg:'rgba(74,184,255,0.08)', bd:'rgba(74,184,255,0.2)' } };
        if (gs.inventory.organs.length > 0) {
            var organInvRow = _ce('div');
            organInvRow.style.cssText = 'padding:12px 16px;background:rgba(0,255,136,0.02);border:1px solid rgba(0,255,136,0.1);border-radius:6px;margin-bottom:4px;';
            var orgHTML = '<div class="txt-xs txt-green txt-bold" style="margin-bottom:6px;">> 突变器官（' + gs.inventory.organs.length + '个）</div><div style="display:flex;flex-wrap:wrap;gap:6px;">';
            gs.inventory.organs.forEach(function(oid) {
                var oc3 = organColors3[oid] || { hex:'var(--accent-green)', bg:'rgba(0,255,136,0.06)', bd:'rgba(0,255,136,0.15)' };
                var bo3 = bos3[oid]; var slotName3 = bo3 ? (bo3.slotType==='predatory_organ'?'捕食器官':bo3.slotType==='gland_core'?'腺体核心':'生物表皮') : '未知';
                var oTip = '<b style=color:' + (organColors3[oid]||{}).hex + '>' + oid + '</b>&#10;<b>' + (bo3 ? bo3.skillName : '') + '</b>&#10;<span style=color:var(--accent-green)>消耗 ' + (bo3?bo3.skillCost:'') + ' 进程</span>' + (bo3 && bo3.skillEffect ? '&#10;<span style=color:var(--accent-red)>伤害 ×' + (bo3.skillEffect.baseMultiplier || '?') + '</span>' + (bo3.skillEffect.armorPenetration ? ' | <span style=color:var(--accent-blue)>破甲' + Math.round(bo3.skillEffect.armorPenetration*100) + '%</span>' : '') + (bo3.skillEffect.chainTargets ? ' | <span style=color:var(--accent-blue)>链' + bo3.skillEffect.chainTargets + '目标</span>' : '') + (bo3.skillEffect.summonCount ? ' | <span style=color:var(--accent-yellow)>召唤' + bo3.skillEffect.summonCount + '只</span>' : '') : '') + '&#10;可装备于：' + slotName3;
                orgHTML += '<span class="help-tip" style="padding:4px 10px;font-size:13px;background:' + oc3.bg + ';border:1px solid ' + oc3.bd + ';border-radius:4px;color:' + oc3.hex + ';" data-tip="' + oTip + '">' + oid + '</span>';
            });
            orgHTML += '</div>'; organInvRow.innerHTML = orgHTML; body.appendChild(organInvRow);
        }
        // 组件库存
        var comps = GD().COMPONENTS || {};
        var invRow = _ce('div');
        invRow.style.cssText = 'padding:15px 20px;background:rgba(255,213,79,0.03);border:1px solid rgba(255,213,79,0.15);border-radius:6px;';
        var totalCount = 0; Object.keys(inv).forEach(function(k) { totalCount += (inv[k] || 0); });
        var synBtn = totalCount >= 3 ? '<button class="btn btn-gold btn-sm" style="padding:2px 10px;font-size:12px;" onclick="UISystem._showSynthesizeModal()">合成 3→1</button>' : '';
        var invHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span class="txt-xs txt-gold txt-bold">> 组件库存（' + totalCount + '个）</span>' + synBtn + '</div><div style="display:flex;flex-wrap:wrap;gap:8px;">';
        var hasAny = false;
        Object.keys(inv).forEach(function(k) { if (inv[k] > 0) { hasAny = true; var c = comps[k]; var tip = '<b>' + k + '</b>'; if (c && c.affixes) { var d = c.affixes; var parts = []; if (d.atkBonus) parts.push('攻击+' + d.atkBonus); if (d.flatDefBonus) parts.push('防御+' + d.flatDefBonus); if (d.shieldBonus) parts.push('生命+' + d.shieldBonus); if (d.physMultiplier) parts.push('物理×' + d.physMultiplier); if (d.armorPenetration) parts.push('破甲' + Math.round(d.armorPenetration*100) + '%'); if (d.toxinConversion) parts.push('毒素转化' + Math.round(d.toxinConversion*100) + '%'); if (d.lifeDrainChance) parts.push('吸血' + Math.round(d.lifeDrainChance*100) + '%' + (d.lifeDrainAmount ? '·' + d.lifeDrainAmount + 'HP' : '')); if (d.thornsPercent) parts.push('反伤' + Math.round(d.thornsPercent*100) + '%'); if (d.dotBonus) parts.push('毒伤+' + d.dotBonus); if (d.bonusVsSwarm) parts.push('对寄生+' + Math.round(d.bonusVsSwarm*100) + '%'); if (parts.length > 0) tip += '&#10;' + parts.join(' · '); } if (c && c.allowedSlots) { var slotNames2 = { predatory_organ: '捕食器官', chitin_epidermis: '生物表皮', gland_core: '腺体核心' }; var slotTexts2 = c.allowedSlots.map(function(s) { return slotNames2[s] || s; }); tip += '&#10;<b>可装备：</b>' + slotTexts2.join('、'); } var coats2 = GD().COATINGS || {}; var coatUses2 = []; Object.keys(coats2).forEach(function(cid) { if (coats2[cid].cost && coats2[cid].cost[k]) coatUses2.push(coats2[cid].name); }); if (coatUses2.length > 0) tip += '&#10;<b>可用于涂抹：</b>' + coatUses2.join('、'); tip += '&#10;<b>合成：</b>3个相同 → Ⅰ→Ⅱ→Ⅲ 逐级升级'; var drops = []; var rcMap2 = { mutant:'#ff6b4a', swarm:'#9acd32', ember:'#4ab8ff' }; Object.keys(GD().MONSTERS||{}).forEach(function(mid) { var mm = GD().MONSTERS[mid]; if (mm.drop && mm.drop.id === k) drops.push('<span style=color:' + (rcMap2[mm.race]||'#c8e6c9') + '>' + mm.name + '</span>'); }); if (drops.length > 0) tip += '&#10;<b>掉落：</b>' + drops.join('、'); invHTML += '<span class="txt-xs txt-gold help-tip" style="padding:4px 10px;background:rgba(255,213,79,0.1);border:1px solid rgba(255,213,79,0.2);border-radius:4px;" data-tip="' + tip + '" data-cname="' + k + '">' + k + ' ×' + inv[k] + '</span>'; } });
        if (!hasAny) invHTML += '<span class="txt-xs txt-dim">暂无组件 · 击败怪物获得</span>';
        invHTML += '</div>';
        invRow.innerHTML = invHTML;
        body.appendChild(invRow);
        box.appendChild(body);
        _modalOverlay.appendChild(box);
        UISystem.render();
    }

    return { init: init, render: render, showStatusModal: showStatusModal, showReorganizeModal: showReorganizeModal, showBestiaryModal: showBestiaryModal, showSaveModal: showSaveModal, closeModal: closeModal, closeIntro: closeIntro, resetGame: resetGame, triggerShake: triggerShake, showDamageFloat: showDamageFloat, showNotification: showNotification, showHelpPanel: showHelpPanel, _claimReward: _claimReward, _showSynthesizeModal: _showSynthesizeModal, _showSocketPicker: _showSocketPicker, _showOrganPicker: _showOrganPicker };
}
)();
