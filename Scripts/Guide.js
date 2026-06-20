/**
 * Guide.js — v3.0 新手引导
 * 所有说明卡片同时定位到对应UI元素旁，点击任意位置关闭
 */
window.GuideSystem = (function () {
    'use strict';
    var GS = function () { return window.GameState.getState(); };

    var _items = [
        { sel: '.hud-top', pos: 'bottom', align: 'center', title: '状态栏',
            desc: '<b style="color:var(--accent-red)">生命</b> · <b style="color:var(--accent-green)">进程</b> · <b style="color:var(--accent-purple)">毒性</b> · <b style="color:var(--accent-yellow)">等阶</b>' },
        { id: 'ui-room-info', pos: 'top', align: 'left', title: '当前位置',
            desc: '所在<b>房间名称</b>和环境描述。<br>母巢是唯一安全区。' },
        { sel: '.path-card:first-child', pos: 'top', align: 'self-left', title: '路径卡片',
            desc: '点击卡片<b>探索路径</b>，遭遇怪物、遗物或地下城。每层隐藏一只<b>区域领主</b>。' },
        { id: 'ui-task-panel', pos: 'bottom', align: 'left', title: '指令任务',
            desc: '<b>阶段性目标</b>，完成后点击领取奖励。' },
        { id: 'ui-action-bar', pos: 'top', align: 'center', title: '操作栏',
            desc: '探索：实验室/图鉴/存档。<br>战斗：<b>1/2/3</b> 技能 · <b>空格</b> 结束回合。' },
        { id: 'ui-log', pos: 'top', align: 'left', title: '神经日志',
            desc: '战斗记录、系统消息、奖励通知。' },
        { sel: '.hud-col-r button:last-child', pos: 'bottom', align: 'right', title: '帮助',
            desc: '<b style="color:var(--accent-green)">[引导]</b> 重温 · <b style="color:var(--accent-blue)">?</b> 手册' }
    ];

    var _overlay = null;
    var _cards = [];
    var _active = false;

    function _ce(tag) { return document.createElement(tag); }

    function start() {
        if (_active) return;
        var gs = GS(); if (!gs) return;
        _active = true;

        _overlay = _ce('div');
        _overlay.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(3,3,8,0.82);cursor:pointer;';
        _overlay.onclick = function () { close(); };
        document.body.appendChild(_overlay);

        _items.forEach(function (item) {
            var el = item.id ? document.getElementById(item.id) : document.querySelector(item.sel);
            if (!el) return;
            var rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            var card = _ce('div');
            card.style.cssText = 'position:fixed;z-index:3001;padding:10px 14px;background:rgba(8,8,20,0.96);border:1px solid var(--accent-green);border-radius:8px;box-shadow:0 0 20px rgba(0,255,136,0.15);max-width:240px;line-height:1.5;pointer-events:none;';
            card.innerHTML = '<div class="txt-xs txt-green txt-bold" style="margin-bottom:4px;">' + item.title + '</div>' +
                '<div class="txt-xs" style="color:var(--text-dim);font-size:12px;">' + item.desc + '</div>';

            var cw = 240, gap = 10;
            var l;
            if (item.align === 'left') {
                var leftPanel = document.querySelector('.left-panel-col');
                l = leftPanel ? Math.max(10, leftPanel.getBoundingClientRect().left + 15) : Math.max(10, rect.left + 15);
            } else if (item.align === 'self-left') {
                l = Math.max(10, rect.left);
            } else if (item.align === 'right') l = Math.max(10, rect.right - cw + 20);
            else l = Math.max(10, rect.left + rect.width / 2 - cw / 2);

            card.style.left = l + 'px';

            if (item.pos === 'top') {
                card.style.bottom = (window.innerHeight - rect.top + gap) + 'px';
            } else {
                card.style.top = Math.min(rect.bottom + gap, window.innerHeight - 10) + 'px';
            }

            _overlay.appendChild(card);
            _cards.push(card);
        });
    }

    function close() {
        if (_overlay) { _overlay.remove(); _overlay = null; }
        _cards = [];
        _active = false;
    }

    function autoStart() {
        var gs = GS();
        if (!gs || gs.mapState.stepsTaken > 0) return;
        setTimeout(function () { start(); }, 2000);
    }

    return { start: start, autoStart: autoStart };
})();
