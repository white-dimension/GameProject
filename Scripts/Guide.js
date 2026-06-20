/**
 * Guide.js — v3.0 新手引导
 * 悬浮覆盖 + 在对应区域旁显示说明卡片
 */
window.GuideSystem = (function () {
    'use strict';
    var GS = function () { return window.GameState.getState(); };

    var _steps = [
        { id: null, sel: '.hud-top', pos: 'bottom', title: '状态栏',
            desc: '<b style="color:var(--accent-red)">生命</b> — 归零死亡&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:var(--accent-green)">进程</b> — 技能消耗&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:var(--accent-purple)">毒性</b> — 超50扣血&nbsp;&nbsp;|&nbsp;&nbsp;<b style="color:var(--accent-yellow)">等阶</b> — 上限30级' },
        { id: 'ui-room-info', sel: null, pos: 'right', title: '当前位置',
            desc: '显示所在<b>房间名称</b>和环境描述。<br>母巢是唯一安全区：自动恢复生命和清除毒性。' },
        { id: null, sel: '.discovery-view', pos: 'bottom', title: '路径卡片',
            desc: '中央卡片代表<b>可探索路径</b>。点击前进，遭遇怪物、精英、遗物或地下城。<br>每层隐藏一只<b>区域领主</b>，击败后解锁传送门。' },
        { id: 'ui-task-panel', sel: null, pos: 'right', title: '指令任务',
            desc: '<b>阶段性目标</b>，完成后点击领取基因点数或组件奖励。<br>分 5 个阶段，逐步解锁。' },
        { id: 'ui-action-bar', sel: null, pos: 'top', title: '操作栏',
            desc: '<b>探索模式</b>：实验室、图鉴、存档。<br><b>战斗模式</b>：按 <b>1/2/3</b> 发动器官技能，<b>空格</b>结束回合，<b>4/5/6</b> 使用魔药。' },
        { id: 'ui-log', sel: null, pos: 'right', title: '神经日志',
            desc: '战斗记录、系统消息、奖励通知在此滚动。<br>上下滚动查看完整历史。' },
        { id: null, sel: '.hud-col-r', pos: 'bottom', title: '帮助与重温',
            desc: '<b style="color:var(--accent-green)">[ 引导 ]</b> 随时重温本教程。<br><b style="color:var(--accent-blue)">?</b> 打开详细操作手册。' }
    ];

    var _idx = 0;
    var _overlay = null;
    var _card = null;
    var _active = false;

    function _ce(tag) { return document.createElement(tag); }
    function _resolveEl(s) { return s.id ? document.getElementById(s.id) : document.querySelector(s.sel); }

    function start() {
        if (_active) return;
        var gs = GS(); if (!gs) return;
        _active = true;
        _idx = 0;

        _overlay = _ce('div');
        _overlay.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(3,3,8,0.85);cursor:pointer;';
        _overlay.onclick = function (e) { if (e.target === _overlay) next(); };
        document.body.appendChild(_overlay);

        _card = _ce('div');
        _card.style.cssText = 'position:fixed;z-index:3001;padding:18px 22px;background:rgba(8,8,20,0.97);border:1px solid var(--accent-green);border-radius:10px;box-shadow:0 0 30px rgba(0,255,136,0.2);max-width:360px;cursor:pointer;line-height:1.7;';
        _card.onclick = function (e) { e.stopPropagation(); next(); };
        document.body.appendChild(_card);

        showStep();
    }

    function showStep() {
        if (_idx >= _steps.length) { finish(); return; }
        var s = _steps[_idx];
        var el = _resolveEl(s);
        if (!el || el.offsetParent === null) { _idx++; showStep(); return; }

        _card.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<span class="txt-xs txt-green txt-bold" style="font-size:14px;">' + s.title + '</span>' +
            '<span class="txt-xs txt-dim">' + (_idx + 1) + '/' + _steps.length + '</span></div>' +
            '<div class="txt-xs" style="color:var(--text-dim);">' + s.desc + '</div>' +
            '<div class="txt-xs txt-dim" style="margin-top:10px;text-align:right;">点击继续 →</div>';

        var rect = el.getBoundingClientRect();
        var cw = 360, ch = 130, gap = 16;
        var l, t;
        switch (s.pos) {
            case 'right':
                l = Math.min(rect.right + gap, window.innerWidth - cw - 10);
                t = Math.max(10, rect.top + rect.height / 2 - ch / 2);
                break;
            case 'left':
                l = Math.max(10, rect.left - cw - gap);
                t = Math.max(10, rect.top + rect.height / 2 - ch / 2);
                break;
            case 'top':
                l = Math.max(10, rect.left + rect.width / 2 - cw / 2);
                t = Math.max(10, rect.top - ch - gap);
                break;
            default: // bottom
                l = Math.max(10, rect.left + rect.width / 2 - cw / 2);
                t = Math.min(rect.bottom + gap, window.innerHeight - ch - 10);
        }
        _card.style.left = l + 'px';
        _card.style.top = t + 'px';
    }

    function next() {
        _idx++;
        showStep();
    }

    function _dismiss() {
        if (_card) { _card.remove(); _card = null; }
        if (_overlay) { _overlay.remove(); _overlay = null; }
        _active = false;
    }

    function finish() {
        if (!_card) { _dismiss(); return; }
        _card.innerHTML = '<div class="txt-xs txt-green txt-bold" style="font-size:14px;margin-bottom:6px;">引导完成</div>' +
            '<div class="txt-xs" style="color:var(--text-dim);">右上角 <b style="color:var(--accent-blue);">?</b> 查看详细手册。<br><b style="color:var(--accent-green);">[ 引导 ]</b> 可随时重温。</div>' +
            '<div class="txt-xs txt-dim" style="margin-top:10px;text-align:right;">点击任意位置关闭 →</div>';
        _card.style.left = '50%';
        _card.style.top = '50%';
        _card.style.transform = 'translate(-50%,-50%)';
        _overlay.onclick = function (e) { e.stopPropagation(); _dismiss(); };
        _card.onclick = function (e) { e.stopPropagation(); _dismiss(); };
    }

    function autoStart() {
        var gs = GS();
        if (!gs || gs.mapState.stepsTaken > 0) return;
        setTimeout(function () { start(); }, 2000);
    }

    return { start: start, autoStart: autoStart };
})();
