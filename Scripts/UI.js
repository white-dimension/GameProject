/**
 * UI.js — v5.3 沉浸式图标映射版
 */
window.UISystem = (function () {
    'use strict';
    var GS = function () { return window.GameState.getState(); };
    var WS = function () { return window.WorldSystem; };
    var CS = function () { return window.CombatSystem; };
    var GD = function () { return window.GameData; };

    var _root, _mainView, _battleView, _viewport, _modalOverlay, _msgOverlay, _juiceContainer, _bgVideo, _bgBattleVideo, _bgTitleVideo, _bgVideos, _showBgVideo, _hideBgVideo;
    var _wakingUp = true, _showScan = false, _tasksDone = false, _tasksAnimating = false, _discoveryDone = false, _discoveryAnimating = false;
    var _isFirstLoad = true;
    var _introActive = false;
    var _logQueue = [];
    var _isLogging = false;

    // 模块级日志辅助（init / _renderTasks / _renderDiscovery 共用）
    function _pushLog(msg, cb) {
        _logQueue.push({ msg: msg, cb: cb });
        if (!_isLogging) _processLogQueue();
    }

    function _processLogQueue() {
        if (_logQueue.length === 0) { _isLogging = false; return; }
        _isLogging = true;
        var item = _logQueue.shift();
        var el = document.getElementById('ui-log');
        if (!el) {
            if (item.cb) { try { item.cb(); } catch(e) {} }
            _isLogging = false;
            _processLogQueue();
            return;
        }
        var div = document.createElement('div');
        div.className = 'txt-xs txt-dim';
        div.style.cssText = 'margin-bottom:5px;';
        div.innerHTML = '<span class="txt-green">></span> <span class="typewriter"></span>';
        el.insertBefore(div, el.firstChild);
        _typeText(div.querySelector('.typewriter'), item.msg, function() {
            if (item.cb) { try { item.cb(); } catch(e) {} }
            _isLogging = false;
            _processLogQueue();
        });
    }

    function _foldSection(titleEl) {
        var content = titleEl.nextElementSibling;
        if (!content) return;
        var isFolded = content.style.display === 'none';
        content.style.display = isFolded ? 'block' : 'none';
        var icon = titleEl.querySelector('.fold-icon');
        if (icon) icon.innerHTML = isFolded ? '▼' : '▶';
    }

    function init() {
        // [修复] 初始化时强制重置所有内部状态标记，确保重置游戏后动画能重新播放
        _wakingUp = true;
        _showScan = false;
        _tasksDone = false;
        _tasksAnimating = false;
        _discoveryDone = false;
        _discoveryAnimating = false;
        _isFirstLoad = true;
        _introActive = false;
        _logQueue = [];
        _isLogging = false;
        _lastLogLen = 0;

        _root = document.getElementById('app'); if (!_root) return;
        _root.innerHTML = '';
        _root.style.cssText = 'width:100vw;height:100vh;display:flex;flex-direction:column;position:relative;background:var(--bg-deep);';

        // 通用背景视频工厂
        var _createBgVideo = function(src) {
            var v = _ce('video');
            v.src = src;
            v.loop = false;
            v.muted = true;
            v.volume = 1.0;
            v.autoplay = false;
            v.playsInline = true;
            v.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;display:none;pointer-events:none;filter:brightness(0.5);transition:opacity 1.2s ease;';
            v.addEventListener('timeupdate', function() {
                if (v._fading || !v.duration) return;
                if (v.currentTime > v.duration - 1.5) {
                    v._fading = true;
                    v.style.opacity = '0';
                    clearTimeout(v._fadeTimer);
                    v._fadeTimer = setTimeout(function() {
                        v.currentTime = 0;
                        v.style.opacity = '1';
                        v.play().catch(function(){});
                        v._fading = false;
                    }, 1200);
                }
            });
            _root.appendChild(v);
            return v;
        };

        _bgVideo = _createBgVideo('../Assets/Backgrounds/explore.mp4');
        _bgBattleVideo = _createBgVideo('../Assets/Backgrounds/battle.mp4');
        _bgBattleVideo.volume = 0.25;
        // 标题视频（播放一次，停住末尾帧）
        _bgTitleVideo = _ce('video');
        _bgTitleVideo.src = '../Assets/Backgrounds/title.mp4';
        _bgTitleVideo.loop = false;
        _bgTitleVideo.muted = true;
        _bgTitleVideo.volume = 0.5;
        _bgTitleVideo.playsInline = true;
        _bgTitleVideo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;display:none;pointer-events:none;';
        _bgTitleVideo._introTriggered = false;
        _bgTitleVideo._fadeOverlay = _ce('div');
        _bgTitleVideo._fadeOverlay.style.cssText = 'position:fixed;inset:0;z-index:1;background:#000;opacity:0;transition:opacity 3s ease;pointer-events:none;';
        _root.appendChild(_bgTitleVideo._fadeOverlay);
        _bgTitleVideo.addEventListener('timeupdate', function() {
            if (!_bgTitleVideo._fadeTriggered && _bgTitleVideo.duration && _bgTitleVideo.currentTime > _bgTitleVideo.duration - 3) {
                _bgTitleVideo._fadeTriggered = true;
                _bgTitleVideo._fadeOverlay.style.opacity = '0.85';
            }
            if (!_bgTitleVideo._introTriggered && _bgTitleVideo.duration && _bgTitleVideo.currentTime > _bgTitleVideo.duration - 2) {
                _bgTitleVideo._introTriggered = true;
                _modalOverlay.style.display = 'flex';
                _renderIntroTexts();
            }
        });
        _bgTitleVideo.addEventListener('ended', function() { _bgTitleVideo.pause(); });
        _root.appendChild(_bgTitleVideo);
        _bgVideos = [_bgVideo, _bgBattleVideo, _bgTitleVideo];

        // 显示/隐藏背景视频（尊重静音状态）
        _showBgVideo = function(v) {
            v.style.display = 'block';
            v.style.opacity = '1';
            v.muted = window.Sound ? window.Sound.isMuted() : false;
            v.play().catch(function(){});
        };
        _hideBgVideo = function(v) {
            v.style.display = 'none';
            v.pause();
        };

        var topBar = _ce('div', 'hud-top');
        topBar.style.cssText = 'position:relative;display:flex;flex-direction:row;justify-content:center;padding:8px 25px 4px 25px;min-height:60px;background:rgba(10,14,20,0.65);border-bottom:1px solid var(--border-dim);box-shadow: 0 4px 20px rgba(0,0,0,0.5);z-index:500;';
        _root.appendChild(topBar);

        _viewport = _ce('div', 'main-viewport');
        _viewport.style.cssText = 'flex:1;position:relative;display:flex;overflow:hidden;background:radial-gradient(circle at center, rgba(13,17,23,0.5), rgba(5,5,8,0.25));';
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
        logTitle.style.cssText = 'letter-spacing:2px;margin-bottom:10px;text-shadow: 0 0 8px var(--accent-green);';
        logTitle.textContent = '> 神经信号日志';
        logWrap.appendChild(logTitle);
        var logPanel = _ce('div', 'log-panel');
        logPanel.id = 'ui-log';
        logPanel.style.cssText = 'max-height:180px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:6px;padding:15px;box-shadow:0 10px 30px rgba(0,0,0,0.8);';
        logPanel.innerHTML = '';
        logWrap.appendChild(logPanel);
        leftPanelCol.appendChild(logWrap);
        _viewport.appendChild(leftPanelCol);

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
        var _bootSkipFn = function(e) { if (e.target && e.target.id === 'intro-btn') return; _bootSkip = true; };
        document.addEventListener('click', _bootSkipFn);
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
                                    _tasksAnimating = false; // 确保任务动画标记重置
                                    // setTimeout 防同步模式下递归调用 render()
                                    setTimeout(function() { UISystem.render(); }, 0);
                                });
                            });
                        });
                    });
                });
            });
        };

        var skillInfo = _ce('div', 'skill-info-panel');
        skillInfo.id = 'ui-skill-info';
        skillInfo.style.cssText = 'position:absolute;right:25px;bottom:25px;border:1px solid var(--border-dim);background:var(--bg-card);border-radius:8px;padding:15px;box-shadow:0 10px 30px rgba(0,0,0,0.8);display:none;';
        _viewport.appendChild(skillInfo);

        var actionBar = _ce('div', 'action-bar');
        actionBar.id = 'ui-action-bar';
        actionBar.style.cssText = 'position:relative;min-height:60px;padding:8px 25px;background:rgba(5,5,8,0.75);border-top:1px solid var(--border-dim);box-shadow: 0 -4px 20px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;gap:20px;z-index:500;';
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
            var t = e.target.closest && (e.target.closest('button, .btn, .path-card, .monster-card'));
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
            tip.innerHTML = '<div style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:10px 14px;line-height:1.7;max-width:280px;font-size:13px;color:var(--text-dim);word-wrap:break-word;white-space:normal;font-family:sans-serif;">' + (t.getAttribute('data-tip') || '').replace(/\n/g, '<br>') + '</div>';
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
                var gameKeys = ['1','2','3','4','5','6','0',' ','e','E','q','Q'];
                if (gameKeys.indexOf(e.key) !== -1) {
                    e.preventDefault();
                    var btns = document.querySelectorAll('.btn-battle-card');
                    var bs4 = CS().getBattleState();

                    // 地下城 0 键特殊映射
                    if (e.key === '0' && bs4 && bs4.isDungeon && bs4.phase === 'victory' && (bs4._dungeonFloor || 0) < 3) {
                        // 寻找”深入地下城”按钮
                        var deepBtn = Array.from(btns).find(function(b) { return b.textContent.indexOf('深入地下城') !== -1; });
                        if (deepBtn) {
                            deepBtn.style.transform = 'translateY(2px)'; deepBtn.style.filter = 'brightness(0.8)';
                            setTimeout(function() { deepBtn.style.transform = ''; deepBtn.style.filter = ''; }, 100);
                        }
                    } else if ((e.key === 'q' || e.key === 'Q') && bs4 && bs4._isTraining) {
                        // 训练模式：Q 键退出
                        var quitBtn2 = Array.from(btns).find(function(b) { return b.textContent.indexOf('退出训练') !== -1; });
                        if (quitBtn2) { quitBtn2.click(); }
                    } else {
                        var endIdx = bs4 && bs4.phase === 'victory' ? btns.length - 1 : btns.length - 2;
                        var btnIdx = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, ' ': Math.max(0, endIdx), 'e': Math.max(0, btns.length - 1), 'E': Math.max(0, btns.length - 1) }[e.key];
                        if (btnIdx !== undefined && btns[btnIdx]) {
                            var btn = btns[btnIdx];
                            btn.style.transform = 'translateY(2px)'; btn.style.filter = 'brightness(0.8)';
                            setTimeout(function() { btn.style.transform = ''; btn.style.filter = ''; }, 100);
                        }
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
                if (e.key === '0') {
                    var bsDeep = CS().getBattleState();
                    if (bsDeep && bsDeep.isDungeon && bsDeep.phase === 'victory' && (bsDeep._dungeonFloor || 0) < 3) {
                        setTimeout(function() { CS().dungeonDeep(); }, 100);
                    }
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

        // [修复] HUD 必须优先渲染，确保在启动动画期间也能看到血条/进程条
        _renderHUD(gs);

        // [修复] 逻辑重构：处理首次加载/动画序列
        if (_isFirstLoad) {
            _isFirstLoad = false;
            if (gs.mapState.stepsTaken > 0) {
                // 已有进度的存档跳过加载动画
                _wakingUp = false; _tasksDone = true; _discoveryDone = true; _showScan = true;
                var _flrInfo = (function(f){ var cn = ['','一','二','三','四','五','六','七','八','九','十']; return '地下' + (cn[f]||f) + '层'; })(gs.mapState.currentFloor || 1);
                _pushLog('神经链路重新校准。步数 ' + gs.mapState.stepsTaken + ' | ' + _flrInfo);
                UISystem.render(); // 重新触发一次渲染以更新视图
                return;
            } else {
                // 新游戏启动加载序列
                if (window._bootSequence) {
                    window._bootSequence();
                    return;
                }
            }
        }

        var inBattle = CS() && CS().isInBattle();
        // 多场景背景切换
        if (inBattle) {
            _hideBgVideo(_bgVideo);
            _showBgVideo(_bgBattleVideo);
            _root.className = '';
        } else {
            _hideBgVideo(_bgBattleVideo);
            _showBgVideo(_bgVideo);
            _root.className = '';
        }
        var taskEl = document.getElementById('ui-task-panel');
        if (taskEl) taskEl.style.display = inBattle ? 'none' : '';
        var roomInfo = document.getElementById('ui-room-info');
        if (roomInfo) roomInfo.style.display = inBattle ? 'none' : '';
        if (!inBattle) _renderTasks(gs);
        if (inBattle) {
            _mainView.style.display = 'none';
            // [修复] 强制清理残留的 Modal 和 Help 浮层
            _modalOverlay.style.display = 'none';
            document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });

            // 左栏 pointer-events:none 让点击穿透到怪物卡片，但日志保持可滚动
            var leftCol = document.querySelector('.left-panel-col');
            if (leftCol) { leftCol.style.pointerEvents = 'none'; }
            var logEl = document.getElementById('ui-log');
            if (logEl) {
                logEl.style.pointerEvents = 'auto';
                // [修复] 战斗中将日志面板加高，与战斗提示齐平
                logEl.style.maxHeight = '400px';
            }
            if (_battleView) {
                _battleView.style.display = 'flex';
                _battleView.style.cssText = 'position:absolute;inset:0;z-index:350;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;';
            }
            _renderBattle(gs);
        } else {
            var leftCol2 = document.querySelector('.left-panel-col');
            if (leftCol2) { leftCol2.style.pointerEvents = 'auto'; }
            // [修复] 切换回探索时彻底隐藏战斗视图并恢复日志高度
            var logEl2 = document.getElementById('ui-log');
            if (logEl2) { logEl2.style.maxHeight = '180px'; }
            if (_battleView) {
                _battleView.style.display = 'none';
                _battleView.innerHTML = ''; // 清理 DOM 以防 ID 冲突
            }
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
            '<div class="txt-md txt-green txt-bold"><div style="display:flex;justify-content:space-between;align-items:center;width:100%;">' +
            '<span><span class="icon icon-dna icon-pulse"></span>原体-II</span>' +
            (gs.mapState.loop >= 2 ? '<span class="txt-xs txt-bold" style="color:var(--accent-orange);animation:mastery-pulse 2s infinite;padding:2px 8px;border:1px solid var(--accent-orange);border-radius:3px;">超越进化 · 第' + gs.mapState.loop + '轮</span>' : '') +
            '</div></div>' +
            '</div>' +
            '<div class="hud-col hud-col-c">' +
            '<div class="hud-labels txt-xs">' +
            _hudLabel('生命', p.hp, p.hp_max, 'icon-health') +
            _hudLabel('进程', p.process, p.process_max, 'icon-ram') +
            _hudLabel('毒性', p.toxicity, 50, 'icon-tox') +
            _hudLabel('等阶 ' + p.level, (p.level >= 30 ? 'MAX' : p.xp), (p.level >= 30 ? 'MAX' : p.xpToNext), 'icon-upgrade') +
            '</div>' +
            '<div class="hud-bars">' +
            _hudBarFill(p.hp, p.hp_max, (CS() && CS().getBattleState() && CS().getBattleState().playerStatus && CS().getBattleState().playerStatus['toxDebuff'] ? 'tox-fill' : 'hp-fill')) +
            _hudBarFill(p.process, p.process_max, 'ram-fill') +
            _hudBarFill(p.toxicity, 50, 'tox-fill') +
            _hudBarFill((p.level >= 30 ? 1 : p.xp), (p.level >= 30 ? 1 : p.xpToNext), 'xp-fill') +
            '</div>' +
            '</div>' +
            '<div class="hud-col hud-col-r" style="display:flex;gap:6px;align-items:center;">' +
            '<button class="btn btn-sm ' + (window.Sound && window.Sound.isMuted() ? 'btn-gray' : 'btn-blue') + '" id="btn-sound" onclick="UISystem.toggleSound()">' +
            (window.Sound && window.Sound.isMuted() ? 'M' : '♪') +
            '</button>' +
            '<button class="btn btn-blue btn-sm" onclick="UISystem.showHelpPanel()">?</button>' +
            '</div>';
    }

    var _hintTimer = 0, _hintIdx = 0, _hintTexts = [];
    function _renderHints(gs) {
        var p = gs.player;
        var hints = [];

        var totalMP = (p.availableMasteryPoints || 0);
        var masterySlots = (p.masteries || []).filter(function(r){return r;}).length;
        var availSlots = (gs.mapState.loop >= 2 ? 3 : 2) - masterySlots;
        if (availSlots > 0 && p.level >= 1 && totalMP === 0) hints.push('选择一个专精流派以获得战斗增益 [实验室 → 专精学习]');

        if (totalMP > 0) hints.push('你有 ' + totalMP + ' 点未分配专精点数 [实验室 → 专精学习]');

        var hasCompInventory = false; var compInv = gs.inventory.components || {};
        Object.keys(compInv).forEach(function(k){ if(compInv[k] > 0) hasCompInventory = true; });
        var emptySlots = 0;
        ['predatory_organ','chitin_epidermis','gland_core'].forEach(function(s){
            (p[s].component_slots || []).forEach(function(cid){ if(!cid) emptySlots++; });
        });
        if (hasCompInventory && emptySlots > 0) hints.push('你有未安装的组件碎片 [实验室 → 组件镶嵌]');

        var hasOrganInv = (gs.inventory.organs || []).length > 0;
        var emptyOrganSlots = 0;
        ['predatory_organ','chitin_epidermis','gland_core'].forEach(function(s){
            if(!p[s].equipped) emptyOrganSlots++;
        });
        if (hasOrganInv && emptyOrganSlots > 0) hints.push('你有未装配的突变器官 [实验室 → 器官装配]');

        var hasPotionSlots = (gs.inventory.potions || []).length < 3;
        if (hasPotionSlots && hasCompInventory) hints.push('你可以炼制魔药以备战斗 [实验室 → 魔药炼制]');

        var hasCoating = Object.keys(gs.inventory.components || {}).some(function(k){ return gs.inventory.components[k] >= 2; });
        var coatingEquipped = Object.values(GD().COATINGS || {}).some(function(c){ return c.equipped; });
        if (hasCoating && !coatingEquipped) hints.push('你可以涂抹基因涂层增强战力 [实验室 → 涂层涂抹]');

        if (hints.length === 0) hints.push('探索地下实验室，击败变异体获取基因点数');

        if (hints.join('|') !== _hintTexts.join('|')) { _hintTexts = hints; _hintIdx = 0; }
        var txt = _hintTexts[_hintIdx % _hintTexts.length] || '';

        // 直接更新DOM
        var hintEl = document.getElementById('ui-floor-hint');
        if (hintEl) { hintEl.textContent = txt; hintEl.style.opacity = '0.65'; }

        clearTimeout(_hintTimer);
        _hintTimer = setTimeout(function() {
            _hintIdx++;
            var gs2 = GS(); if (gs2) _renderHints(gs2);
        }, 5000);
        return txt;
    }

    function _hudLabel(label, val, max, iconClass) {
        return '<div class="hud-bar"><span><span class="icon ' + iconClass + '"></span>' + label + '</span><span>' + val + '/' + max + '</span></div>';
    }

    function _hudBarFill(val, max, fillClass) {
        var pct = Math.min(100, Math.max(0, val / max * 100));
        var startPct = _wakingUp ? '0' : pct;
        return '<div style="width:155px;"><div class="progress-container hp-bar"><div class="progress-fill ' + fillClass + '" style="width:' + startPct + '%;transition:width 1.2s ease-out;"></div></div></div>';
    }

    function _handleDiscoveryResult(res, pathIndex, cardEl) {
        var gs = GS();
        if (res.isEvent) return; // 已经在 World.js 中调用了 showEventModal

        if (res.success) {
            if (res.events && res.events.length > 0) {
                res.events.forEach(function(ev) { if (ev.msg) UISystem.showNotification(ev.msg, null, 'var(--accent-yellow)'); });
            }

            var p = gs.mapState.discoveryPaths[pathIndex];
            if (res.room.type === 'boss') { CS().startBattle(res.room.monsterId, { wandering: !!res.room.wandering }); }
            else if (res.room.type === 'dungeon') { UISystem.showDungeonWarning(pathIndex); }
            else if (res.room.type === 'elite') {
                var baseMon = GD().MONSTERS[p.monsterId];
                var targetRace = baseMon ? baseMon.race : 'mutant';
                var ePool = Object.keys(GD().MONSTERS).filter(function(k) {
                    var m = GD().MONSTERS[k]; return m.tier === 'elite' && m.race === targetRace && !m.trainingOnly;
                });
                if (ePool.length === 0) ePool = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'];
                var eid = ePool[Math.floor(Math.random() * ePool.length)];
                var commonPool = Object.keys(GD().MONSTERS).filter(function(k) {
                    var m = GD().MONSTERS[k]; return m.tier === 'common' && m.race === targetRace && !m.trainingOnly;
                });
                if (commonPool.length === 0) commonPool = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER'];
                CS().startBattle([eid, commonPool[Math.floor(Math.random() * commonPool.length)]], {});
            }
            else if (res.room.type === 'monster') {
                var baseMon3 = GD().MONSTERS[p.monsterId];
                var targetRace3 = baseMon3 ? baseMon3.race : 'mutant';
                var commons = Object.keys(GD().MONSTERS).filter(function(k) {
                    var m = GD().MONSTERS[k]; return m.tier === 'common' && m.race === targetRace3 && !m.trainingOnly;
                });
                if (commons.length === 0) commons = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER'];
                var cnt = 1 + Math.floor(Math.random() * 3);
                var mids = []; for (var mi = 0; mi < cnt; mi++) mids.push(commons[Math.floor(Math.random() * commons.length)]);
                CS().startBattle(mids);
            }
            else if (res.room.type === 'portal') { render(); }
            else if (res.room.type === 'victory') { _showVictoryOverlay(); }
            else {
                // 营地/遗物：消耗卡片
                p._used = true;
                if (cardEl) {
                    cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    cardEl.style.opacity = '0'; cardEl.style.transform = 'scale(0.85)';
                    cardEl.style.pointerEvents = 'none';
                    setTimeout(function() {
                        if (cardEl.parentNode) cardEl.remove();
                        var remaining = gs.mapState.discoveryPaths.filter(function(pp) { return !pp._used; });
                        if (remaining.length === 0) { WS().generateNextPaths(); render(); }
                    }, 300);
                }
                render();
            }
        }
    }

    function _renderDiscovery(gs) {
        var room = gs.mapState.currentRoom;
        var paths = gs.mapState.discoveryPaths || [];
        // [修复] 同步 Core.js 逻辑：仅在 B1F 新手引导区隐藏高级路径，其余普通营地正常显示
        var isTutorial = room.type === 'camp' && gs.mapState.currentFloor === 1 && gs.mapState.stepsTaken <= 1;
        var _campHide = isTutorial ? { camp: true, elite: true, dungeon: true, portal: true } : null;

        // 初始化完成后直接静态渲染，不再做动画
        if (_discoveryDone) {
            _mainView.innerHTML = '';
            _mainView.style.cssText = 'flex:0 0 460px;display:flex;justify-content:center;padding:30px 0;gap:20px;margin-right:30px;';
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
                    if (p._used) return;
                    var card = _ce('div', 'path-card');
                    var clrStyle = p.raceClr ? 'color:' + p.raceClr + ';' : '';

                    // [新增] 路径词缀视觉呈现
                    var affixHTML = "";
                    if (p.synapseAffix) {
                        card.style.border = '1px solid ' + p.synapseAffix.color;
                        card.style.boxShadow = 'inset 0 0 10px ' + p.synapseAffix.color + '33';
                        affixHTML = '<div class="help-tip" style="position:absolute;top:-10px;right:10px;background:var(--bg-deep);border:1px solid ' + p.synapseAffix.color + ';padding:2px 8px;border-radius:4px;font-size:11px;color:' + p.synapseAffix.color + ';" data-tip="<b style=color:' + p.synapseAffix.color + '>【环境感官共鸣：' + p.synapseAffix.name + '】</b>&#10;' + p.synapseAffix.desc + '">' + p.synapseAffix.name + '</div>';
                    }

                    card.innerHTML = affixHTML + '<div class="txt-xs txt-green">[ 路径 0' + (i+1) + ' ]</div>' +
                        '<div class="txt-sm txt-bold" style="display:flex;align-items:center;gap:6px;margin:8px 0;' + clrStyle + '">' + p.label + '</div>' +
                        '<div class="txt-xs txt-dim">' + p.desc + '</div>';
                    card.onclick = function() {
                        var isCombat = ['monster','elite','boss','dungeon'].indexOf(p.type) !== -1;
                        if (isCombat) {
                            if (p.type === 'dungeon') { UISystem.showDungeonWarning(i); return; }
                            _fadeOutCards(function() {
                                var res = WS().discover(i);
                                _handleDiscoveryResult(res, i, card);
                            });
                        } else {
                            var res = WS().discover(i);
                            _handleDiscoveryResult(res, i, card);
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
        _mainView.innerHTML = '';
        _mainView.style.cssText = 'flex:0 0 460px;display:flex;justify-content:center;padding:30px 0;gap:20px;margin-right:30px;';

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
                    var isCombat = ['monster','elite','boss','dungeon'].indexOf(p.type) !== -1;
                    if (isCombat) {
                        if (p.type === 'dungeon') { UISystem.showDungeonWarning(idx); return; }
                        _fadeOutCards(function() {
                            var res = WS().discover(idx);
                            _handleDiscoveryResult(res, idx, card);
                        });
                    } else {
                        var res = WS().discover(idx);
                        _handleDiscoveryResult(res, idx, card);
                    }
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
                var intentClrs = _INTENT_COLORS;
                var iclr = intentClrs[curIntent.type] || 'var(--accent-red)';
                var intentBar = _ce('div');
                intentBar.style.cssText = 'position:absolute;bottom:calc(100% + 16px);left:0;right:0;background:rgba(255,255,255,0.03);border:1px solid ' + iclr + ';border-radius:4px;padding:8px 14px;';
                var labelText = curIntent.label.replace(/<[^>]*>/g, '').trim();
                intentBar.innerHTML = '<div class="txt-xs txt-bold" style="text-align:center;margin-bottom:2px;color:' + iclr + ';">' + labelText + '</div>' +
                    '<div class="txt-xs txt-dim" style="text-align:left;">' + (curIntent.desc || '') + '</div>';
                wrap.appendChild(intentBar);
            }

            // 怪物立绘：有图则全卡背景，Boss加呼吸动画
            var isBoss = md.tier === 'world_boss' && md.image;
            var hasBgImage = !!md.image;

            // 怪物卡片
            var card = _ce('div');
            card.className = 'monster-card';
            card.setAttribute('data-monster-idx', idx);
            var cardBorder = dead ? 'var(--border-dim)' : mclr;
            var cardGlow = (isTarget && !dead && !isVictory) ? 'box-shadow:0 0 20px ' + (raceCardClrs[md.race] || '#ff4455') + ';' : '';
            card.style.cssText = 'position:relative;background:' + (hasBgImage ? 'transparent' : 'var(--bg-card)') + ';border:1px solid ' + cardBorder + ';border-radius:8px;padding:24px;text-align:center;min-width:280px;max-width:380px;min-height:320px;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;' + cardGlow +
                (dead ? 'opacity:0.5;' : '') + 'cursor:' + (isVictory || dead ? 'default' : 'pointer') + ';';

            // 背景图层（死亡保留灰度显示）
            if (hasBgImage) {
                var bgLayer = _ce('div');
                bgLayer.style.cssText = 'position:absolute;inset:0;z-index:-2;background:url(' + md.image + ') center/cover no-repeat;border-radius:8px;' + (dead ? 'filter:grayscale(1);' : '');
                if (!dead) { bgLayer.className = 'boss-breathe'; bgLayer.style.animationDelay = '-' + (Math.random() * 4).toFixed(2) + 's'; }
                card.appendChild(bgLayer);
                // 遮罩层（在背景图上方，内容下方）
                var overlayLayer = _ce('div');
                overlayLayer.style.cssText = 'position:absolute;inset:0;z-index:-1;background:linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.1) 100%), linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4));border-radius:8px;pointer-events:none;';
                card.appendChild(overlayLayer);
            }

            // [新增] 种族克制标记 (方案 A：右上角弱点锁定)
            var pRaces = gs.player.masteries.filter(function(r) { return r; });
            var isCountered = false;
            for (var cri = 0; cri < pRaces.length; cri++) {
                var pr = pRaces[cri];
                if (md && md.race && ((pr === 'mutant' && md.race === 'swarm') ||
                    (pr === 'swarm' && md.race === 'ember') ||
                    (pr === 'ember' && md.race === 'mutant'))) {
                    isCountered = true; break;
                }
            }
            if (isCountered && !dead && !isVictory) {
                var counterIcon = _ce('div', 'help-tip');
                counterIcon.style.cssText = 'position:absolute;top:10px;right:10px;color:var(--accent-red);animation:mastery-pulse 2s infinite;z-index:10;';
                counterIcon.setAttribute('data-tip', '<b style=color:var(--accent-red)>弱点暴露 (种族克制)</b>&#10;玩家当前专精完美克制目标。&#10;<b>效果：</b>伤害 +50% 且无视基础防御。');
                counterIcon.innerHTML = '<span class="icon icon-crossed-swords" style="width:24px;height:24px;"></span>';
                card.appendChild(counterIcon);
            }
            if (!isVictory && !dead) {
                card.onclick = function() { CS().selectTarget(idx); };
                card.onmouseenter = function() { this.style.borderColor = mclr; this.style.boxShadow = '0 0 12px ' + mclr; };
                card.onmouseleave = function() { this.style.borderColor = isTarget ? mclr : (dead ? 'var(--border-dim)' : mclr); this.style.boxShadow = cardGlow || 'none'; };
            }

            // 无背景图时显示怪物图标
            if (!hasBgImage) {
                var iconClass = (md.icon ? 'icon-mid-' + md.icon : raceIcons[md.race] || 'icon-mutant');
                var ico = _ce('div');
                ico.className = 'icon ' + iconClass + ' icon-lg icon-pulse';
                ico.style.cssText = 'margin:0 auto;' + (dead ? 'color:var(--text-disabled);' : 'color:' + mclr + ';');
                card.appendChild(ico);
            }

            // [新增] 怪物维度词缀显示 (紧凑化，放在名字右侧)
            var affixIcons = "";
            if (mon.affixes && mon.affixes.length > 0) {
                mon.affixes.forEach(function(aff) {
                    affixIcons += '<span class="help-tip" style="margin-left:8px;padding:1px 6px;border:1px solid ' + aff.color + ';border-radius:3px;font-size:10px;color:' + aff.color + ';animation:glitch 2s infinite;" data-tip="<b style=color:' + aff.color + '>【' + aff.name + '】</b>&#10;' + aff.desc + '">' + aff.name + '</span>';
                });
            }

            // 名称 + 目标标记
            var nameClr = dead ? 'var(--text-disabled)' : mclr;
            var raceNames = _RACE_NAMES;
            card.innerHTML += '<div class="txt-md txt-bold" style="margin-top:8px;color:' + nameClr + ';display:flex;align-items:center;justify-content:center;">' +
                (isTarget && !dead && !isVictory ? '<span style="color:var(--accent-red);margin-right:4px;">▸</span> ' : '') + mon.name + affixIcons +
                ' <span style="font-weight:bold;font-size:0.85em;">· ' + (raceNames[md.race] || '') + '</span></div>';

            if (dead) {
                card.innerHTML += '<div class="txt-xs txt-dim" style="margin-top:6px;">已融毁</div>';
            }

            // HP 条 — 根据状态变色
            var hpBarClass = 'hp-fill';
            if (!dead && !isVictory) {
                if (mon.status['poison']) hpBarClass = 'tox-fill';
                if (mon._dodging) hpBarClass = 'xp-fill';
            }

            // [新增] 根据研究等级决定 HP 显示模式
            var rl = (gs.bestiary && gs.bestiary.researchLevels) ? (gs.bestiary.researchLevels[mon.id] || 0) : 0;
            var hpText = (rl >= 1) ? (mon.hp + ' / ' + mon.hpMax) : (Math.ceil(hpPct) + '%');

            // 技能标签（靠下，贴近血条）
            var skillLabel = '';
            if (mon.intent && !dead) {
                var iclr2 = (_INTENT_COLORS[mon.intent.type] || 'var(--accent-red)');
                var labelText = mon.intent.label.replace(/<[^>]*>/g, '').trim();
                skillLabel = '<div class="txt-xs" style="margin-bottom:6px;color:' + iclr2 + ';">' + labelText + '</div>';
            }

            card.innerHTML += '<div style="margin-top:auto;width:100%;">' + skillLabel +
                '<div class="progress-container monster-bar" style="max-width:200px;width:100%;margin:8px auto 0;border:1px solid #442222;">' +
                '<div class="progress-fill ' + hpBarClass + '" style="width:' + hpPct + '%;"></div></div>' +
                '<div class="txt-xs txt-dim" style="margin-top:4px;">' + hpText + '</div></div>';

            wrap.appendChild(card);

            // 怪物状态 — 模仿玩家双排显示
            if (!dead && !isVictory) {
                var monStatusContainer = _ce('div');
                monStatusContainer.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:center;margin-top:8px;';

                var monBuffRow = _ce('div'); // 上排：临时 Buff
                monBuffRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';

                var monPassiveRow = _ce('div'); // 下排：固定被动
                monPassiveRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';

                // --- 怪物临时 Buff (monBuffRow) ---
                if (mon.status['poison']) {
                    var dotPct = bs.dualKey === 'swarm+swarm' ? 8 : 5;
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.15);border:1px solid var(--accent-purple);border-radius:3px;color:var(--accent-purple);" data-tip="<b>基因毒素</b>&#10;每回合扣除 ' + dotPct + '% 最大HP&#10;剩余 ' + mon.status['poison'] + ' 回合&#10;使用 [腺体脉冲] 可引爆并吸血"><span class="icon icon-poison-gas"></span> 中毒 ' + mon.status['poison'] + '</span>';
                }
                if (mon._shield > 0) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.12);border:1px solid var(--accent-blue);border-radius:3px;color:var(--accent-blue);" data-tip="<b>科技护盾</b>&#10;吸收 ' + mon._shield + ' 点伤害&#10;护盾耗尽后才扣减HP"><span class="icon icon-energy-shield"></span> ' + mon._shield + '</span>';
                }
                if (mon._dodging) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid var(--accent-yellow);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>产卵闪避</b>&#10;所有攻击全部落空&#10;每3回合切换一次"><span class="icon icon-dodge"></span> 闪避</span>';
                }
                if (mon._charged) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(245,124,0,0.12);border:1px solid var(--accent-orange);border-radius:3px;color:var(--accent-orange);" data-tip="<b>蓄力中</b>&#10;下回合释放强力攻击&#10;可在蓄力期使用 [神经阻断] 打断"><span class="icon icon-lightning-arc"></span> 蓄力</span>';
                }
                if (mon._enraged) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,68,85,0.15);border:1px solid var(--accent-red);border-radius:3px;color:var(--accent-red);" data-tip="<b>狂怒</b>&#10;攻击力永久翻倍&#10;速战速决，拖延必败"><span class="icon icon-enrage"></span> 狂怒</span>';
                }
                if (mon._defBuff > 0) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(120,144,156,0.12);border:1px solid var(--text-dim);border-radius:3px;color:var(--text-dim);" data-tip="<b>防御强化</b>&#10;防御力 +' + mon._defBuff + '&#10;建议使用破甲组件或涂层"><span class="icon icon-energy-shield"></span>+ ' + mon._defBuff + '</span>';
                }
                if (mon.status['ionized']) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.12);border:1px solid var(--accent-blue);border-radius:3px;color:var(--accent-blue);" data-tip="<b>电离标记</b>&#10;已被电荷标记&#10;下次 [捕食打击] 将引爆：剥离全部护盾 + 全场 50% 溅射伤害"><span class="icon icon-lightning-arc"></span> 电离</span>';
                }
                if (mon.status['compromised']) {
                    monBuffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid var(--accent-yellow);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>生物崩解</b>&#10;护甲结构已瓦解&#10;防御归零 + 受到伤害提升 100%&#10;使用 [腺体脉冲] 可引爆并清除闪避"><span class="icon icon-biohazard"></span> 崩解</span>';
                }

                // --- 怪物固定被动 (monPassiveRow) ---
                var racePassives = {
                    mutant: { name: '超速再生', desc: '该变异体具有极强的自我修复能力，不受[流血]效果影响。' },
                    swarm: { name: '群体意识', desc: '受到伤害时，会向周围同类释放警告信息素，使自身受到的下次伤害降低。' },
                    ember: { name: '金属外骨骼', desc: '全身覆盖高硬度合金，对所有非破甲类型的物理攻击具有 20% 的天生减伤。' }
                };
                var pass = racePassives[md.race];
                if (pass) {
                    monPassiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,255,255,0.02);border:1px solid ' + mclr + ';border-radius:3px;color:' + mclr + ';opacity:0.8;" data-tip="<b>' + pass.name + ' (' + raceNames[md.race] + ')</b>&#10;' + pass.desc + '"><span class="icon icon-dna"></span> ' + pass.name + '</span>';
                }

                if (monPassiveRow.children.length > 0) monStatusContainer.appendChild(monPassiveRow);
                if (monBuffRow.children.length > 0) monStatusContainer.appendChild(monBuffRow);
                wrap.appendChild(monStatusContainer);
            }

            row.appendChild(wrap);
        });
        _battleView.appendChild(row);

        // 玩家状态 — 底部居中，双排显示
        if (bs.phase === 'victory') {
            // [修复] 胜利状态下如果存在 Boss 宝箱，显示宝箱按钮
            if (bs._bossChest) {
                var chestWrap = _ce('div');
                chestWrap.style.cssText = 'position:absolute;bottom:30px;left:50%;transform:translateX(-50%);z-index:400;text-align:center;';
                var chestBtn = _ce('button', 'btn btn-gold btn-lg');
                chestBtn.style.cssText = 'padding:15px 40px;font-size:18px;box-shadow:0 0 20px var(--accent-yellow);animation:mastery-pulse 2s infinite;';
                chestBtn.innerHTML = '<span class="icon icon-crown"></span> 开启领主宝箱';
                chestBtn.onclick = function() { CS().openBossChest(); };
                chestWrap.appendChild(chestBtn);
                _battleView.appendChild(chestWrap);
            }
        } else {
            var statusContainer = _ce('div');
            statusContainer.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;';

            var buffRow = _ce('div'); // 上排：临时 Buff
            buffRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';

            var passiveRow = _ce('div'); // 下排：固定被动
            passiveRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';

            var p2 = gs.player;
            // --- 临时 Buff (buffRow) ---
            if (bs.playerStatus['berserk']) buffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.15);border:1px solid var(--accent-purple);border-radius:3px;color:var(--accent-purple);" data-tip="<b>狂暴</b>&#10;攻击力 +50%&#10;每回合扣除 1% 最大HP&#10;剩余 ' + bs.playerStatus['berserk'] + ' 回合"><span class="icon icon-enrage"></span> 狂暴</span>';
            if (bs.playerStatus['bleed']) buffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,107,122,0.15);border:1px solid var(--accent-red);border-radius:3px;color:var(--accent-red);" data-tip="<b>流血</b>&#10;每回合扣除 4 HP&#10;剩余 ' + bs.playerStatus['bleed'] + ' 回合"><span class="icon icon-dripping-blade"></span> 流血</span>';
            if (bs.shieldAmount > 0) buffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.15);border:1px solid var(--accent-blue);border-radius:3px;color:var(--accent-blue);" data-tip="<b>科技护盾</b>&#10;吸收 ' + bs.shieldAmount + ' 点伤害"><span class="icon icon-energy-shield"></span> ' + bs.shieldAmount + '</span>';
            if (p2.activeCoating) buffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid var(--accent-yellow);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>基因涂层</b>&#10;剩余 ' + (p2.coatingTurnsLeft||0) + ' 回合"><span class="icon icon-paintbrush"></span>涂层</span>';
            if (p2.toxicity > 0) buffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.1);border:1px solid var(--accent-purple);border-radius:3px;color:var(--accent-purple);" data-tip="<b>基因毒性</b>&#10;当前 ' + p2.toxicity + '/' + (p2.toxicity_max||50) + '&#10;超过 50 时每回合扣血 2%"><span class="icon icon-biohazard"></span> ' + p2.toxicity + '</span>';
            // [修复] 增加“进程干扰”Debuff 的 UI 显示
            if (bs._processPenalty > 0) buffRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.15);border:1px solid var(--accent-blue);border-radius:3px;color:var(--accent-blue);animation:glitch 1.5s infinite;" data-tip="<b>进程干扰</b>&#10;下一次打出器官卡牌时，额外消耗 ' + bs._processPenalty + ' 点进程"><span class="icon icon-ram"></span> 进程干扰 +' + bs._processPenalty + '</span>';

            // --- 固定被动 (passiveRow) ---
            var counterTargets = { mutant: '寄生群落', swarm: '机械余烬', ember: '异变者' };
            if (bs.playerRaces && bs.playerRaces.length > 0) {
                var countered = {};
                bs.playerRaces.forEach(function(r) { countered[counterTargets[r]] = true; });
                var cNames = Object.keys(countered);
                if (cNames.length > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.12);border:1px solid rgba(255,213,79,0.3);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>种族克制 +50%</b>&#10;对 ' + cNames.join('、') + ' 伤害 +50%，无视防御"><span class="icon icon-crossed-swords"></span> ' + cNames.map(function(n) { return '克' + n.slice(0,2); }).join(' ') + '</span>';
            }
            // 专精特定被动说明
            var dc = GD().DUAL_CLASSES[bs.dualKey];
            if (dc) {
                var dcClr = dc.color || 'var(--accent-yellow)';
                passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,255,255,0.03);border:1px solid ' + dcClr + ';border-radius:3px;color:' + dcClr + ';" data-tip="<b style=color:' + dcClr + '>' + dc.name + '：</b>&#10;<b>' + dc.passive + '</b>&#10;' + dc.passiveDesc + '"><span class="icon icon-dna"></span> ' + dc.passive + '</span>';
            }

            var cfx = bs.componentEffects;
            if (cfx) {
                if (cfx.armorPen > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:3px;color:var(--accent-blue);" data-tip="<b>破甲</b>&#10;无视目标 ' + Math.round(cfx.armorPen*100) + '% 防御"><span class="icon icon-shield-crack"></span> ' + Math.round(cfx.armorPen*100) + '%破</span>';
                if (cfx.toxinConv > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.12);border:1px solid rgba(206,147,216,0.25);border-radius:3px;color:var(--accent-purple);" data-tip="<b>毒素转化</b>&#10;攻击伤害的 ' + Math.round(cfx.toxinConv*100) + '% 转为额外毒素伤害"><span class="icon icon-poison-gas"></span> ' + Math.round(cfx.toxinConv*100) + '%毒转</span>';
                if (cfx.lifeDrainChance > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.2);border-radius:3px;color:var(--accent-green);" data-tip="<b>吸血</b>&#10;毒素发作时 ' + Math.round(cfx.lifeDrainChance*100) + '% 概率吸取 ' + (cfx.lifeDrainAmt||0) + ' HP"><span class="icon icon-dripping-blade"></span> ' + Math.round(cfx.lifeDrainChance*100) + '%吸血</span>';
                if (cfx.thornsPct > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:3px;color:var(--accent-blue);" data-tip="<b>电磁反伤</b>&#10;受到攻击时反弹 ' + Math.round(cfx.thornsPct*100) + '% 伤害"><span class="icon icon-lightning-arc"></span> ' + Math.round(cfx.thornsPct*100) + '%反伤</span>';
                if (cfx.dotBonus > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(206,147,216,0.12);border:1px solid rgba(206,147,216,0.25);border-radius:3px;color:var(--accent-purple);" data-tip="<b>DOT强化</b>&#10;每回合毒素伤害 +' + cfx.dotBonus + '"><span class="icon icon-poison-gas"></span>+ ' + cfx.dotBonus + '</span>';
                if (cfx.bonusVsSwarm > 0) passiveRow.innerHTML += '<span class="txt-xs help-tip" style="padding:3px 8px;background:rgba(255,213,79,0.1);border:1px solid rgba(255,213,79,0.2);border-radius:3px;color:var(--accent-yellow);" data-tip="<b>对寄生增伤</b>&#10;对寄生群落种族伤害 +' + Math.round(cfx.bonusVsSwarm*100) + '%"><span class="icon icon-insect"></span> +' + Math.round(cfx.bonusVsSwarm*100) + '%</span>';
            }

            if (buffRow.children.length > 0) statusContainer.appendChild(buffRow);
            if (passiveRow.children.length > 0) statusContainer.appendChild(passiveRow);
            _battleView.appendChild(statusContainer);
        }
    }

    function _renderActions(gs, inBattle) {
        var bar = document.getElementById('ui-action-bar'); if (!bar) return; bar.innerHTML = '';
        if (inBattle) {
            var bsv = CS().getBattleState();
            var skillInfo = document.getElementById('ui-skill-info');

            // [新增] 伤害/数值预测逻辑
            var getForecast = function(slot, baseAtk) {
                if (!bsv) return { dmg: baseAtk, heal: 0, tag: "" };
                var mon = bsv.monsters[bsv.currentTarget];
                if (!mon || mon.hp <= 0) return { dmg: baseAtk, heal: 0, tag: "" };

                var md = GD().MONSTERS[mon.id];
                var dmg = baseAtk;
                var ignoreDef = false;
                var tag = "";

                // 1. 研究等级 & 种族克制
                var rl = (gs.bestiary && gs.bestiary.researchLevels) ? (gs.bestiary.researchLevels[mon.id] || 0) : 0;
                if (rl >= 2) dmg *= 1.1;

                var pRaces = gs.player.masteries.filter(function(r){return r;});
                var isCounter = false;
                for(var i=0; i<pRaces.length; i++){
                    var pr = pRaces[i];
                    if((pr==='mutant' && md.race==='swarm')||(pr==='swarm' && md.race==='ember')||(pr==='ember' && md.race==='mutant')){ isCounter = true; break; }
                }
                if (isCounter) { dmg *= 1.5; ignoreDef = true; tag = " (弱点)"; }

                // 2. 器官基础倍率
                var sData = gs.player[slot] || { tier: 1 };
                var eqId = sData.equipped;
                var boData = eqId ? (GD().BOSS_ORGANS || {})[eqId] : null;
                var syncLvl = gs.inventory.organSyncLevels[eqId] || 1;
                var tierFactor = 1 + (sData.tier - 1) * 0.1 * syncLvl;
                // Boss器官的基础倍率
                if (boData && boData.skillEffect && boData.skillEffect.baseMultiplier) {
                    dmg *= boData.skillEffect.baseMultiplier * tierFactor;
                } else {
                    dmg *= tierFactor;
                }

                // 3. 涂层加成
                if (slot === 'predatory_organ') {
                    if (gs.player.activeCoating === 'COAT_ANTI_MUTANT' && md.race === 'mutant') { dmg *= 1.5; ignoreDef = true; }
                    if (gs.player.activeCoating === 'COAT_ANTI_SWARM' && md.race === 'swarm') dmg *= 1.6;
                    if (gs.player.activeCoating === 'COAT_ANTI_EMBER' && md.race === 'ember') dmg *= 1.3;
                }

                // 4. 双专精加成
                if (slot === 'predatory_organ' && bsv && bsv.dualKey === 'mutant+mutant') { dmg *= 1.4; ignoreDef = true; }

                // 5. 特殊觉醒
                if (slot === 'predatory_organ' && sData.equipped === '暴君核心' && syncLvl >= 3) ignoreDef = true;

                // 6. 连招引爆
                var heal = 0;
                if (slot === 'gland_core') {
                    if (sData.equipped === '蜂后髓核') { dmg *= 3; heal = dmg; }
                    else if (sData.equipped === '高能电泳核') { dmg *= 2.0; ignoreDef = true; }
                    else if (mon.status['poison']) { dmg *= 3; heal = dmg; tag = " (爆发)"; }
                    else if (mon.status['compromised']) { dmg *= 2.0; tag = " (崩解)"; }
                    else { dmg *= 0.5; }
                }

                // 5. 防御减免模拟
                if (!ignoreDef) {
                    var effDef = (mon.def || 0) + (mon._defBuff || 0);
                    var cfx = bsv.componentEffects || {};
                    if (cfx.armorPen > 0) effDef *= (1 - cfx.armorPen);
                    var reduction = window.GameState.calcDamageReduction(effDef);
                    dmg *= (1 - reduction);
                }

                return { dmg: Math.ceil(dmg), heal: Math.ceil(heal), tag: tag };
            };

            if (skillInfo) {
                skillInfo.style.display = '';
                var proc = gs.player.process, atk = gs.player.atk;
                var isVictory = bsv && bsv.phase === 'victory';
                var curMon = bsv && bsv.monsters ? bsv.monsters[bsv.currentTarget] : null;
                var curMonStatus = curMon ? curMon.status['poison'] : false;
                var curMonIon = curMon ? curMon.status['ionized'] : false;
                var curMonComp = curMon ? curMon.status['compromised'] : false;

                // 计算受干扰后的实际消耗
                var getActualCost = function(base) {
                    var penalty = (bsv ? bsv._processPenalty || 0 : 0);
                    var envPenalty = (bsv && bsv.dungeonEnv ? bsv.dungeonEnv.effect.ramPenalty || 0 : 0);
                    return base + penalty + envPenalty;
                };

                var bos2 = GD().BOSS_ORGANS || {};
                var s1BaseCost = (gs.player.predatory_organ.equipped && bos2[gs.player.predatory_organ.equipped] ? bos2[gs.player.predatory_organ.equipped].skillCost : 2);
                var s1Cost = getActualCost(s1BaseCost);
                var f1 = getForecast('predatory_organ', atk);

                var s2BaseCost = (gs.player.chitin_epidermis.equipped && bos2[gs.player.chitin_epidermis.equipped] ? bos2[gs.player.chitin_epidermis.equipped].skillCost : 3);
                var s2Cost = getActualCost(s2BaseCost);

                var s3BaseCost = (gs.player.gland_core.equipped && bos2[gs.player.gland_core.equipped] ? bos2[gs.player.gland_core.equipped].skillCost : 3);
                var s3Cost = getActualCost(s3BaseCost);
                var f3 = getForecast('gland_core', atk);

                var c1 = isVictory ? false : proc >= s1Cost, c2 = isVictory ? false : proc >= s2Cost, c3 = isVictory ? false : proc >= s3Cost;
                var gc = function(ok, clr) { return ok ? clr : 'var(--text-disabled)'; };

                // 怪物意图预测 (Lv.1 研究解锁)
                var intentHTML = "";
                if (curMon && !isVictory && curMon.intent) {
                    var rl2 = (gs.bestiary && gs.bestiary.researchLevels) ? (gs.bestiary.researchLevels[curMon.id] || 0) : 0;
                    var valStr = (rl2 >= 1) ? " (" + Math.ceil(curMon.intent.value * (curMon._atkMult || 1) * (curMon._scaleAtk || 1)) + " 点)" : "";
                    intentHTML = '<div style="margin-bottom:12px;padding:10px;background:rgba(255,68,85,0.05);border:1px solid rgba(255,68,85,0.2);border-radius:4px;">' +
                        '<div class="txt-xs txt-red txt-bold">> 目标意图确认</div>' +
                        '<div class="txt-xs txt-white" style="margin-top:4px;">' + curMon.name + ' 准备执行：<span style="color:var(--accent-red)">' + curMon.intent.label + valStr + '</span></div></div>';
                }

                // 实时读取器官技能名和详情
                var _bos2 = GD().BOSS_ORGANS || {};
                var _sk = { predatory_organ: { name: '捕食打击', desc: '物理伤害技能', color: 'var(--accent-red)' },
                            chitin_epidermis: { name: '生物防御', desc: '护盾技能', color: 'var(--accent-green)' },
                            gland_core: { name: '腺体脉冲', desc: '连招引爆技能', color: 'var(--accent-yellow)' } };
                ['predatory_organ','chitin_epidermis','gland_core'].forEach(function(s){
                    var eq2 = gs.player[s].equipped;
                    if (eq2 && _bos2[eq2] && _bos2[eq2].skillName) {
                        var bo = _bos2[eq2];
                        _sk[s] = { name: bo.skillName, desc: bo.skillEffect ? bo.skillEffect.desc || bo.skillName : bo.skillName, color: _getOrganColor(eq2).hex || _sk[s].color };
                    }
                });

                skillInfo.innerHTML = '<div class="txt-xs txt-green txt-bold" style="margin-bottom:10px;">> 动态战术预测</div>' +
                    intentHTML +
                    '<div style="display:flex;flex-direction:column;gap:6px;">' +
                    '<div data-key="1" class="help-tip" style="background:var(--bg-card);border:1px solid ' + (c1 && curMonIon ? 'rgba(0,212,255,0.8)' : 'var(--border-dim)') + ';border-radius:4px;padding:6px 14px;' + (c1 ? '' : 'opacity:0.5;') + (c1 && curMonIon ? 'box-shadow:0 0 10px rgba(0,212,255,0.4);' : '') + '" data-tip="<b style=color:var(--accent-red)>' + _sk.predatory_organ.name + ' · ' + _sk.predatory_organ.desc + '</b>&#10;&#10;<b>公式：</b>最终伤害 = (攻击力 + 器官加成) × 克制倍率 - 目标防御&#10;<b>特殊：</b>对机械族施加 [电离标记]，第二次命中引爆：剥离全部护盾 + 全场 50% 溅射&#10;<b>特殊：</b>对寄生族连续命中触发 [生物崩解] 标记&#10;<b>概率：</b>30% 挂毒 3 回合&#10;&#10;当前预估净伤害 = <b style=color:var(--accent-red)>' + f1.dmg + '</b>（已扣防御/护盾）">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(c1, 'var(--accent-red)') + ';">[1] ' + _sk.predatory_organ.name + '</span> <span class="txt-xs txt-dim">' + s1Cost + '进程 · <b style="color:var(--accent-red)">' + f1.dmg + '</b>伤害' + f1.tag + '</span></div>' +
                    '<div data-key="2" class="help-tip" style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:6px 14px;' + (c2 ? '' : 'opacity:0.5;') + '" data-tip="<b style=color:var(--accent-green)>' + _sk.chitin_epidermis.name + ' · ' + _sk.chitin_epidermis.desc + '</b>&#10;&#10;<b>公式：</b>护盾值 = 当前攻击力 × 0.6 = <b style=color:var(--accent-blue)>' + Math.ceil(atk * 0.6) + '</b>&#10;<b>效果：</b>护盾存在期间吸收物理伤害&#10;<b>策略：</b>开局套盾防猝死，或在怪物蓄力/狂怒前预判使用">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(c2, 'var(--accent-green)') + ';">[2] ' + _sk.chitin_epidermis.name + '</span> <span class="txt-xs txt-dim">' + s2Cost + '进程 · <b style="color:var(--accent-blue)">+' + Math.ceil(atk * 0.6) + '</b>护盾</span></div>' +
                    '<div data-key="3" class="help-tip" style="background:var(--bg-card);border:1px solid ' + (c3 && (curMonStatus || curMonComp) ? 'rgba(255,213,79,0.8)' : 'var(--border-dim)') + ';border-radius:4px;padding:6px 14px;' + (c3 ? '' : 'opacity:0.5;') + (c3 && (curMonStatus || curMonComp) ? 'box-shadow:0 0 10px rgba(255,213,79,0.4);' : '') + '" data-tip="<b style=color:var(--accent-yellow)>' + _sk.gland_core.name + ' · ' + _sk.gland_core.desc + '</b>&#10;&#10;<b>中毒目标：</b>引爆造成 攻击力 × 3 伤害 + <b style=color:var(--accent-green)>全额吸血</b>&#10;<b>崩解目标：</b>引爆清除闪避 + 易伤 2 回合&#10;<b>无标记：</b>仅造成 50% 微弱酸蚀伤害&#10;&#10;<b>核心思路：</b>先用 [1] 打击 挂标记，再用 [3] 脉冲 引爆。单体高爆发 + 自回复。">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(c3, 'var(--accent-yellow)') + ';">[3] ' + _sk.gland_core.name + '</span> <span class="txt-xs txt-dim">' + s3Cost + '进程 · <b style="color:var(--accent-yellow)">' + f3.dmg + '</b>爆破' + (f3.heal > 0 ? ' <b style="color:var(--accent-green)">+' + f3.heal + '吸血</b>' : '') + f3.tag + '</span></div>' +
                    '<div data-key="Space" style="background:var(--bg-card);border:1px solid ' + (isVictory ? 'rgba(0,255,136,0.3)' : 'var(--border-dim)') + ';border-radius:4px;padding:6px 14px;">' +
                    '<span class="txt-xs txt-bold" style="color:' + 'var(--accent-orange)' + ';">[空格] ' + (isVictory ? '退出战斗' : '回合结束 · 回复 ' + (gs.player.process_recovery || 3) + ' 进程') + '</span></div>' +
                    (isVictory ? '' : '<div data-key="E" style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:6px 14px;' + (proc >= 4 ? '' : 'opacity:0.5;') + '">' +
                    '<span class="txt-xs txt-bold" style="color:' + gc(proc >= 4, 'var(--accent-red)') + ';">[E] 紧急切断</span> <span class="txt-xs txt-dim">· 消耗 4 进程 · 脱离战斗</span></div>') +
                    (isVictory && bsv && bsv.isDungeon && (bsv._dungeonFloor || 0) < 3 ? '<div data-key="0" style="background:var(--bg-card);border:1px solid var(--accent-green);border-radius:4px;padding:6px 14px;margin-bottom:4px;box-shadow:0 0 10px rgba(0,255,136,0.2);">' +
                    '<span class="txt-xs txt-bold" style="color:var(--accent-green);">[0] 深入地下城</span> <span class="txt-xs txt-dim">· 进入下一层 · HP 继承</span></div>' : '') +
                    '<div class="txt-xs txt-purple txt-bold" style="margin-top:4px;">> 魔药说明 (不消耗进程)</div>' +
                    [0,1,2].map(function(idx) {
                        var pkeys = ['4','5','6'];
                        var pid = gs.inventory.potions[idx];
                        if (pid && !isVictory) {
                            var pd = _buildPotionDetail(pid); if (!pd) return '';
                            return '<div data-key="' + pkeys[idx] + '" class="help-tip" style="background:var(--bg-card);border:1px solid rgba(156,39,176,0.3);border-radius:4px;padding:4px 14px;" data-tip="' + pd.tooltip + '">' +
                                '<span class="txt-xs txt-bold" style="color:var(--accent-purple);">[' + pkeys[idx] + '] ' + pd.name + '</span> <span class="txt-xs txt-dim">毒性+' + pd.toxicity + '</span></div>';
                        } else {
                            return '<div style="background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;padding:4px 14px;opacity:0.4;">' +
                                '<span class="txt-xs txt-dim">[' + pkeys[idx] + '] 未装备魔药</span></div>';
                        }
                    }).join('') +
                    '</div>';
            }

            var bos = GD().BOSS_ORGANS || {};
            var defs = _DEFAULT_SKILLS;
            defs.forEach(function (btn) {
                var eq = gs.player[btn.s].equipped;
                var baseCost = btn.c;
                if (eq && bos[eq] && bos[eq].skillName) {
                    btn.l = bos[eq].skillName;
                    baseCost = bos[eq].skillCost || btn.c;
                    btn.cls = _getOrganColor(eq).btnCls;
                }

                // [修复] 技能卡牌按钮消耗数值同步 Debuff 状态
                var penalty = (bsv ? bsv._processPenalty || 0 : 0);
                var envPenalty = (bsv && bsv.dungeonEnv ? bsv.dungeonEnv.effect.ramPenalty || 0 : 0);
                var actualCost = baseCost + penalty + envPenalty;

                var can = gs.player.process >= actualCost && !isVictory;
                var b = _ce('button', 'btn btn-battle-card ' + (can ? btn.cls : 'btn-gray'));
                var costHTML = (penalty + envPenalty > 0) ? '<span style="color:var(--accent-red); font-weight:bold;">' + actualCost + '</span>' : actualCost;
                b.innerHTML = '<span class="txt-sm txt-bold">[' + btn.k + '] ' + btn.l + '</span>' +
                              '<span class="txt-xs">' + costHTML + ' 进程</span>';
                if (can) b.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; var s = btn.s; setTimeout(function() { CS().playCard(s); }, 80); };
                bar.appendChild(b);
            });
            // 魔药按钮
            if (!isVictory) {
                var potions = gs.inventory.potions || [];
                potions.forEach(function(pid, pidx) {
                    var pd = _buildPotionDetail(pid); if (!pd) return;
                    var pkeys = ['4','5','6'];
                    var pb = _ce('button', 'btn btn-purple btn-battle-card');
                    pb.innerHTML = '<span class="txt-sm txt-bold">[' + pkeys[pidx] + '] ' + pd.name + '</span><span class="txt-xs">毒性+' + pd.toxicity + '</span>';
                    pb.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; setTimeout(function() { CS().playCard(null, pid); }, 80); };
                    bar.appendChild(pb);
                });
            }
            // 结束回合 / 逃跑
            var bs = CS().getBattleState();
            if (bs && bs.phase === 'victory') {
                // 地下城：深入按钮
                if (bs.isDungeon && (bs._dungeonFloor || 0) < 3) {
                    var deep = _ce('button', 'btn btn-green btn-battle-card');
                    var _df2 = (function(f){ var cn = ['','一','二','三','四','五','六','七','八','九','十']; return '地下' + (cn[f]||f) + '层'; })((bs._dungeonFloor||0)+2);
                    deep.innerHTML = '<span class="txt-sm txt-bold">[0] 深入地下城</span><span class="txt-xs">' + _df2 + '</span>';
                    deep.onclick = function() { this.style.transform = 'translateY(2px)'; setTimeout(function() { CS().dungeonDeep(); }, 80); };
                    bar.appendChild(deep);
                }
                var end = _ce('button', 'btn btn-orange btn-battle-card');
                end.innerHTML = '<span class="txt-sm txt-bold">[空格] 退出战斗</span><span class="txt-xs">返回探索</span>';
                end.onclick = function() { this.style.transform = 'translateY(2px)'; setTimeout(function() { CS().exitBattle(); }, 80); };
                bar.appendChild(end);
            } else {
                var end = _ce('button', 'btn btn-orange btn-battle-card');
                var recoveryVal = gs.player.process_recovery || 3;
                if (bs._noProcessRecovery) recoveryVal = 0;
                var aliveM3 = (CS().getBattleState() && CS().getBattleState().monsters || []).filter(function(m){return m.hp>0;});
                if (aliveM3.some(function(m){ return m.affixes && m.affixes.some(function(a){return a.id==='jammer';}); })) recoveryVal = Math.max(1, recoveryVal - 1);
                end.innerHTML = '<span class="txt-sm txt-bold">[空格] 结束回合</span><span class="txt-xs">回复 ' + recoveryVal + ' 进程</span>';
                end.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; setTimeout(function() { CS().endTurn(); }, 80); };
                bar.appendChild(end);
                // 逃跑按钮（训练模式不显示）
                if (!bs._isTraining) {
                    var fleeBtn = _ce('button', 'btn btn-red btn-battle-card');
                    fleeBtn.innerHTML = '<span class="txt-sm txt-bold">[E] 紧急切断</span><span class="txt-xs">消耗 4 进程</span>';
                    fleeBtn.onclick = function() { this.style.transform = 'translateY(2px)'; this.style.filter = 'brightness(0.8)'; setTimeout(function() { CS().flee(); }, 80); };
                    bar.appendChild(fleeBtn);
                }
                // 训练模式：退出按钮
                if (bs._isTraining) {
                    var quitBtn = _ce('button', 'btn btn-blue btn-battle-card');
                    quitBtn.innerHTML = '<span class="txt-sm txt-bold">[Q] 退出训练</span><span class="txt-xs">返回实验室</span>';
                    quitBtn.onclick = function() { this.style.transform = 'translateY(2px)'; setTimeout(function() { CS().exitBattle(); }, 80); };
                    bar.appendChild(quitBtn);
                }
            }
        } else {
            var skillInfo = document.getElementById('ui-skill-info');
            if (skillInfo) { skillInfo.innerHTML = ''; skillInfo.style.display = 'none'; }
            // 楼层信息条
            var floor = gs.mapState.currentFloor || 1;
            var pool = gs.mapState.floorNodePool || [];
            var totalN = 0, doneN = 0;
            for (var fi = 0; fi < pool.length; fi++) { if (!pool[fi].hidden) { totalN++; if (pool[fi].exhausted) doneN++; } }
            var pct = totalN > 0 ? Math.round(doneN / totalN * 100) : 0;
            var floorBar = _ce('div');
            floorBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 25px 10px 35px;font-size:14px;font-family:inherit;min-height:60px;';
            var hintText = _renderHints(gs);
            floorBar.innerHTML = '<div style="display:flex;align-items:center;gap:16px;">' +
                '<span class="txt-bold" style="color:var(--accent-blue);font-size:16px;">' + (function(f){ var cn = ['','一','二','三','四','五','六','七','八','九','十']; return '地下' + (cn[f]||f) + '层'; })(floor) + '</span>' +
                '<span class="txt-sm txt-bold" style="color:var(--text-main);">节点 ' + doneN + '/' + totalN + '</span>' +
                '<div class="progress-container" style="width:180px;height:8px;"><div class="progress-fill ram-fill" style="width:' + pct + '%;"></div></div>' +
                (gs.mapState.bossDefeated ? '<span style="color:var(--accent-red);">领主已击杀</span>' : (pct >= 60 ? '<span style="color:var(--accent-yellow);">领主已现身</span>' : '')) +
                '</div>' +
                '<div id="ui-floor-hint" class="txt-xs" style="text-align:center;color:var(--accent-yellow);opacity:0.65;margin:2px 0;">' + hintText + '</div>' +
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
        box.style.cssText = 'width:min(700px,90vw);max-height:calc(100vh - 220px);background:var(--bg-modal);border:1px solid var(--accent-blue);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
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
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;font-family:sans-serif;';
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
        box.style.cssText = 'width:min(700px,90vw);max-height:calc(100vh - 200px);background:var(--bg-modal);border:1px solid #9c27b0;border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
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
            '<span class="txt-xs txt-green" style="text-shadow:0 0 5px var(--accent-green);">✓ 已同步</span></div>';
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
        box.style.cssText = 'width:min(700px,90vw);max-height:calc(100vh - 200px);background:var(--bg-modal);border:1px solid #f57f17;padding:0;display:flex;flex-direction:column;overflow:hidden;';

        var killedCount = 0; Object.keys(gs.bestiary.killCount || {}).forEach(function(id) { killedCount += (gs.bestiary.killCount[id] || 0); });
        var infoBar = _ce('div');
        infoBar.style.cssText = 'margin-bottom:20px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:4px;width:min(700px,90vw);text-align:left;';
        infoBar.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<span><span class="txt-xs txt-gold">已击杀 ' + killedCount + ' 只</span><span class="txt-xs txt-dim"> · 共收录 ' + Object.keys(allMonsters).length + ' 种</span></span>' +
            '<span class="txt-xs txt-gold">当前基因点数: ' + gs.player.bp + '</span></div>' +
            '<div class="txt-xs txt-dim"><b>研究奖励：</b> Lv.1 <span style="color:var(--accent-blue)">数值透明</span> | Lv.2 <span style="color:var(--accent-red)">伤害+10%</span> | Lv.3 <span style="color:var(--accent-yellow)">掉落+25%</span></div>';
        _modalOverlay.appendChild(infoBar);

        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(245,124,0,0.08);border-bottom:1px solid #f57f17;display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-gold txt-bold">[ 变异体图鉴 & 基因深度研究 ]</div>' +
            '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button>';
        box.appendChild(head);

        var body = _ce('div');
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:15px;overflow-y:auto;flex:1;';
        var killed = gs.bestiary.killCount || {};
        var research = gs.bestiary.researchLevels || {};
        var tierNames = { common: '普通', elite: '精英', world_boss: '世界首领' };
        var raceNames = _RACE_NAMES;
        var raceIcons = { mutant: 'icon-mutant', swarm: 'icon-swarm', ember: 'icon-ember' };
        var raceClrs = { mutant: '#ff6b4a', swarm: '#9acd32', ember: '#4ab8ff' };
        var _filterRace = 'mutant';

        // 种族筛选标签栏（遵循设计规范按钮样式）
        var _tabBar = _ce('div');
        _tabBar.style.cssText = 'display:flex;gap:8px;padding:0 0 12px 0;border-bottom:1px solid var(--border-dim);';
        var _tabBtns = {};
        var tabs = [{ r: 'mutant', l: '异变者', cls: 'btn-red' },
                    { r: 'swarm', l: '寄生群落', cls: 'btn-green' },
                    { r: 'ember', l: '机械余烬', cls: 'btn-blue' }];
        tabs.forEach(function(t) {
            var tb = _ce('button', 'btn btn-sm ' + t.cls);
            tb.style.cssText = 'padding:4px 12px;font-size:13px;';
            tb.textContent = t.l;
            tb.onclick = function() { _filterRace = t.r; _filterDisplay(); };
            _tabBtns[t.r] = tb;
            _tabBar.appendChild(tb);
        });
        body.appendChild(_tabBar);

        var _bestiaryWrap = _ce('div');
        _bestiaryWrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
        body.appendChild(_bestiaryWrap);

        var _filterDisplay = function() {
            // 更新按钮激活态
            tabs.forEach(function(t) {
                _tabBtns[t.r].style.opacity = (_filterRace === t.r) ? '1' : '0.5';
                _tabBtns[t.r].style.filter = (_filterRace === t.r) ? 'brightness(1.2)' : 'brightness(1)';
            });
            // 切换显示
            var races = ['mutant','swarm','ember'];
            races.forEach(function(race) {
                var els = _bestiaryWrap.querySelectorAll('[data-bestiary-race=\"' + race + '\"]');
                for (var ei = 0; ei < els.length; ei++) {
                    els[ei].style.display = (_filterRace === race) ? '' : 'none';
                }
            });
        };

        ['mutant','swarm','ember'].forEach(function(race) {
            var raceHeaderClrs = { mutant: '#ff6b4a', swarm: '#9acd32', ember: '#4ab8ff' };
            var headerDiv = _ce('div');
            headerDiv.setAttribute('data-bestiary-race', race);
            headerDiv.className = 'txt-sm txt-bold';
            headerDiv.style.cssText = 'margin-top:8px;margin-bottom:4px;color:' + (raceHeaderClrs[race] || '#ffd54f') + ';';
            headerDiv.innerHTML = '<span class="icon ' + raceIcons[race] + '"></span> ' + raceNames[race];
            _bestiaryWrap.appendChild(headerDiv);
            // 种族背景故事
            var loreText = (GD().RACE_LORE || {})[race] || '';
            if (loreText) {
                var loreDiv = _ce('div');
                loreDiv.setAttribute('data-bestiary-race', race);
                loreDiv.className = 'txt-xs';
                loreDiv.style.cssText = 'color:' + (raceHeaderClrs[race] || '#ffd54f') + ';opacity:0.7;margin-bottom:12px;line-height:1.6;padding-left:2px;';
                loreDiv.textContent = loreText;
                _bestiaryWrap.appendChild(loreDiv);
            }

            Object.keys(allMonsters).forEach(function(id) {
                var m = allMonsters[id];
                if (m.trainingOnly) return;
                if (m.race !== race) return;
                var kc = killed[id] || 0;
                var rl = research[id] || 0;
                var known = kc > 0;
                var rclr = raceHeaderClrs[m.race] || '#ffd54f';
                var bgClr = known ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)';

                var item = _ce('div');
                item.setAttribute('data-bestiary-race', race);
                item.style.cssText = 'padding:15px 18px;background:' + bgClr + ';border-radius:4px;border-left:3px solid ' + (known ? rclr : '#333') + ';display:flex;flex-direction:column;gap:10px;';

                var topRow = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<span class="txt-sm txt-bold" style="color:' + (known ? rclr : 'var(--text-disabled)') + ';">' + (known ? m.name : '???') + '</span>' +
                    '<span class="txt-xs txt-dim">' + (known ? tierNames[m.tier] + ' · Lv.' + m.level : '未遭遇') + '</span>' +
                    '</div>';

                var researchRow = '';
                if (known) {
                    var nextCost = [500, 1500, 3000][rl] || null;
                    var canAfford = nextCost !== null && gs.player.bp >= nextCost;

                    researchRow = '<div style="display:flex;align-items:center;gap:15px;margin-top:4px;padding:10px;background:rgba(0,0,0,0.2);border-radius:4px;">' +
                        '<div style="flex:1;">' +
                            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span class="txt-xs txt-gold">研究等级 ' + rl + '/3</span>' +
                            (rl >= 3 ? '<span class="txt-xs txt-green">研究已饱和</span>' : '<span class="txt-xs txt-dim">下级需 ' + nextCost + ' BP</span>') + '</div>' +
                            '<div class="progress-container" style="height:6px;background:#111;"><div class="progress-fill xp-fill" style="width:' + (rl/3*100) + '%; transition:width 0.5s;"></div></div>' +
                        '</div>' +
                        (rl < 3 ? '<button class="btn ' + (canAfford ? 'btn-gold' : 'btn-gray') + ' btn-sm" onclick="var r=GameState.researchMonster(\'' + id + '\'); if(r.success){UISystem.showBestiaryModal();UISystem.showNotification(\'研究突破！\', \'' + m.name + ' 等级提升至 \' + r.newLevel, \'var(--accent-yellow)\');}" style="padding:6px 15px;">' + (canAfford ? '投入研究' : 'BP不足') + '</button>' : '') +
                        '</div>';
                }

                item.innerHTML = topRow +
                    (known ? '<div class="txt-xs txt-dim">生命:' + m.hp + ' 攻击:' + m.atk + ' 防御:' + m.def + ' | 击杀: ' + kc + ' | ' + m.weakness + '</div>' : '') +
                    researchRow;

                _bestiaryWrap.appendChild(item);
            });
        });
        _filterDisplay();
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function showDungeonWarning(pathIndex) {
        var gs = GS(); if (!gs) return;
        var path = gs.mapState.discoveryPaths[pathIndex]; if (!path) return;
        var poolIdx = path._poolIndex;
        var node = (poolIdx !== undefined) ? gs.mapState.floorNodePool[poolIdx] : null;
        var env = (node && node.env) ? node.env : { name: '未知干扰', desc: '环境代码扫描失败，进入后可能面临未知风险。', effect: {} };

        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(500px,90vw);background:var(--bg-modal);border:1px solid var(--accent-red);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(255,68,85,0.08);border-bottom:1px solid var(--accent-red);';
        head.innerHTML = '<div class="txt-md txt-red txt-bold">[ 地下城准入环境预警 ]</div>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:25px 30px;display:flex;flex-direction:column;gap:18px;';
        body.innerHTML = '<div class="txt-sm txt-white" style="line-height:1.6;">你正准备进入一个深层隔离区。传感器监测到该区域存在<b>底层环境代码变异</b>。</div>' +
            '<div style="padding:15px;background:rgba(255,68,85,0.05);border:1px solid rgba(255,68,85,0.25);border-radius:6px;">' +
            '<div class="txt-sm txt-red txt-bold" style="margin-bottom:6px;"><span class="icon icon-hazard-sign"></span> ' + env.name + '</div>' +
            '<div class="txt-xs txt-dim">' + env.desc + '</div></div>' +
            '<div class="txt-xs txt-dim">建议在进入前前往 [实验室] 准备针对性的基因涂层或炼金魔药。</div>';
        var btnRow = _ce('div');
        btnRow.style.cssText = 'display:flex;gap:15px;justify-content:center;margin-top:10px;';
        var confirmBtn = _ce('button', 'btn btn-red btn-capsule');
        confirmBtn.textContent = '我准备好了';
        confirmBtn.onclick = function() {
            UISystem.closeModal();
            // 地下城直接进入战斗，不走 _handleDiscoveryResult 避免死循环
            _fadeOutCards(function() {
                var res = WS().discover(pathIndex);
                // 消耗路径卡片
                path._used = true;
                // 选取怪物：随机普通+精英，同种族混合
                var all = Object.keys(GD().MONSTERS).filter(function(k) {
                    var m = GD().MONSTERS[k]; return !m.trainingOnly && (m.tier === 'common' || m.tier === 'elite');
                });
                var dungeonMids = [];
                for (var di = 0; di < 2; di++) {
                    dungeonMids.push(all[Math.floor(Math.random() * all.length)]);
                }
                CS().startBattle(dungeonMids, { isDungeon: true });
                render();
            });
        };
        var cancelBtn = _ce('button', 'btn btn-blue btn-capsule');
        cancelBtn.textContent = '我再看看';
        cancelBtn.onclick = function() {
            UISystem.closeModal();
            // [修复] 取消时不消耗卡片，由于之前没执行 _fadeOutCards 和 discover，卡片依然存在，只需关闭弹窗即可返回
        };
        btnRow.appendChild(confirmBtn);
        btnRow.appendChild(cancelBtn);
        body.appendChild(btnRow);
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function showStatusModal() {
        var gs = GS(); var p = gs.player;
        // 清除残留悬浮提示
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';

        // 1. 创建左右布局容器
        var wrapper = _ce('div');
        wrapper.style.cssText = 'display:flex;gap:20px;align-items:flex-start;width:min(920px,95vw);';

        // 2. 左侧说明栏
        var infoBar = _ce('div');
        infoBar.style.cssText = 'flex:0 0 200px;padding:24px 16px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:6px;text-align:left;align-self:flex-start;';
        infoBar.innerHTML = '<div style="margin-bottom:12px;"><span class="txt-xs txt-blue txt-bold">核心指标</span><div class="txt-xs txt-dim" style="margin-top:4px;">当前原体的最终属性。悬停数值可查看加成来源（溯源）。</div></div>' +
            '<div style="margin-bottom:12px;"><span class="txt-xs txt-blue txt-bold">器官状态</span><div class="txt-xs txt-dim" style="margin-top:4px;">展示已挂载器官及其同调等级。</div></div>' +
            '<div><span class="txt-xs txt-blue txt-bold">专精流派</span><div class="txt-xs txt-dim" style="margin-top:4px;">投入专精点提升属性，特定组合激活全局被动。</div></div>';

        // 3. 右侧主内容盒
        var box = _ce('div', 'modal-box status-modal');
        box.style.cssText = 'flex:1;max-height:calc(100vh - 200px);background:var(--bg-modal);border:1px solid var(--accent-blue);display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden;';

        // 挂载
        wrapper.appendChild(infoBar);
        wrapper.appendChild(box);
        _modalOverlay.appendChild(wrapper);

        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(0,212,255,0.05);border-bottom:1px solid var(--accent-blue);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-blue txt-bold" style="text-shadow:0 0 8px var(--accent-blue);">[ 原体序列深度扫描档案 ]</div>' +
                         '<div style="display:flex;gap:10px;">' +
                         (p.masteries.some(function(m){return m;}) ? '<button class="btn btn-red btn-sm" onclick="if(confirm(\'重置全部专精？\\n消耗 50 基因点数。\')){if(' + p.bp + '>=50){var gs=window.GameState.getState();gs.player.bp-=50;gs.player.masteries=[null,null,null];gs.player.masteryPoints={mutant:0,swarm:0,ember:0};gs.player.availableMasteryPoints+=1;window.GameState.recalcPlayerStats();window.GameState.save();UISystem.render();UISystem.showStatusModal();}}">重置专精</button>' : '') +
                         '<button class="btn btn-red btn-sm" onclick="UISystem.resetGame()">重置序列</button>' +
                         '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button>' +
                         '</div>';
        box.appendChild(head);

        var body = _ce('div');
        body.style.cssText = 'padding:30px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;flex:1;';

        // 核心指标
        var atkBase2 = p.atk_base, defBase2 = p.def_base;
        var atkBonus2 = p.atk - atkBase2, defBonus2 = p.def - defBase2, hpBonus2 = p.hp_max - 100, processBonus2 = p.process_max - 10;

        // [修复] 属性溯源计算逻辑及 _tip 引用
        var getStatSource = function(type) {
            var lines = ["基础序列: " + (type==='atk'?atkBase2:(type==='def'?defBase2:(type==='hp'?100:10)))];
            var mPts = p.masteryPoints; var mData = GD().MASTERIES;
            Object.keys(mPts).forEach(function(r){
                var pts = mPts[r] || 0; if(pts<=0) return;
                var val = mData[r].statsPerPoint[type==='hp'?'hp_max':(type==='process'?'process_max':type)] * pts;
                if(val>0) lines.push("流派 [" + (r==='mutant'?'异变':(r==='swarm'?'寄生':'机械')) + "]: +" + val);
            });
            ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function(s){
                var d = p[s]; if(d.tier<=1) return;
                var bonus = (d.tier-1) * (type==='atk'?3:(type==='hp'?5:3));
                if(type==='process') bonus = (d.tier-1);
                if((type==='atk' && s==='predatory_organ')||(type==='def' && s==='chitin_epidermis')||(type==='hp')||(type==='process' && s==='gland_core')) lines.push("插槽 [" + d.tier + "阶]: +" + bonus);
            });
            return "<b>属性溯源 (" + type.toUpperCase() + "):</b>&#10;" + lines.join("&#10;");
        };

        var _sv = function(base, bonus) { return bonus > 0 ? base + '<span style="color:var(--accent-green);"> +' + bonus + '</span>' : (bonus < 0 ? base + '<span style="color:var(--accent-red);"> ' + bonus + '</span>' : '' + base); };

        var coreHTML2 = '<div style="padding:15px 20px;background:rgba(0,212,255,0.03);border:1px solid rgba(0,212,255,0.15);border-radius:6px;display:flex;flex-direction:column;gap:10px;">' +
            '<div class="txt-sm txt-blue txt-bold">> 核心序列指标</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="txt-sm">' +
            '<div class="stat-row help-tip" data-tip="' + getStatSource('atk') + '"><span class="icon icon-atk"></span>攻击: <span class="stat-val txt-bold">' + _sv(atkBase2, atkBonus2) + '</span></div>' +
            '<div class="stat-row help-tip" data-tip="' + getStatSource('def') + '"><span class="icon icon-def"></span>防御: <span class="stat-val txt-bold">' + _sv(defBase2, defBonus2) + '</span></div>' +
            '<div class="stat-row help-tip" data-tip="' + getStatSource('hp') + '"><span class="icon icon-health"></span>生命: <span class="stat-val txt-bold">' + _sv(100, hpBonus2) + '</span></div>' +
            '<div class="stat-row help-tip" data-tip="' + getStatSource('process') + '"><span class="icon icon-ram"></span>进程: <span class="stat-val txt-bold">' + _sv(10, processBonus2) + '</span></div>' +
            '<div class="stat-row"><span class="icon icon-tox"></span>毒性: <span class="stat-val txt-bold">' + p.toxicity + '/' + (p.toxicity_max||50) + '</span></div>' +
            '<div class="stat-row"><span class="icon icon-upgrade"></span>等级: <span class="stat-val txt-bold">' + p.level + '</span></div>' +
            '<div class="stat-row"><span class="icon icon-dna"></span>基因: <span class="stat-val txt-bold">' + p.bp + '</span></div></div></div>';
        body.innerHTML += coreHTML2;
        // 器官状态
        var organHTML = '<div style="padding:15px 20px;background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.15);border-radius:6px;display:flex;flex-direction:column;gap:10px;">' +
            '<div class="txt-sm txt-green txt-bold">> 已挂载器官状态</div>';
        var organNames = _ORGAN_NAMES;
        var organClrs2 = _BOSS_ORGAN_COLORS;
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
                if (cid) {
                    var dtl = _buildCompDetail(cid);
                    var tipText = '<b>' + cid + '</b>' + (dtl.affixText ? '&#10;' + dtl.affixText : '') + (dtl.slotText ? '&#10;可装备：' + dtl.slotText : '');
                    var _bg3 = 'rgba(255,213,79,0.08)'; var _bd3 = 'rgba(255,213,79,0.2)'; var _cl3 = 'var(--accent-yellow)';
                    organHTML += '<span class="txt-xs txt-dim"> 组件: </span><span class="help-tip" style="padding:6px 10px;font-size:13px;background:' + _bg3 + ';border:1px solid ' + _bd3 + ';border-radius:4px;color:' + _cl3 + ';" data-tip="' + tipText + '">' + _fmtRoman(cid) + '</span>';
                } else if (!cid) {
                    organHTML += '<span class="txt-xs txt-dim"> 组件: </span><span style="padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:4px;color:var(--text-dim);">空槽·未嵌入</span>';
                }
            });
            organHTML += '</div>';
            organHTML += '</div>';
        });
        organHTML += '</div>';
        body.innerHTML += organHTML;
        // 专精流派
        var activeRaces = (p.masteries || []).filter(function(r){return r;});
        var racePriority = { mutant: 1, swarm: 2, ember: 3 };
        activeRaces.sort(function(a,b){ return (racePriority[a]||99) - (racePriority[b]||99); });
        var mk = activeRaces.length >= 2 ? [activeRaces[0], activeRaces[1]].sort().join('+') : '';
        var races = ['mutant', 'swarm', 'ember'];
        var raceNames = _RACE_NAMES;
        var raceClrs = { mutant: { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.08)', bd: 'rgba(255,107,74,0.2)', txt: '#ff6b4a' }, swarm: { hex: '#9acd32', bg: 'rgba(154,205,50,0.08)', bd: 'rgba(154,205,50,0.2)', txt: '#9acd32' }, ember: { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.08)', bd: 'rgba(74,184,255,0.2)', txt: '#4ab8ff' } };
        var dc = mk ? GD().DUAL_CLASSES[mk] : null;
        var selRace = activeRaces[0] || 'mutant';
        var mc = raceClrs[selRace] || raceClrs.mutant;
        // 三流派后缀
        var threeSuffix = '';
        var hasDup = false;
        if (activeRaces.length >= 3) {
            var thirdRace = activeRaces[2];
            hasDup = (activeRaces[0] === activeRaces[1]) || (activeRaces[1] === activeRaces[2]);
            var dupKeys = [activeRaces[0], activeRaces[1]].sort().join('+');
            if (mk === dupKeys) { thirdRace = activeRaces[2]; }
            threeSuffix = ' <span style="font-size:12px;opacity:0.7;">+ ' + raceNames[thirdRace] + '辅修</span>';
        }
        var masteryHTML = '<div style="padding:15px 20px;background:' + mc.bg + ';border:1px solid ' + mc.bd + ';border-radius:6px;display:flex;flex-direction:column;gap:10px;">' +
            '<div class="txt-sm txt-bold" style="color:' + mc.txt + ';">' +
            '> 专精流派（每点提升属性，双流派激活被动） <span class="txt-gold">可用:' + p.availableMasteryPoints + '</span>' + (hasDup ? ' <span class="txt-xs" style="color:var(--accent-yellow);">[同系强化150%]</span>' : '') + '</div>';
        masteryHTML += '<div>';
        if (dc) {
            var dcClr2 = dc.color || 'var(--accent-yellow)';
            masteryHTML += '<div style="padding:12px;background:rgba(255,213,79,0.05);border:1px solid ' + dcClr2 + ';border-radius:4px;margin-bottom:18px;box-shadow:0 0 10px ' + dcClr2 + '44;">' +
                '<div class="txt-sm txt-bold help-tip" style="color:' + dcClr2 + ';" data-tip="<b style=color:' + dcClr2 + '>' + dc.name + '：</b>&#10;<b>' + dc.passive + '</b>&#10;' + dc.passiveDesc + '">' + dc.name + threeSuffix + '</div>' +
                '<div class="txt-xs" style="color:' + dcClr2 + '; opacity:0.9;">' + dc.passiveDesc + '</div></div>';
        }
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
            if (previewHTML) masteryHTML += '<div class="txt-xs txt-dim" style="margin-top:8px;">单流派已提供属性加成。选两个不同流派可激活下方双专精被动：</div><div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;margin-bottom:18px;">' + previewHTML + '</div>';
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
            if (m.statsPerPoint.process_max) parts.push('进程上限+' + m.statsPerPoint.process_max);
            var pts = p.masteryPoints[r] || 0;
            raceTips[r] = '<b style=\'font-size:14px;color:' + rc3.txt + ';\'>' + m.name + '：</b>&#10;<span style=\'font-size:14px;\'>每级：' + parts.join('、') + '</span>&#10;<b>特质：</b>' + (m.traits ? m.traits.join(' · ') : '') + (pts > 0 ? '&#10;<b>已投入：</b>' + pts + ' 点' : '');
        });
        var slotCount = (gs.mapState.loop >= 2) ? 3 : 2;
        var slotIndices = []; for(var i=0; i<slotCount; i++) slotIndices.push(i);

        masteryHTML += '<div style="display:flex;flex-direction:column;gap:10px;">';
        slotIndices.forEach(function(si) {
            masteryHTML += '<div class="txt-xs txt-dim" style="display:flex;align-items:center;gap:10px;padding:8px;background:rgba(255,255,255,0.02);border-radius:4px;">流派' + (si+1) + ': ';
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
                        masteryHTML += '<span style="display:inline-block;min-width:90px;text-align:center;padding:6px 10px;font-size:13px;background:' + srr.bg + ';border:1px solid ' + srr.bd + ';border-radius:4px;cursor:pointer;color:' + srr.txt + ';margin-left:4px;" onclick="GameState.learnMastery(\'' + r + '\',' + si + ');UISystem.render();UISystem.showStatusModal();">' + raceNames[r] + '</span>';
                    } else {
                        masteryHTML += '<span style="display:inline-block;min-width:90px;text-align:center;padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--text-disabled);margin-left:4px;">' + raceNames[r] + '</span>';
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
        masteryHTML += '</div></div>'; // 关闭 fold-content 和外层容器
        body.innerHTML += masteryHTML;
        box.appendChild(body);
    }

    function _claimReward(taskId, reward, rewardDesc, components) {
        var gs = GS(); if (!gs) return;
        var p = gs.player;
        if (!p.claimedTaskRewards) p.claimedTaskRewards = [];
        if (p.claimedTaskRewards.indexOf(taskId) !== -1) return;
        p.claimedTaskRewards.push(taskId);

        p.bp += (reward || 0);
        if (components) {
            Object.keys(components).forEach(function(cid) {
                gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + components[cid];
            });
        }
        window.GameState.save();
        _pushLog('指令完成：' + rewardDesc);
        UISystem.showNotification(rewardDesc || '奖励已领取', null, 'var(--accent-yellow)');
        UISystem.render();
    }

    function _claimAllTasks() {
        var gs = GS(); if (!gs) return;
        var stages = _getTaskStages(gs);
        var p = gs.player;
        var compCount = 0;

        stages.forEach(function(tier) {
            tier.forEach(function(t) {
                if (t.c() && (!p.claimedTaskRewards || p.claimedTaskRewards.indexOf(t.id) === -1)) {
                    if (!p.claimedTaskRewards) p.claimedTaskRewards = [];
                    p.claimedTaskRewards.push(t.id);
                    p.bp += (t.reward || 0);
                    if (t.comps) {
                        Object.keys(t.comps).forEach(function(cid) {
                            gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + t.comps[cid];
                        });
                    }
                    _pushLog('批量同步：' + t.rewardDesc);
                    compCount++;
                }
            });
        });

        if (compCount > 0) {
            window.GameState.save();
            UISystem.showNotification('批量同步完成', '已领取 ' + compCount + ' 项指令奖励', 'var(--accent-green)');
            UISystem.render();
        }
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

            // [新增] 任务面板头部：一键领取
            var hasAnythingToClaim = showing.some(function(s){ return s.justDone && !s.claimed; });
            if (hasAnythingToClaim) {
                h += '<div style="margin-bottom:12px;text-align:right;"><button class="btn btn-green btn-sm" onclick="UISystem._claimAllTasks()" style="box-shadow:0 0 10px var(--accent-green);">一键领取全部奖励</button></div>';
            }

            showing.forEach(function(s) {
                var style = '';
                var tag = '';
                if (s.justDone && !s.claimed) {
                    var compArg = s.t.comps ? JSON.stringify(s.t.comps).replace(/"/g, '&quot;') : 'null';
                    tag = ' <button class="btn btn-green" style="padding:2px 10px;font-size:11px;height:22px;" onclick="UISystem._claimReward(\'' + s.t.id + '\',' + (s.t.reward||0) + ',\'' + (s.t.rewardDesc||'奖励') + '\',' + compArg + ')">领取奖励</button>';
                } else if (s.done && s.claimed) {
                    style = 'text-decoration:line-through;color:var(--text-disabled);';
                }
                h += '<div class="txt-xs" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;' + style + '"><span style="flex:1;margin-right:10px;"><span class="txt-green">></span> ' + s.t.t + '</span>' + tag + '</div>';
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
        var hasSynced = Object.keys(gs.inventory.organSyncLevels || {}).length > 0;
        var hasResearched = Object.keys(gs.bestiary.researchLevels || {}).length > 0;

        var _r = function(id, text, cond, reward, rewardDesc, comps) {
            return { id: id, t: text, c: cond, reward: reward || 0, rewardDesc: rewardDesc || '', comps: comps || null };
        };
        return [
            [_r('reach_lv3', '原体升至等阶 3', function () { return p.level >= 3; }, 20, '+20 基因点数'),
             _r('first_kill', '完成首次击杀', function () { return killCount >= 1; }, 15, '+15 基因点数'),
             _r('research_1', '完成首次基因研究', function () { return hasResearched; }, 50, '+50 基因点数')],

            [_r('find_relic', '发现基因遗物', function () { return (p.relicsFound || 0) > 0; }, 0, '+5 纳米破片', { '纳米破片': 5 }),
             _r('kill_elite', '击败精英变异体', function () { return hasEliteKill; }, 30, '+30 基因点数'),
             _r('reach_lv8', '原体升至等阶 8', function () { return p.level >= 8; }, 50, '+50 基因点数')],

            [_r('upgrade_organ', '进阶任意器官至阶 2', function () { return hasUpgraded; }, 0, '+3 几丁质装甲', { '几丁质装甲': 3 }),
             _r('organ_sync', '完成一次器官同调', function () { return hasSynced; }, 100, '+100 基因点数'),
             _r('enter_dungeon', '深入地下城', function () { return (p.dungeonsEntered || 0) > 0; }, 40, '+40 基因点数')],

            [_r('kill_boss', '挑战并击败区域领主', function () { return hasBossKill; }, 0, '+10 原始基因', { '原始基因': 10 }),
             _r('reach_10f', '抵达实验室地下十层', function () { return (gs.mapState.currentFloor || 1) >= 10; }, 200, '+200 基因点数'),
             _r('mastery_5', '单系专精达到 5 级', function () { return Object.values(p.masteryPoints).some(function(v){return v>=5;}); }, 150, '+150 基因点数')],

            [_r('reach_lv15', '原体升至巅峰等阶 15', function() { return p.level >= 15; }, 0, '+8 导电凝胶', { '导电凝胶': 8 }),
             _r('kill_50', '累计猎杀 50 只变异体', function() { return killCount >= 50; }, 300, '+300 基因点数'),
             _r('sync_lv3', '拥有一个 Lv.3 觉醒器官', function() { return Object.values(gs.inventory.organSyncLevels).some(function(v){return v>=3;}); }, 200, '+200 基因点数')],

            [_r('clear_loop1', '完成首次超越进化', function() { return (gs.mapState.loop || 1) >= 2; }, 500, '+500 基因点数'),
             _r('research_all_lv1', '看破 3 种怪物的意图', function() { return Object.values(gs.bestiary.researchLevels).filter(function(v){return v>=1;}).length >= 3; }, 0, '+10 变异组织', { '变异组织': 10 }),
             _r('stat_mutation', '完成一次高阶属性突变', function() { return (p.atk_base > 12 || p.def_base > 5 || p.hp_max > 100); }, 150, '+150 基因点数')]
        ];
    }

    function triggerShake(id) {
        var el = document.getElementById(id); if (!el) return;
        el.style.transform = 'translateX(10px)'; setTimeout(function(){ el.style.transform = 'translateX(-10px)'; }, 50); setTimeout(function(){ el.style.transform = 'translateX(5px)'; }, 100); setTimeout(function(){ el.style.transform = 'translateX(0)'; }, 150);
    }
    var _cardShaking = {};
    function shakeMonsterCard(idx) {
        var card = document.querySelector('.monster-card[data-monster-idx=\"' + idx + '\"]');
        if (!card || _cardShaking[idx]) return;
        _cardShaking[idx] = true;
        card.classList.add('card-shake');
        setTimeout(function() { card.classList.remove('card-shake'); _cardShaking[idx] = false; }, 360);
    }

    function showDamageFloat(val, color, targetId) {
        var el = _ce('div', 'damage-float'); el.style.cssText = 'position:fixed;font-weight:bold;font-size:28px;color:' + color + ';z-index:4000;pointer-events:none;transition:all 0.8s ease-out;text-shadow:0 0 8px rgba(0,0,0,0.8);'; el.innerHTML = val;
        var startX, startY;
        if (targetId === 'monster') {
            var bs = window.CombatSystem && window.CombatSystem.getBattleState ? window.CombatSystem.getBattleState() : null;
            var targetIdx = bs ? bs.currentTarget : 0;
            var card = document.querySelector('.monster-card[data-monster-idx="' + targetIdx + '"]');
            if (card) {
                var rect = card.getBoundingClientRect();
                startX = rect.left + rect.width / 2 - 30;
                startY = rect.top + 10;
            } else {
                startX = window.innerWidth / 2;
                startY = window.innerHeight / 2 - 50;
            }
        } else {
            startX = window.innerWidth / 2 - 80;
            startY = 100;
        }
        el.style.left = startX + 'px'; el.style.top = startY + 'px'; document.body.appendChild(el);
        requestAnimationFrame(function() { el.style.opacity = '0'; el.style.transform = 'translateY(-60px) scale(1.3)'; });
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
        var totalKills = Object.values(gs.bestiary.killCount || {}).reduce(function(a,b){return a+b;},0);
        var totalBp = p._totalBpEarned || (gs.mapState._totalBpEarned || 0);
        var organsHeld = (gs.inventory.organs || []).length;
        var stats = '<div style="display:flex;flex-direction:column;gap:6px;">' +
            '<span>原体等级 ' + p.level + '  |  总步数 ' + gs.mapState.stepsTaken + '</span>' +
            '<span>总击杀 ' + totalKills + '  |  总获得 BP ' + totalBp + '</span>' +
            '<span>遗物发现 ' + (p.relicsFound || 0) + '  |  地下城 ' + (p.dungeonsEntered || 0) + '  |  持有器官 ' + organsHeld + '</span>' +
            '<span>当前轮回 Loop ' + (gs.mapState.loop || 1) + '</span></div>';
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
                if (btn) {
                    btn.textContent = "超越进化 (进入 Loop " + ((gs.mapState.loop || 1) + 1) + ")";
                    btn.style.opacity = '1';
                    btn.onclick = function() {
                        ov.remove();
                        window.GameState.startNextLoop();
                        location.reload(); // 重新加载以初始化新地图
                    };
                }
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
            }, 55);
        };
        setTimeout(showNext, 500);
    }

    function _showIntro(gs) {
        _introActive = true;
        _hideBgVideo(_bgVideo);
        _hideBgVideo(_bgBattleVideo);
        // 显示标题视频第一帧作为背景
        _bgTitleVideo.currentTime = 0;
        _bgTitleVideo.style.display = 'block';
        _root.className = '';
        // 隐藏界面元素
        var hud = document.querySelector('.hud-top'); if (hud) hud.style.display = 'none';
        var actionBar = document.getElementById('ui-action-bar'); if (actionBar) actionBar.style.display = 'none';
        var taskPanel = document.getElementById('ui-task-panel'); if (taskPanel) taskPanel.style.display = 'none';
        var roomInfo = document.getElementById('ui-room-info'); if (roomInfo) roomInfo.style.display = 'none';
        var skillInfo = document.getElementById('ui-skill-info'); if (skillInfo) skillInfo.style.display = 'none';
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        _modalOverlay.style.background = 'transparent';
        // 开始按钮 — 点击后触发视频（绕过浏览器自动播放限制）
        var startBox = _ce('div');
        startBox.style.cssText = 'text-align:center;';
        startBox.innerHTML = '<div class="txt-lg txt-green txt-bold" style="margin-bottom:16px;font-size:28px;">黑地平线：原体觉醒</div>' +
            '<div class="txt-sm" style="color:var(--text-dim);margin-bottom:32px;line-height:1.8;max-width:500px;margin-left:auto;margin-right:auto;">' +
            '2099年，基因剥离计划「余烬」彻底失控。<br>' +
            '变异血肉、寄生毒素飞蛾、纳米真菌改写的安保机械——<br>' +
            '三股力量在深达数千米的地下实验室疯狂增殖。你是唯一的原体。</div>' +
            '<button class="btn btn-green" style="padding:10px 40px;font-size:15px;box-shadow:0 0 16px rgba(0,255,136,0.3);">开始游戏</button>';
        startBox.querySelector('button').onclick = function() {
            // 淡出按钮，立即开始加载日志
            startBox.style.transition = 'opacity 0.4s ease';
            startBox.style.opacity = '0';
            setTimeout(function() {
                _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'none';
                _renderIntroTexts();
            }, 400);
        };
        _modalOverlay.appendChild(startBox);
    }
    function _renderIntroTexts() {
        var logPanel = document.getElementById('ui-log'); if (!logPanel) return;
        logPanel.innerHTML = '';
        logPanel.style.cssText = logPanel.style.cssText.replace(/max-height[^;]+;?/g, '') + 'max-height:none;';
        var lines = [
            { text: '神经链路初始化...', clr: 'rgba(0,255,136,0.45)', delay: 200 },
            { text: '黑地平线超生物复合实验室 地下一层', clr: 'rgba(0,255,136,0.6)', delay: 600 },
            { text: '2099年，基因剥离计划「余烬」彻底失控。', clr: 'rgba(0,255,136,0.75)', delay: 400 },
            { text: '三股力量在深达数千米的地下疯狂增殖：变异血肉、寄生毒素飞蛾、纳米真菌改写的安保机械。', clr: 'rgba(0,255,136,0.75)', delay: 300 },
            { text: '你是唯一的——', clr: 'rgba(0,255,136,0.8)', delay: 200 },
            { text: '原体-II · 无限拟态白血球始祖', clr: 'var(--accent-green)', delay: 600 },
            { text: '链接已建立。苏醒吧。', clr: 'var(--accent-green)', delay: 500 }
        ];
        var idx = 0;
        var showNext = function() {
            if (idx >= lines.length) {
                // 空格键提示
                var tipDiv = document.createElement('div');
                tipDiv.className = 'txt-xs';
                tipDiv.style.cssText = 'margin-top:8px;color:var(--accent-green);animation:mastery-pulse 2s infinite;';
                tipDiv.textContent = '> 按空格键激活原体';
                logPanel.appendChild(tipDiv);
                // 空格触发视频
                var _spaceHandler = function(e) {
                    if (e.key !== ' ') return;
                    e.preventDefault();
                    document.removeEventListener('keydown', _spaceHandler);
                    // 启动标题视频
                    _bgTitleVideo.muted = window.Sound ? window.Sound.isMuted() : false;
                    _bgTitleVideo.currentTime = 0;
                    _bgTitleVideo._fadeTriggered = false;
                    _bgTitleVideo._introTriggered = true;
                    _bgTitleVideo._fadeOverlay.style.opacity = '0';
                    _bgTitleVideo.style.display = 'block';
                    _bgTitleVideo.play().catch(function(){});
                    // 视频结束后淡入主界面
                    _bgTitleVideo.addEventListener('ended', function _onEnd() {
                        _bgTitleVideo.removeEventListener('ended', _onEnd);
                        var gs = GS(); if (gs) { gs.player.introSeen = true; GameState.save(); }
                        _bgTitleVideo.style.display = 'none';
                        _bgTitleVideo._fadeOverlay.style.opacity = '0';
                        _bgTitleVideo.pause();
                        _showBgVideo(_bgVideo);
                        _root.className = '';
                        _wakingUp = true;
                        _introActive = false;
                        var hud3 = document.querySelector('.hud-top'); if (hud3) hud3.style.display = '';
                        var ab3 = document.getElementById('ui-action-bar'); if (ab3) ab3.style.display = '';
                        var tp3 = document.getElementById('ui-task-panel'); if (tp3) tp3.style.display = '';
                        var ri3 = document.getElementById('ui-room-info'); if (ri3) ri3.style.display = '';
                        logPanel.style.cssText = logPanel.style.cssText.replace('max-height:none', '');
                        UISystem.render();
                    });
                };
                document.addEventListener('keydown', _spaceHandler);
                return;
            }
            var li = lines[idx];
            var div = document.createElement('div');
            div.className = 'txt-xs txt-dim';
            div.style.cssText = 'margin-bottom:4px;color:' + (li.clr || '');
            div.innerHTML = '<span>></span> <span class="typewriter"></span>';
            logPanel.appendChild(div);
            _typeText(div.querySelector('.typewriter'), li.text, function() {
                idx++;
                setTimeout(showNext, li.delay);
            }, 55);
        };
        setTimeout(showNext, 500);
    }
    function closeIntro() {
        _introActive = false;
        var gs = GS(); if (gs) { gs.player.introSeen = true; GameState.save(); }
        _modalOverlay.style.display = 'none';
        _modalOverlay.style.background = '';
        _wakingUp = true;
        _bgTitleVideo.style.display = 'none';
        _bgTitleVideo._fadeOverlay.style.opacity = '0';
        _bgTitleVideo.pause();
        _showBgVideo(_bgVideo);
        _root.className = '';
        // 恢复界面元素
        var hud2 = document.querySelector('.hud-top'); if (hud2) hud2.style.display = '';
        var actionBar2 = document.getElementById('ui-action-bar'); if (actionBar2) actionBar2.style.display = '';
        var taskPanel2 = document.getElementById('ui-task-panel'); if (taskPanel2) taskPanel2.style.display = '';
        var roomInfo2 = document.getElementById('ui-room-info'); if (roomInfo2) roomInfo2.style.display = '';
        // [修复] 不再手动设置 _isFirstLoad = false，让 render() 统一处理启动序列
        UISystem.render();
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

    function toggleSound() {
        var muted = window.Sound && window.Sound.toggleMute();
        var btn = document.getElementById('btn-sound');
        if (btn) {
            btn.innerHTML = muted ? 'M' : '♪';
            btn.className = muted ? 'btn btn-gray btn-sm' : 'btn btn-blue btn-sm';
        }
        _bgVideos.forEach(function(v) {
            if (v && v.style.display !== 'none') {
                _showBgVideo(v);
            }
        });
    }
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
        box.style.cssText = 'width:min(500px,90vw);background:var(--bg-modal);border:1px solid #f57f17;border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:16px 24px;background:rgba(245,124,0,0.08);border-bottom:1px solid #f57f17;display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-gold txt-bold">[ 组件合成 ]</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:50vh;';
        body.innerHTML = '';
        var selected = {};
        var selectCount = 0;
        var keys = []; Object.keys(inv).forEach(function(k) { if (inv[k] > 0) keys.push(k); });
        var updatePreview = function() {
            var selKeys = Object.keys(selected);
            var selNames = []; selKeys.forEach(function(sk) { for (var si = 0; si < selected[sk]; si++) selNames.push(sk); });
            var allSame = selKeys.length === 1 && selectCount === 3;
            // 更新状态行
            statusLine.innerHTML = '<span class="txt-xs txt-dim">已选 </span><span style="color:var(--accent-yellow)">' + selectCount + ' / 3</span>' +
                (selectCount > 0 ? ' <span class="txt-xs txt-dim">— ' + selNames.map(function(n){return _fmtRoman(n);}).join(' + ') + '</span>' : '');
            if (selectCount === 3 && allSame) {
                var selectedId = selKeys[0];
                var c = GD().COMPONENTS && GD().COMPONENTS[selectedId];
                var affixes = c && c.affixes ? c.affixes : {};

                // [修复] 严格根据当前选择材料的层级决定下一级
                var tiers = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'];
                var currentTier = 0;
                var baseName = selectedId;
                for (var t = 1; t < tiers.length; t++) {
                    if (selectedId.endsWith(tiers[t])) {
                        currentTier = t;
                        baseName = selectedId.substring(0, selectedId.length - tiers[t].length);
                        break;
                    }
                }

                if (currentTier >= 3) {
                    preview.innerHTML = '<div class="txt-xs txt-red">已达最高级 ⭐⭐⭐，无法继续合成</div>';
                    return;
                }

                var nextName = baseName + tiers[currentTier + 1];
                // 构建升级后的属性（数值×2，bool不变）
                var upgradedAffixes = {};
                Object.keys(affixes).forEach(function(ak) {
                    var v = affixes[ak];
                    if (typeof v === 'boolean') upgradedAffixes[ak] = v;
                    else upgradedAffixes[ak] = v * 2;
                });
                var nextText = _fmtAffixText(upgradedAffixes);
                preview.innerHTML = '<div class="txt-xs txt-gold">→ <b>' + nextName + '</b></div><div class="txt-xs txt-dim">' + (nextText || '无属性') + '</div>';
            } else if (selectCount === 3) {
                preview.innerHTML = '<div class="txt-xs txt-gold">→ 随机新组件</div>';
            } else {
                preview.innerHTML = selectCount > 0 ? '<span class="txt-xs txt-dim">继续选择组件...</span>' : '';
            }
        };
        var compRow = _ce('div');
        compRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        keys.forEach(function(k) {
            var count = inv[k]; if (count <= 0) return;
            var chip = _ce('div');
            chip.style.cssText = 'padding:6px 12px;background:rgba(255,213,79,0.08);border:1px solid rgba(255,213,79,0.2);border-radius:4px;cursor:pointer;font-size:13px;color:var(--accent-yellow);';
            var renderChip = function() {
              chip.innerHTML = '<span>' + _fmtRoman(k) + '</span> <span class=\"txt-xs txt-dim\">×' + count + '</span>' + (selected[k] ? ' <span class=\"txt-xs txt-gold\">已选' + selected[k] + '</span>' : '') + (count >= 3 && selectCount === 0 ? ' <span class=\"txt-xs\" style=\"color:var(--accent-yellow);opacity:0.5;\">右键一键三连</span>' : '');
            };
            renderChip();
            chip.onclick = function() {
                if (selectCount >= 3 && !selected[k]) return;
                var cur = selected[k] || 0;
                if (cur < count && selectCount < 3) { selected[k] = cur + 1; selectCount++; }
                else { selectCount -= cur; delete selected[k]; }
                chip.style.background = selected[k] ? 'rgba(255,213,79,0.15)' : 'var(--bg-card)';
                chip.style.borderColor = selected[k] ? '#f57f17' : 'var(--border-dim)';
                renderChip();
                updatePreview();
            };
            chip.oncontextmenu = function(e) {
                e.preventDefault();
                if (selectCount > 0 || count < 3) return;
                selected[k] = 3; selectCount = 3;
                chip.style.background = 'rgba(255,213,79,0.15)';
                chip.style.borderColor = '#f57f17';
                renderChip();
                updatePreview();
            };
            compRow.appendChild(chip);
        });
        body.appendChild(compRow);
        var statusLine = _ce('div');
        statusLine.className = 'txt-sm txt-bold';
        statusLine.style.cssText = 'text-align:left;';
        statusLine.innerHTML = '<span class="txt-xs txt-dim">已选 </span><span style="color:var(--accent-yellow)">0 / 3</span>';
        body.appendChild(statusLine);
        var preview = _ce('div');
        preview.style.cssText = 'text-align:left;padding:8px 0;min-height:24px;';
        preview.innerHTML = '';
        body.appendChild(preview);
        var btnRow = _ce('div');
        btnRow.style.cssText = 'padding:12px 20px;display:flex;gap:10px;justify-content:flex-end;';
        var confirmBtn = _ce('button', 'btn btn-gold');
        confirmBtn.textContent = '确认合成';
        confirmBtn.onclick = function() {
            if (selectCount !== 3) return;
            var selKeys = Object.keys(selected);
            var allSame = selKeys.length === 1;
            var consumed = [];
            selKeys.forEach(function(k) { for (var si = 0; si < selected[k]; si++) { inv[k]--; consumed.push(k); } });
            var comps = GD().COMPONENTS || {};
            if (allSame) {
                var selectedId = selKeys[0];
                var tiers = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'];
                var currentTier = 0;
                var baseName = selectedId;
                for (var t = 1; t < tiers.length; t++) {
                    if (selectedId.endsWith(tiers[t])) {
                        currentTier = t;
                        baseName = selectedId.substring(0, selectedId.length - tiers[t].length);
                        break;
                    }
                }

                var upgradedName = baseName + tiers[currentTier + 1];
                if (!comps[upgradedName]) {
                    var orig = comps[selectedId];
                    // 属性倍率基于被消耗的组件进行翻倍
                    comps[upgradedName] = { id: upgradedName, allowedSlots: (orig||{}).allowedSlots||[], affixes: {} };
                    if (orig && orig.affixes) {
                        Object.keys(orig.affixes).forEach(function(ak) {
                            var v = orig.affixes[ak];
                            // 布尔值不翻倍，暴伤加0.5，其余数值翻倍
                            if (typeof v === 'boolean') { comps[upgradedName].affixes[ak] = v; }
                            else if (ak === 'critMultiplier') { comps[upgradedName].affixes[ak] = v + 0.5; }
                            else { comps[upgradedName].affixes[ak] = v * 2; }
                        });
                    }
                }
                inv[upgradedName] = (inv[upgradedName] || 0) + 1;
            } else {
                var allNames = Object.keys(comps);
                var result = allNames[Math.floor(Math.random() * allNames.length)];
                inv[result] = (inv[result] || 0) + 1;
            }
            window.GameState.save();
            UISystem.showNotification('合成完成！', consumed.join(' + ') + ' → ' + (allSame ? _fmtRoman(upgradedName) : '新组件'), 'var(--accent-yellow)');
            UISystem._showSynthesizeModal();
        };
        btnRow.appendChild(confirmBtn);
        box.appendChild(body);
        box.appendChild(btnRow);
        _modalOverlay.appendChild(box);
    }

    function _showSocketPicker(slot, socketIndex) {
        var gs = GS(); if (!gs) return;
        _modalOverlay._returnToLab = true;
        var inv = gs.inventory.components;
        var comps = GD().COMPONENTS || {};
        var curCid = gs.player[slot].component_slots[socketIndex];
        var curComp = curCid ? (comps[curCid] || {}) : null;

        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = '';
        _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(500px,90vw);background:var(--bg-modal);border:1px solid var(--accent-green);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:14px 20px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        var slotNames = _ORGAN_NAMES;
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ 选择组件 ]</div><div class="txt-xs txt-dim">' + (slotNames[slot] || slot) + ' 槽' + (socketIndex+1) + '</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:12px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:50vh;';
        var hasAny = false;
        Object.keys(inv).forEach(function(ck) {
            // 动态构建 I/II/III 级组件数据（合成产物不在静态DB中）
            var sc = comps[ck] || _buildCompDetail(ck);
            var scAffixes = (sc && sc.affixes) ? sc.affixes : (comps[ck] ? comps[ck].affixes : {});
            if (inv[ck] <= 0 || !sc || !sc.allowedSlots || sc.allowedSlots.indexOf(slot) === -1) return;
            hasAny = true;
            var sa = scAffixes;
            var ca = (curComp && curComp.affixes) ? curComp.affixes : {};

            var diffParts = [];
            _AFFIX_FIELDS.forEach(function(f) {
                if (f.bool) {
                    var nv = !!sa[f.k], ov = !!ca[f.k];
                    if (!nv && !ov) return;
                    var color = nv ? 'var(--accent-green)' : 'var(--text-dim)';
                    diffParts.push('<span style="color:' + color + ';">' + f.l + (nv ? ' ✓' : '') + '</span>');
                    return;
                }
                var nv = sa[f.k] || 0, ov = ca[f.k] || 0;
                if (nv === 0 && ov === 0) return;
                var diff = nv - ov;
                var color = diff > 0 ? 'var(--accent-green)' : (diff < 0 ? 'var(--accent-red)' : 'var(--text-dim)');
                var sign = diff > 0 ? '+' : '';
                var valStr = f.pct ? Math.round(nv*100)+'%' : (f.mul ? '×'+nv.toFixed(1) : nv);
                var diffStr = f.pct ? Math.round(diff*100)+'%' : (f.mul ? diff.toFixed(1) : diff);
                diffParts.push('<span>' + f.l + ': ' + valStr + ' <span style="color:' + color + '; font-size:11px;">(' + sign + diffStr + ')</span></span>');
            });

            var row = _ce('div');
            row.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:10px 14px;background:rgba(255,213,79,0.06);border:1px solid rgba(255,213,79,0.2);border-radius:4px;cursor:pointer;';
            row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<div><span class="txt-xs txt-gold txt-bold">' + _fmtRoman(ck) + '</span><span class="txt-xs txt-gold"> ×' + inv[ck] + '</span></div>' +
                '</div><div class="txt-xs txt-dim" style="display:flex;flex-wrap:wrap;gap:8px;">' + (diffParts.length > 0 ? diffParts.join('') : '无属性') + '</div>';
            row.onclick = function() { try { window.GameState.socketComponent(slot, socketIndex, ck); } catch(e) {} UISystem.showReorganizeModal(); UISystem.render(); };
            body.appendChild(row);
        });
        if (!hasAny) body.innerHTML = '<div class="txt-xs txt-dim txt-center">没有可装备的组件</div>';
        box.appendChild(body);
        _modalOverlay.appendChild(box);
    }

    function _showOrganUpgradePicker(slot) {
        var gs = GS(); if (!gs || !gs.player[slot]) return;
        var d = gs.player[slot];
        var cost = Math.ceil(5 * Math.pow(1.6, d.tier));
        var inv = gs.inventory.components;
        var getWeight = function(cid) { if (cid.endsWith('Ⅲ')) return 4; if (cid.endsWith('Ⅱ')) return 3; if (cid.endsWith('Ⅰ')) return 2; return 1; };
        // 收集可选组件及其库存
        var items = []; Object.keys(inv).forEach(function(k) { if (inv[k] > 0) items.push({ id: k, count: inv[k], weight: getWeight(k) }); });
        items.sort(function(a,b){ return b.weight - a.weight; });
        // 总计
        var totalWeight = items.reduce(function(a,i){ return a + i.weight * i.count; }, 0);
        if (totalWeight < cost) { UISystem.showNotification('材料不足', '加权合计 ' + totalWeight + '，需要 ' + cost, 'var(--accent-red)'); return; }

        _modalOverlay._returnToLab = true;
        document.querySelectorAll('.help-popup').forEach(function(el){ el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(500px,90vw);background:var(--bg-modal);border:1px solid var(--accent-green);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:14px 20px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        var slotNames = { predatory_organ: '捕食器官', chitin_epidermis: '几丁表皮', gland_core: '腺体核心' };
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ ' + (slotNames[slot]||slot) + ' 进阶 ]</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:45vh;';
        body.innerHTML = '<div class="txt-xs txt-dim">点击选择要消耗的碎片（高阶加权更高）</div>';

        var selected = {}; var curWeight = 0;
        var statusLine = _ce('div');
        statusLine.className = 'txt-sm txt-bold';
        var updateStatus = function() {
            statusLine.innerHTML = '已选加权: <span style="color:' + (curWeight >= cost ? 'var(--accent-green)' : 'var(--accent-red)') + '">' + curWeight + ' / ' + cost + '</span>';
        };
        updateStatus();

        var chipRow = _ce('div');
        chipRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        items.forEach(function(item) {
            var chip = _ce('div');
            chip.style.cssText = 'padding:6px 12px;background:rgba(255,213,79,0.08);border:1px solid rgba(255,213,79,0.2);border-radius:4px;cursor:pointer;font-size:13px;color:var(--accent-yellow);';
            chip.textContent = _fmtRoman(item.id) + ' ×' + item.count + ' [' + item.weight + ']';
            chip.onclick = function() {
                var cur = selected[item.id] || 0;
                if (cur < item.count) { selected[item.id] = cur + 1; curWeight += item.weight; }
                else { selected[item.id] = 0; curWeight -= item.weight * cur; }
                chip.style.background = selected[item.id] ? 'rgba(255,213,79,0.2)' : 'rgba(255,213,79,0.08)';
                chip.style.borderColor = selected[item.id] ? 'var(--accent-yellow)' : 'rgba(255,213,79,0.2)';
                updateStatus();
            };
            chipRow.appendChild(chip);
        });
        body.appendChild(chipRow);
        body.appendChild(statusLine);
        box.appendChild(body);

        var btnRow = _ce('div');
        btnRow.style.cssText = 'padding:12px 20px;display:flex;gap:10px;justify-content:flex-end;';
        var confirmBtn = _ce('button', 'btn btn-green');
        confirmBtn.textContent = '确认进阶';
        confirmBtn.onclick = function() {
            if (curWeight < cost) { UISystem.showNotification('材料不足', '还需 ' + (cost - curWeight) + ' 加权', 'var(--accent-red)'); return; }
            var consumed = []; Object.keys(selected).forEach(function(k) { for (var i = 0; i < selected[k]; i++) consumed.push(k); });
            GameState.upgradeOrganTierWithSelection(slot, consumed);
            UISystem.closeModal();
            UISystem.showReorganizeModal();
        };
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        _modalOverlay.appendChild(box);
    }

    // 通用组件选择弹窗（魔药炼制/涂层涂抹共用）
    var _showComponentSelectModal = function(title, count, onConfirm, costMap) {
        var gs = GS(); if (!gs) return;
        var inv = gs.inventory.components;
        // costMap: 限定可选材料，如{'变异组织':2} 只显示变异组织
        document.querySelectorAll('.help-popup').forEach(function(el){ el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        _modalOverlay._returnToLab = true;
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(500px,90vw);background:var(--bg-modal);border:1px solid var(--accent-purple);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:14px 20px;background:rgba(156,39,176,0.05);border-bottom:1px solid var(--accent-purple);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-purple txt-bold">[ ' + title + ' ] 选择 ' + count + ' 个碎片</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div');
        body.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:45vh;';
        body.innerHTML = '<div class="txt-xs txt-dim">点击选择消耗的材料（可保留高阶碎片）</div>';

        var selected = {}; var selCount = 0;
        var statusLine = _ce('div');
        statusLine.className = 'txt-sm txt-bold';
        var updateStatus = function() {
            statusLine.innerHTML = '已选: <span style="color:' + (selCount === count ? 'var(--accent-green)' : 'var(--accent-purple)') + '">' + selCount + ' / ' + count + '</span>';
        };
        updateStatus();

        var chipRow = _ce('div');
        chipRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        var items = []; Object.keys(inv).forEach(function(k) { if (inv[k] > 0 && (!costMap || costMap[k])) items.push({ id: k, count: inv[k] }); });
        items.sort(function(a,b){ return a.id.localeCompare(b.id); });
        items.forEach(function(item) {
            var chip = _ce('div');
            chip.style.cssText = 'padding:6px 12px;background:rgba(255,213,79,0.08);border:1px solid rgba(255,213,79,0.2);border-radius:4px;cursor:pointer;font-size:13px;color:var(--accent-yellow);';
            chip.textContent = _fmtRoman(item.id) + ' ×' + item.count;
            chip.onclick = function() {
                var cur = selected[item.id] || 0;
                if (cur < item.count && selCount < count) { selected[item.id] = cur + 1; selCount++; }
                else if (cur > 0) { selected[item.id] = cur - 1; selCount--; if (selected[item.id] === 0) delete selected[item.id]; }
                chip.style.background = selected[item.id] ? 'rgba(255,213,79,0.2)' : 'rgba(255,213,79,0.08)';
                chip.style.borderColor = selected[item.id] ? 'var(--accent-purple)' : 'var(--border-dim)';
                updateStatus();
            };
            chipRow.appendChild(chip);
        });
        body.appendChild(chipRow);
        body.appendChild(statusLine);
        box.appendChild(body);

        var btnRow = _ce('div');
        btnRow.style.cssText = 'padding:12px 20px;display:flex;gap:10px;justify-content:flex-end;';
        var confirmBtn = _ce('button', 'btn btn-purple');
        confirmBtn.textContent = '确认';
        confirmBtn.onclick = function() {
            if (selCount < count) { UISystem.showNotification('还需选择 ' + (count - selCount) + ' 个', null, 'var(--accent-red)'); return; }
            var consumed = []; Object.keys(selected).forEach(function(k) { for (var i = 0; i < selected[k]; i++) consumed.push(k); });
            UISystem.closeModal();
            onConfirm(consumed);
        };
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        _modalOverlay.appendChild(box);
    };

    function _showOrganPicker(slot) {
        var gs = GS(); if (!gs) return;
        _modalOverlay._returnToLab = true;
        var organs = gs.inventory.organs || [];
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(450px,90vw);background:var(--bg-modal);border:1px solid var(--accent-green);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:14px 20px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ 器官挂载 ]</div><button class="btn btn-blue btn-sm" onclick="UISystem.closeModal();UISystem.showReorganizeModal();">取消</button>';
        box.appendChild(head);
        var body = _ce('div'); body.style.cssText = 'padding:12px 20px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;max-height:50vh;';
        if (organs.length === 0) {
            body.innerHTML = '<div class="txt-xs txt-dim txt-center">暂无可用器官</div>';
        } else {
            var bos = GD().BOSS_ORGANS || {};
            var oClrs = _BOSS_ORGAN_COLORS;
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

    // --- 组件详情通用模板 ---
    var _AFFIX_FIELDS = [
        { k: 'atkBonus', l: '攻击' }, { k: 'defBonus', l: '防御' }, { k: 'flatDefBonus', l: '防御' },
        { k: 'shieldBonus', l: '生命' },
        { k: 'physMultiplier', l: '物理', mul: true }, { k: 'armorPenetration', l: '破甲', pct: true },
        { k: 'toxinConversion', l: '毒转', pct: true }, { k: 'dotBonus', l: '毒伤' },
        { k: 'lifeDrainChance', l: '吸血率', pct: true }, { k: 'thornsPercent', l: '反伤', pct: true },
        { k: 'killHeal', l: '击杀恢复' }, { k: 'deathDefy', l: '免死', bool: true },
        { k: 'processOnHit', l: '受击回能' }, { k: 'critChance', l: '暴击率', pct: true },
        { k: 'critMultiplier', l: '暴伤', mul: true },
        { k: 'poisonImmune', l: '免疫中毒', bool: true }, { k: 'bonusVsSwarm', l: '对寄生', pct: true }
    ];
    // 格式化为纯文本列表（组件库存/档案用）
    var _fmtAffixText = function(affixes) {
        var parts = [];
        _AFFIX_FIELDS.forEach(function(f) {
            var v = affixes[f.k]; if (v === undefined || v === null || v === 0 || v === false) return;
            if (f.bool) { parts.push(f.l); return; }
            if (f.pct) { parts.push(f.l + ' ' + Math.round(v*100) + '%'); return; }
            if (f.mul) { parts.push(f.l + ' ×' + v.toFixed(1)); return; }
            parts.push(f.l + ' +' + v);
        });
        return parts.join(' · ');
    };
    // 结构化返回所有组件信息
    var _buildCompDetail = function(cid) {
        var comps = GD().COMPONENTS || {};
        var baseName = cid.replace(/[ⅠⅡⅢ]$/, '');
        var comp = comps[cid];
        // Ⅰ/Ⅱ/Ⅲ 动态生成，DB中不存在则回退基础版并推算升级属性
        if (!comp && baseName !== cid) {
            var baseComp = comps[baseName];
            comp = {};
            if (baseComp) {
                comp.allowedSlots = baseComp.allowedSlots;
                if (baseComp.affixes) {
                    comp.affixes = {};
                    Object.keys(baseComp.affixes).forEach(function(ak) {
                        var v = baseComp.affixes[ak];
                        if (typeof v === 'boolean') comp.affixes[ak] = v;
                        else comp.affixes[ak] = v * 2;
                    });
                }
            }
        }
        if (!comp) comp = {};
        var affixes = comp.affixes || {};
        var detail = { cid: cid, affixes: affixes, allowedSlots: comp.allowedSlots || [] };

        // 属性文本
        detail.affixText = _fmtAffixText(affixes);

        // 可装备槽
        var sn = { predatory_organ: '捕食器官', chitin_epidermis: '生物表皮', gland_core: '腺体核心' };
        detail.slotText = (comp.allowedSlots || []).map(function(s){ return sn[s]||s; }).join('、');

        // 涂层用途
        var coats = []; var coatings = GD().COATINGS || {};
        Object.keys(coatings).forEach(function(cid2) {
            var cost = coatings[cid2].cost;
            if (cost && (cost[cid] || cost[baseName])) coats.push(coatings[cid2].name);
        });
        detail.coatingText = coats.join('、');

        // 掉落来源
        var drops = []; var rm = { mutant: '#ff6b4a', swarm: '#9acd32', ember: '#4ab8ff' };
        Object.keys(GD().MONSTERS||{}).forEach(function(mid) {
            var mm = GD().MONSTERS[mid];
            if (mm.drop && (mm.drop.id === cid || mm.drop.id === baseName))
                drops.push('<span style=color:' + (rm[mm.race]||'#c8e6c9') + '>' + mm.name + '</span>');
        });
        detail.dropsHTML = drops.join('、');
        detail.sourceNote = (drops.length === 0 && baseName === '原始基因') ? '击败区域领主（任务奖励）' : '';

        return detail;
    };

    // 罗马数字强制无衬线显示
    var _fmtRoman = function(str) {
        var m = str.match(/([ⅠⅡⅢ]+)$/);
        var n = m ? ({ 'Ⅰ':1,'Ⅱ':2,'Ⅲ':3 })[m[1]] || m[1].length : 0;
        var stars = ''; for (var i=0;i<n;i++) stars += '⭐';
        return (stars ? stars : '') + str.replace(/[ⅠⅡⅢ]+$/g, '');
    };

    // --- Boss器官颜色/职业映射 ---
    var _BOSS_ORGAN_COLORS = {
        '暴君核心': { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.1)', bd: 'rgba(255,107,74,0.2)', btnCls: 'btn-red' },
        '蜂后髓核': { hex: '#9acd32', bg: 'rgba(154,205,50,0.1)', bd: 'rgba(154,205,50,0.2)', btnCls: 'btn-green' },
        '高能电泳核': { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.1)', bd: 'rgba(74,184,255,0.2)', btnCls: 'btn-blue' },
        _default: { hex: 'var(--accent-green)', bg: 'rgba(0,255,136,0.08)', bd: 'rgba(0,255,136,0.2)', btnCls: 'btn-green' }
    };
    var _getOrganColor = function(oid) { return _BOSS_ORGAN_COLORS[oid] || _BOSS_ORGAN_COLORS._default; };

    // --- 怪物意图颜色映射 ---
    var _INTENT_COLORS = {
        physical: 'var(--accent-red)', shield: 'var(--accent-blue)', toxin: 'var(--accent-purple)',
        electric: 'var(--accent-blue)', drain: 'var(--accent-purple)', summon: 'var(--accent-yellow)',
        scan: 'var(--accent-blue)', charge: 'var(--accent-orange)', stun: 'var(--accent-purple)',
        enrage: 'var(--accent-red)', spawn: 'var(--accent-purple)'
    };

    // --- 默认器官技能定义 ---
    var _DEFAULT_SKILLS = [
        { s: 'predatory_organ', l: '捕食打击', c: 2, cls: 'btn-red', k: '1', i: 'icon-atk' },
        { s: 'chitin_epidermis', l: '生物防御', c: 3, cls: 'btn-green', k: '2', i: 'icon-def' },
        { s: 'gland_core',       l: '腺体脉冲', c: 3, cls: 'btn-gold', k: '3', i: 'icon-gland' }
    ];
    var _getSkillDef = function(slot, equipped) {
        var sd = _DEFAULT_SKILLS.find(function(d){ return d.s === slot; });
        var bo = equipped ? (GD().BOSS_ORGANS||{})[equipped] : null;
        return {
            slot: slot, label: bo ? bo.skillName : (sd ? sd.l : ''),
            cost: bo ? bo.skillCost : (sd ? sd.c : 0),
            cls: bo ? _getOrganColor(equipped).btnCls : (sd ? sd.cls : ''),
            key: sd ? sd.k : '', icon: sd ? sd.i : ''
        };
    };

    // 构建技能详情tooltip
    var _buildSkillTooltip = function(slot, equipped, gs) {
        var sd = _getSkillDef(slot, equipped);
        var bo = equipped ? (GD().BOSS_ORGANS||{})[equipped] : null;
        var tip = '<b>' + sd.label + '</b>';
        tip += '&#10;消耗 ' + sd.cost + ' 进程';
        if (bo && bo.skillEffect) {
            var se = bo.skillEffect;
            if (se.baseMultiplier) tip += '&#10;伤害 ×' + se.baseMultiplier;
            if (se.armorPenetration) tip += '&#10;破甲 ' + Math.round(se.armorPenetration*100) + '%';
            if (se.chainTargets) tip += '&#10;链式溅射 ' + se.chainTargets + ' 目标';
            if (se.summonCount) tip += '&#10;召唤 ' + se.summonCount + ' 只寄生幼虫';
        } else if (slot === 'predatory_organ') {
            tip += '&#10;造成物理伤害，对异变者种族伤害 +50%';
        } else if (slot === 'chitin_epidermis') {
            tip += '&#10;获得护盾 = 防御 ×1.5，对寄生群落硬化护甲';
        } else if (slot === 'gland_core') {
            tip += '&#10;爆破中毒目标：引爆毒素造成连锁伤害并吸血';
        }
        return tip;
    };

    // --- 种族/专精通用的颜色和名称映射 ---
    var _RACE_COLORS = {
        mutant: { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.08)', bd: 'rgba(255,107,74,0.2)' },
        swarm:  { hex: '#9acd32', bg: 'rgba(154,205,50,0.08)', bd: 'rgba(154,205,50,0.2)' },
        ember:  { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.08)', bd: 'rgba(74,184,255,0.2)' }
    };
    var _RACE_NAMES = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
    var _RACE_ICONS = { mutant: 'icon-mutant', swarm: 'icon-swarm', ember: 'icon-ember' };
    var _ORGAN_NAMES = { predatory_organ: '捕食器官', chitin_epidermis: '生物表皮', gland_core: '腺体核心' };

    // 构建专精详情
    var _buildMasteryDetail = function(race) {
        var md = (GD().MASTERIES || {})[race];
        if (!md) return null;
        var rc = _RACE_COLORS[race] || _RACE_COLORS.mutant;
        var parts = [];
        if (md.statsPerPoint) {
            if (md.statsPerPoint.hp_max) parts.push('生命+' + md.statsPerPoint.hp_max);
            if (md.statsPerPoint.atk) parts.push('攻击+' + md.statsPerPoint.atk);
            if (md.statsPerPoint.def) parts.push('防御+' + md.statsPerPoint.def);
            if (md.statsPerPoint.process_max) parts.push('进程上限+' + md.statsPerPoint.process_max);
        }
        return {
            race: race, name: md.name, color: rc.hex, bg: rc.bg, bd: rc.bd,
            statText: parts.join(' · '),
            traits: (md.traits || []).join('、'),
            tooltip: "<b style='color:" + rc.hex + "'>" + md.name + "</b>&#10;" + parts.join(' · ') + "&#10;特性：" + (md.traits || []).join('、')
        };
    };

    // 构建双流派详情
    var _buildDualClassDetail = function(race1, race2) {
        if (!race1 || !race2) return null;
        var key = [race1, race2].sort().join('+');
        var dc = (GD().DUAL_CLASSES || {})[key];
        if (!dc) return null;
        return {
            key: key, name: dc.name, passive: dc.passive, passiveDesc: dc.passiveDesc,
            tooltip: '<b>' + dc.name + '：</b>&#10;<b>' + dc.passive + '</b>&#10;' + dc.passiveDesc
        };
    };

    // --- 魔药通用模板 ---
    var _buildPotionDetail = function(pid) {
        var potData = GD().POTIONS || {};
        var pt = potData[pid];
        if (!pt) return null;
        return {
            id: pid,
            name: pt.name,
            toxicity: pt.toxicity,
            effectDesc: pt.effect.desc || '',
            sideDesc: pt.sideEffect.desc || '',
            cost: pt.toxicity >= 35 ? 3 : 2,
            tooltip: "<b style='font-size:14px;color:var(--accent-purple);'>" + pt.name + "：</b>&#10;<span style='font-size:14px;'>" + (pt.effect.desc || '') + "</span>&#10;<b>副作用：</b>" + (pt.sideEffect.desc || '') + "&#10;毒性+" + pt.toxicity + " | 消耗组件 ×" + (pt.toxicity >= 35 ? 3 : 2)
        };
    };

    // 构建完整tooltip文本
    var _buildCompTooltip = function(cid) {
        var d = _buildCompDetail(cid);
        var tip = '<b>' + _fmtRoman(cid) + '</b>';
        if (d.affixText) tip += '&#10;' + d.affixText;
        if (d.slotText) tip += '&#10;<b>可装备：</b>' + d.slotText;
        if (d.coatingText) tip += '&#10;<b>可用于涂抹：</b>' + d.coatingText;
        tip += '&#10;<b>合成：</b>3个相同 → ⭐→⭐⭐→⭐⭐⭐ 逐级升级';
        if (d.dropsHTML) tip += '&#10;<b>掉落：</b>' + d.dropsHTML;
        else if (d.sourceNote) tip += '&#10;<b>来源：</b>' + d.sourceNote;
        return tip;
    };

    function showReorganizeModal() {
        var gs = GS(); var p = gs.player;
        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = ''; _modalOverlay.style.display = 'flex';
        var box = _ce('div', 'modal-box status-modal');
        box.style.cssText = 'flex:1;max-height:calc(100vh - 200px);background:var(--bg-modal);border:1px solid var(--accent-green);display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden;';
        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(0,255,136,0.05);border-bottom:1px solid var(--accent-green);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '<div class="txt-md txt-green txt-bold">[ 基因重组实验室 ]</div>' +
                         '<div style="display:flex;align-items:center;gap:10px;"><span class="txt-xs txt-gold" style="margin-right:20px;line-height:1;">基因点数: ' + p.bp + '</span>' +
                         '<button class="btn btn-red btn-sm" onclick="UISystem.closeModal();CombatSystem.startTraining();">训练场</button>' +
                         '<button class="btn btn-blue btn-sm" onclick="UISystem.closeModal()">关闭</button></div>';
        box.appendChild(head);
        // 左侧固定说明栏
        var infoBar = _ce('div');
        infoBar.style.cssText = 'flex:0 0 200px;padding:24px 16px;background:var(--bg-card);border:1px solid var(--border-dim);border-radius:6px;text-align:left;align-self:flex-start;';
        infoBar.innerHTML = '<div style="margin-bottom:10px;"><span class="txt-xs txt-green">进阶</span><div class="txt-xs txt-dim">消耗碎片提升器官阶位</div></div>' +
            '<div style="margin-bottom:10px;"><span class="txt-xs txt-green">挂载</span><div class="txt-xs txt-dim">更换器官，Boss器官提供专属技能</div></div>' +
            '<div style="margin-bottom:10px;"><span class="txt-xs txt-green">组件</span><div class="txt-xs txt-dim">空槽嵌入碎片，获得词条加成</div></div>' +
            '<div style="margin-bottom:10px;"><span class="txt-xs txt-purple">魔药</span><div class="txt-xs txt-dim">炼制战斗药剂，最多3瓶</div></div>' +
            '<div style="margin-bottom:10px;"><span class="txt-xs txt-gold">涂层</span><div class="txt-xs txt-dim">针对特定种族造成融毁伤害</div></div>' +
            '<div><span class="txt-xs txt-gold">基因点数</span><div class="txt-xs txt-dim">卸载组件10BP，击败怪物获得</div></div>';
        // 左右布局容器
        var wrapper = _ce('div');
        wrapper.style.cssText = 'display:flex;gap:20px;align-items:flex-start;width:min(920px,95vw);';
        wrapper.appendChild(infoBar);
        wrapper.appendChild(box);
        _modalOverlay.appendChild(wrapper);
        var body = _ce('div');
        body.style.cssText = 'padding:30px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;flex:1;';
        var organNames = _ORGAN_NAMES;
        var _organColors = _BOSS_ORGAN_COLORS;
        var inv = gs.inventory.components;
        var comps = GD().COMPONENTS || {};
        var organBlock = _ce('div');
        organBlock.style.cssText = 'padding:20px;background:rgba(0,255,136,0.02);border:1px solid rgba(0,255,136,0.15);border-radius:8px;display:flex;flex-direction:column;gap:12px;';
        organBlock.innerHTML = '<div class="txt-sm txt-green txt-bold">> 器官装备</div>';
        ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function(s) {
            var d = p[s];
            var cost = Math.ceil(5 * Math.pow(1.6, d.tier));
            var getWeight2 = function(cid) { if (cid.endsWith('Ⅲ')) return 4; if (cid.endsWith('Ⅱ')) return 3; if (cid.endsWith('Ⅰ')) return 2; return 1; };
            var canUpgrade = Object.keys(inv).reduce(function(a,k){ return a + (inv[k] * getWeight2(k)); }, 0) >= cost;
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
                    var _bgL = 'rgba(255,213,79,0.08)'; var _bdL = 'rgba(255,213,79,0.2)'; var _clL = 'var(--accent-yellow)';
                    slotHTML += '<span class="help-tip" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;font-size:13px;background:' + _bgL + ';border:1px solid ' + _bdL + ';border-radius:4px;color:' + _clL + ';' + (p.bp < 10 ? 'opacity:0.5;cursor:not-allowed;filter:grayscale(1);' : 'cursor:pointer;') + '" data-tip="' + etip + (p.bp < 10 ? '&#10;<b style=color:var(--accent-red)>BP 不足 (需10)</b>' : '&#10;点击卸下 (10 BP)') + '" data-slot="' + s + '" data-sidx="' + si + '">' + _fmtRoman(cid) + '</span>';
                } else {
                    var hasAvail = false; Object.keys(inv).forEach(function(ck) { if (inv[ck] > 0 && comps[ck] && comps[ck].allowedSlots && comps[ck].allowedSlots.indexOf(s) !== -1) hasAvail = true; });
                    var slotCls = hasAvail ? 'slot-ready' : '';
                    var slotStyle = hasAvail ? 'padding:6px 10px;font-size:13px;background:rgba(0,255,136,0.04);border:1px dashed rgba(0,255,136,0.3);border-radius:4px;color:var(--accent-green);cursor:pointer;' : 'padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:4px;color:var(--text-dim);cursor:pointer;';
                    slotHTML += '<span class="' + slotCls + '" style="' + slotStyle + '" onclick="UISystem._showSocketPicker(\'' + s + '\',' + si + ')">+ 空槽' + (hasAvail ? ' <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 6px var(--accent-green);margin-left:2px;vertical-align:middle;"></span>&nbsp;<span style="font-size:11px;color:var(--accent-green);">可嵌入</span>' : '') + '</span>';
                }
            });
            row.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;width:100%;">' +
                '<div class="txt-sm txt-green txt-bold">' + organNames[s] + ' <span class="txt-xs">[' + d.tier + '阶]</span></div>' +
                '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;">' +
                '<span class="txt-xs txt-dim" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">挂载: ' + (d.equipped ? '<span class="help-tip btn-organ" style="padding:6px 10px;font-size:13px;background:' + (_organColors[d.equipped]||_organColors._default).bg + ';border:1px solid ' + (_organColors[d.equipped]||_organColors._default).bd + ';border-radius:4px;color:' + (_organColors[d.equipped]||_organColors._default).hex + ';cursor:pointer;" data-tip="点击卸下该器官" onclick="try{GameState.equipOrgan(\'' + s + '\',null);}catch(e){}UISystem.showReorganizeModal();UISystem.render();">' + d.equipped + '</span>' : '<span class="btn-organ' + (gs.inventory.organs.length > 0 ? ' slot-ready' : '') + '" style="padding:6px 10px;font-size:13px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.2);border-radius:4px;color:var(--accent-green);cursor:pointer;" onclick="UISystem._showOrganPicker(\'' + s + '\')">标准原型</span>') + ' 组件: <span style="display:inline-flex;align-items:center;gap:8px;">' + slotHTML + '</span></span>' +
                (function() {
                    // [新增] 进阶收益预览逻辑
                    var nextTier = d.tier + 1;
                    var bonusDesc = "";
                    if (s === 'predatory_organ') bonusDesc = "攻击 +3, 生命 +5";
                    else if (s === 'chitin_epidermis') bonusDesc = "防御 +3, 生命 +3";
                    else if (s === 'gland_core') bonusDesc = "进程回复 +1, 进程上限 +1";

                    var tipText = "<b style='color:var(--accent-green)'>器官进阶：第 " + d.tier + " 阶 → " + nextTier + " 阶</b>&#10;";
                    tipText += "<b>预估收益：</b><span style='color:var(--accent-green)'>" + bonusDesc + "</span>&#10;";
                    tipText += "<b>进阶消耗：</b>任意组件 ×" + cost + "&#10;";
                    tipText += "<b>当前库存：</b>共 " + Object.keys(inv).reduce(function(a,k){ return a + (inv[k] * getWeight2(k)); }, 0) + " (加权)";
                    if (!canUpgrade) tipText += "&#10;<b style='color:var(--accent-red)'>材料不足，无法进阶</b>";

                    return '<button class="btn btn-green btn-sm help-tip" ' + (canUpgrade ? '' : 'disabled') + ' data-tip="' + tipText + '" onclick="UISystem._showOrganUpgradePicker(\'' + s + '\')">进阶</button>';
                })() +
                '</div>' +
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
        var potIds = ['POT_BERSERK', 'POT_ANTIDOTE', 'POT_SHIELD_CORE', 'POT_HEAL', 'POT_DEFENSE', 'POT_RAM'];
        var hasCrafted = false;
        potIds.forEach(function(pid) {
            var pd = _buildPotionDetail(pid); if (!pd) return;
            var totalMats = Object.values(inv).reduce(function(a,b){return a+b;},0);
            var canCraft = totalMats >= pd.cost && gs.inventory.potions.length < 3;
            hasCrafted = true;
            potHTML += '<span class="help-tip" style="padding:6px 10px;background:rgba(206,147,216,0.1);border:1px solid rgba(206,147,216,0.2);border-radius:4px;" data-tip="' + pd.tooltip + (canCraft ? '' : '（不足，库存' + totalMats + '）') + '">' +
                '<span class="txt-xs txt-bold" style="color:var(--accent-purple);">' + pd.name + '</span>' +
                '<span class="txt-xs txt-dim"> 毒性+' + pd.toxicity + '</span>' +
                (canCraft ? ' <button class="btn btn-purple" style="padding:1px 8px;font-size:12px;" onclick="UISystem._showComponentSelectModal(\'' + pd.name + '\',' + pd.cost + ',function(items){GameState.craftPotionWithSelection(\'' + pid + '\',items);UISystem.showReorganizeModal();});">炼制</button>' : '') +
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

        // --- 基因涂层涂抹 ---
        var coatSection = _ce('div');
        coatSection.style.cssText = 'padding:15px 20px;background:rgba(255,213,79,0.03);border:1px solid rgba(255,213,79,0.15);border-radius:6px;';
        var coatings = GD().COATINGS || {};
        var raceNames2 = _RACE_NAMES;
        var raceClrs2 = _RACE_COLORS;
        var coatHTML = '<div class="txt-xs txt-gold txt-bold" style="margin-bottom:10px;">> 基因涂层涂抹（对特定种族造成融毁打击）</div>';
        if (gs.player.activeCoating) {
            var ac = coatings[gs.player.activeCoating];
            coatHTML += '<div class="txt-xs" style="margin-bottom:8px;color:' + (ac ? (raceClrs2[ac.targetRace]||{}).hex || 'var(--accent-yellow)' : 'var(--text-dim)') + ';">已涂抹: ' + (ac ? ac.name : gs.player.activeCoating) + ' · 剩余 ' + gs.player.coatingTurnsLeft + ' 回合</div>';
        }
        coatSection.innerHTML = coatHTML;
        var coatBtnRow = _ce('div');
        coatBtnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        var hasCoatings = false;
        Object.keys(coatings).forEach(function(coatId) {
            var ct = coatings[coatId];
            var rc = raceClrs2[ct.targetRace] || { hex: 'var(--accent-yellow)', bg: 'rgba(255,213,79,0.08)', bd: 'rgba(255,213,79,0.2)' };
            var costParts = []; Object.keys(ct.cost).forEach(function(m) { costParts.push(m + ' ×' + ct.cost[m]); });
            var canAfford = true; Object.keys(ct.cost).forEach(function(m) { if (!inv[m] || inv[m] < ct.cost[m]) canAfford = false; });
            var effectParts = [];
            if (ct.effect.damageBonus) effectParts.push('伤害+' + Math.round(ct.effect.damageBonus*100) + '%');
            if (ct.effect.ignoreDefense) effectParts.push('无视防御');
            if (ct.effect.toxinBonus) effectParts.push('毒素+' + Math.round(ct.effect.toxinBonus*100) + '%');
            if (ct.effect.toxinImmune) effectParts.push('免疫中毒');
            if (ct.effect.shieldStrip) effectParts.push('剥离' + ct.effect.shieldStrip + '护盾');
            var tip = '<b>' + ct.name + '</b>&#10;目标种族：' + (raceNames2[ct.targetRace]||ct.targetRace) + '&#10;效果：' + effectParts.join(' · ') + '&#10;持续 ' + ct.duration + ' 回合&#10;消耗：' + costParts.join(' + ');
            var totalCost = 0; Object.keys(ct.cost).forEach(function(m){ totalCost += ct.cost[m]; });
            var _costMap = ct.cost;
            var btn = _ce('button', 'btn btn-sm help-tip');
            btn.style.cssText = 'padding:6px 14px;font-size:13px;background:' + rc.bg + ';border:1px solid ' + rc.bd + ';color:' + rc.hex + ';' + (canAfford ? '' : 'opacity:0.4;');
            btn.textContent = ct.name;
            btn.setAttribute('data-tip', tip);
            if (!canAfford) btn.disabled = true;
            else btn.onclick = function() { UISystem._showComponentSelectModal(ct.name, totalCost, function(items){ GameState.applyCoatingWithSelection(coatId, items); UISystem.showReorganizeModal(); }, _costMap); };
            coatBtnRow.appendChild(btn);
            hasCoatings = true;
        });
        if (!hasCoatings) coatBtnRow.innerHTML = '<span class="txt-xs txt-dim">暂无可用涂层配方</span>';
        coatSection.appendChild(coatBtnRow);
        body.appendChild(coatSection);

        // --- [新增] 器官深度同调 (消耗同名器官提升 Lv) ---
        var organSyncSection = _ce('div');
        organSyncSection.style.cssText = 'padding:15px 20px;background:rgba(255,213,79,0.03);border:1px solid rgba(255,213,79,0.15);border-radius:6px;';
        var syncHTML = '<div class="txt-xs txt-gold txt-bold" style="margin-bottom:10px;">> 器官深度同调（消耗同名器官提升技能效能，最高 Lv.3）</div>';
        syncHTML += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';

        var bossOrganIds = ['暴君核心', '蜂后髓核', '高能电泳核'];
        var hasAnyBossOrgan = false;

        bossOrganIds.forEach(function(oid) {
            var syncLvl = gs.inventory.organSyncLevels[oid] || 1;
            var countInInv = gs.inventory.organs.filter(function(id) { return id === oid; }).length;
            var isEquipped = [p.predatory_organ.equipped, p.chitin_epidermis.equipped, p.gland_core.equipped].indexOf(oid) !== -1;
            var totalOwned = countInInv + (isEquipped ? 1 : 0);

            if (totalOwned > 0) {
                hasAnyBossOrgan = true;
                var nextSyncCost = [0, 2000, 5000][syncLvl] || null;
                var canSync = totalOwned >= 2 && nextSyncCost !== null && p.bp >= nextSyncCost;

                var syncTips = {
                    '暴君核心': 'Lv.3 觉醒：攻击变为<b style=color:var(--accent-red)>真实伤害</b>，无视防御',
                    '蜂后髓核': 'Lv.3 觉醒：召唤突袭时额外<b style=color:var(--accent-blue)>吸取 50% 伤害的护盾</b>',
                    '高能电泳核': 'Lv.3 觉醒：电弧过载将对<b style=color:var(--accent-blue)>全场敌人</b>造成 50% 溅射伤害'
                };

                var oTip = '<b style=color:var(--accent-yellow)>' + oid + ' (Lv.' + syncLvl + ')</b>&#10;' +
                    '<b>当前加成：</b>基础属性 ×' + (1 + (syncLvl-1)*0.5).toFixed(1) + '&#10;' +
                    '<b>技能成长：</b>随阶位 (Tier) 额外提升倍率&#10;' +
                    (syncLvl < 3 ? '<b>下一级：</b>' + syncTips[oid] + '&#10;<b>消耗：</b>同名器官 ×1 + ' + nextSyncCost + ' BP' : '<b style=color:var(--accent-green)>同调已满级 (觉醒态)</b>');

                syncHTML += '<span class="help-tip" style="padding:6px 12px;background:rgba(255,213,79,0.05);border:1px solid rgba(255,213,79,0.2);border-radius:4px;display:flex;align-items:center;gap:10px;" data-tip="' + oTip + '">' +
                    '<span class="txt-xs" style="color:var(--accent-yellow);"><span class="icon icon-crown"></span>' + oid + ' <small>Lv.' + syncLvl + '</small></span>' +
                    (syncLvl < 3 ? ' <button class="btn ' + (canSync ? 'btn-gold' : 'btn-gray') + ' btn-sm" style="padding:1px 8px;font-size:11px;" onclick="if(' + canSync + '){ var r=GameState.syncOrgan(\'' + oid + '\'); if(r.success){ UISystem.showReorganizeModal(); UISystem.showNotification(\'同调突破！\', \'' + oid + ' 等级提升至 \' + r.newLevel, \'var(--accent-yellow)\'); } }">' + (totalOwned < 2 ? '缺少副本' : (p.bp < nextSyncCost ? 'BP不足' : '深度同调')) + '</button>' : '') +
                    '</span>';
            }
        });

        if (!hasAnyBossOrgan) syncHTML += '<span class="txt-xs txt-dim">未发现可同调的领主器官</span>';
        syncHTML += '</div>';
        organSyncSection.innerHTML = syncHTML;
        body.appendChild(organSyncSection);

        // --- [新增] 基因突变 (消耗 BP 提升基础属性) ---
        var mutationSection = _ce('div');
        mutationSection.style.cssText = 'padding:15px 20px;background:rgba(0,212,255,0.03);border:1px solid rgba(0,212,255,0.15);border-radius:6px;';
        var mutationHTML = '<div class="txt-xs txt-blue txt-bold" style="margin-bottom:10px;">> 高阶基因突变（消耗基因点数永久提升基础序列）</div>';
        mutationHTML += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        var muts = [
            { type: 'atk', name: '攻击突变', cost: 1500, val: '+5', icon: 'icon-atk' },
            { type: 'def', name: '防御突变', cost: 1200, val: '+5', icon: 'icon-def' },
            { type: 'hp', name: '生命突变', cost: 1000, val: '+25', icon: 'icon-health' }
        ];
        muts.forEach(function(m) {
            var canMut = p.bp >= m.cost;
            mutationHTML += '<span class="help-tip" style="padding:6px 12px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.2);border-radius:4px;" data-tip="<b style=\'color:var(--accent-blue)\'>' + m.name + '：</b>&#10;永久提升基础属性 ' + m.val + '&#10;<b>消耗：</b>' + m.cost + ' 基因点数' + (canMut ? '' : '（不足）') + '">' +
                '<span class="txt-xs" style="color:var(--accent-blue);"><span class="icon ' + m.icon + '"></span>' + m.name + '</span>' +
                (canMut ? ' <button class="btn btn-blue" style="padding:1px 8px;font-size:12px;" onclick="GameState.mutateStat(\'' + m.type + '\');UISystem.showReorganizeModal();">突变</button>' : '') +
                '</span>';
        });
        mutationHTML += '</div>';
        mutationSection.innerHTML = mutationHTML;
        body.appendChild(mutationSection);

        // 器官背包
        var bos3 = GD().BOSS_ORGANS || {};
        var organColors3 = _BOSS_ORGAN_COLORS;
        if (gs.inventory.organs.length > 0) {
            var organInvRow = _ce('div');
            organInvRow.style.cssText = 'padding:12px 16px;background:rgba(0,255,136,0.02);border:1px solid rgba(0,255,136,0.1);border-radius:6px;margin-bottom:4px;';
            var orgHTML = '<div class="txt-xs txt-green txt-bold" style="margin-bottom:6px;">> 突变器官（' + gs.inventory.organs.length + '个）</div><div style="display:flex;flex-wrap:wrap;gap:8px;">';
            gs.inventory.organs.forEach(function(oid) {
                var oc3 = _getOrganColor(oid);
                var bo3 = bos3[oid]; var slotName3 = bo3 ? (_ORGAN_NAMES[bo3.slotType] || '未知') : '未知';
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
        var synBtn = totalCount >= 3 ? '<button class="btn btn-gold btn-sm" style="padding:2px 10px;font-size:12px;" onclick="UISystem._showSynthesizeModal()">三合一</button>' : '';
        var invHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span class="txt-xs txt-gold txt-bold">> 组件库存（' + totalCount + '个）</span>' + synBtn + '</div><div style="display:flex;flex-wrap:wrap;gap:8px;">';
        var hasAny = false;
        Object.keys(inv).forEach(function(k) { if (inv[k] > 0) { hasAny = true; var tip = _buildCompTooltip(k);
            var bg2 = 'rgba(255,213,79,0.1)'; var bd2 = 'rgba(255,213,79,0.2)'; var cl2 = 'var(--accent-yellow)';
            invHTML += '<span class="txt-xs help-tip" style="padding:4px 10px;background:' + bg2 + ';border:1px solid ' + bd2 + ';border-radius:4px;color:' + cl2 + ';" data-tip="' + tip + '" data-cname="' + k + '">' + _fmtRoman(k) + ' ×' + inv[k] + '</span>'; } });
        if (!hasAny) invHTML += '<span class="txt-xs txt-dim">暂无组件 · 击败怪物获得</span>';
        invHTML += '</div>';
        invRow.innerHTML = invHTML;
        body.appendChild(invRow);
        box.appendChild(body);
        UISystem.render();
    }

    function showEventModal(eventId, pathIndex) {
        var gs = GS(); if (!gs) return;
        var evt = GD().RANDOM_EVENTS[eventId]; if (!evt) return;

        document.querySelectorAll('.help-popup').forEach(function(el) { el.remove(); });
        _modalOverlay.innerHTML = '';
        _modalOverlay.style.display = 'flex';

        var box = _ce('div', 'modal-box');
        box.style.cssText = 'width:min(600px,90vw);background:var(--bg-modal);border:1px solid var(--accent-yellow);border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 0 40px rgba(0,0,0,1);';

        var head = _ce('div');
        head.style.cssText = 'padding:20px 30px;background:rgba(255,213,79,0.08);border-bottom:1px solid var(--accent-yellow);';
        head.innerHTML = '<div class="txt-md txt-gold txt-bold">[ 突发异常事件：' + evt.title + ' ]</div>';
        box.appendChild(head);

        var body = _ce('div');
        body.style.cssText = 'padding:30px;display:flex;flex-direction:column;gap:20px;';

        var desc = _ce('div');
        desc.className = 'txt-sm txt-white';
        desc.style.cssText = 'line-height:1.8;letter-spacing:1px;';
        desc.innerHTML = '<span class="typewriter"></span>';
        body.appendChild(desc);

        var optContainer = _ce('div');
        optContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:10px;opacity:0;transition:opacity 0.8s;';

        evt.options.forEach(function(opt, idx) {
            var btn = _ce('div', 'event-option-card');
            btn.style.cssText = 'padding:15px 20px;background:rgba(255,255,255,0.03);border:1px solid var(--border-dim);border-radius:6px;cursor:pointer;transition:all 0.2s;';

            var canAfford = true;
            var costText = '';
            if (opt.cost) {
                if (opt.cost.bp && gs.player.bp < opt.cost.bp) canAfford = false;
                if (!canAfford) btn.style.opacity = '0.5';
            }

            btn.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<span class="txt-sm txt-bold" style="color:var(--accent-yellow);">' + opt.label + '</span>' +
                (opt.cost ? '<span class="txt-xs txt-red">消耗 ' + opt.cost.bp + ' BP</span>' : '') +
                '</div>' +
                '<div class="txt-xs txt-dim" style="margin-top:4px;">' + opt.desc + '</div>';

            if (canAfford) {
                btn.onmouseenter = function() { this.style.background = 'rgba(255,213,79,0.08)'; this.style.borderColor = 'var(--accent-yellow)'; };
                btn.onmouseleave = function() { this.style.background = 'rgba(255,255,255,0.03)'; this.style.borderColor = 'var(--border-dim)'; };
                btn.onclick = function() {
                    if (opt.cost && opt.cost.bp) gs.player.bp -= opt.cost.bp;
                    var res = opt.action(gs);

                    // 显示结果
                    optContainer.style.pointerEvents = 'none';
                    optContainer.style.opacity = '0.3';

                    var resDiv = _ce('div');
                    resDiv.style.cssText = 'margin-top:20px;padding:15px;background:rgba(0,0,0,0.4);border-radius:6px;border-left:4px solid ' + (res.type === 'hazard' ? 'var(--accent-red)' : 'var(--accent-green)') + ';animation: slideIn 0.5s forwards;';
                    resDiv.innerHTML = '<div class="txt-sm txt-white">' + res.msg + '</div>' +
                        '<div class="txt-xs txt-dim" style="margin-top:10px;text-align:right;">点击任意位置继续...</div>';
                    body.appendChild(resDiv);

                    _modalOverlay.onclick = function() {
                        _modalOverlay.onclick = null; // 清除本次监听
                        UISystem.closeModal();

                        // 事件结束，淡出路径卡片并正式进入预定房间
                        _fadeOutCards(function() {
                            var resSub = window.WorldSystem.discover(pathIndex);
                            _handleDiscoveryResult(resSub, pathIndex, null);
                        });
                    };
                };
            }
            optContainer.appendChild(btn);
        });

        body.appendChild(optContainer);
        box.appendChild(body);
        _modalOverlay.appendChild(box);

        _typeText(desc.querySelector('.typewriter'), evt.desc, function() {
            optContainer.style.opacity = '1';
        }, 20);
    }

    return { init: init, render: render, _foldSection: _foldSection, showStatusModal: showStatusModal, showReorganizeModal: showReorganizeModal, showBestiaryModal: showBestiaryModal, showDungeonWarning: showDungeonWarning, showSaveModal: showSaveModal, closeModal: closeModal, closeIntro: closeIntro, resetGame: resetGame, triggerShake: triggerShake, shakeMonsterCard: shakeMonsterCard, showDamageFloat: showDamageFloat, showNotification: showNotification, showHelpPanel: showHelpPanel, toggleSound: toggleSound, _claimReward: _claimReward, _claimAllTasks: _claimAllTasks, _showSynthesizeModal: _showSynthesizeModal, _showSocketPicker: _showSocketPicker, _showOrganPicker: _showOrganPicker, _showOrganUpgradePicker: _showOrganUpgradePicker, _showComponentSelectModal: _showComponentSelectModal, showEventModal: showEventModal };
}
)();
