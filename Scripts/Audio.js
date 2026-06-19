/**
 * Audio.js — 轻量音效管理 + 背景音乐系统
 */
window.Sound = (function () {
    'use strict';
    var base = '../Assets/Audio/';
    var _enabled = true;
    var _cache = {};

    function _load(src, vol) {
        if (_cache[src]) return _cache[src];
        var a = new Audio(base + src);
        a.volume = (vol !== undefined) ? vol : 0.35;
        _cache[src] = a;
        return a;
    }

    function _playRand(list, vol) {
        if (!_enabled) return;
        var s = list[Math.floor(Math.random() * list.length)];
        var a = _load(s, vol);
        a.currentTime = 0;
        a.play().catch(function(){});
    }

    // ======== 音效 ========
    function attack()    { _playRand(['attack_01.ogg','attack_02.ogg','attack_03.ogg','attack_04.ogg','attack_05.ogg'], 0.4); }
    function monster()   { _playRand(['alien_07.ogg','alien_08.ogg','bug_05.ogg','monster_08.ogg','roar_04.ogg']); }
    function hit()       { _playRand(['grunt_06.ogg','grunt_07.ogg','human_01.ogg','human_02.ogg'], 0.35); }
    function electric()  { _playRand(['PM_SD_UI_MAGIC_CONFIRM_2.wav','PM_SD_UI_MAGIC_CONFIRM_4.wav','PM_SD_UI_MAGIC_CONFIRM_6.wav','PM_SD_UI_MAGIC_CONFIRM_8.wav','PM_SD_UI_MAGIC_CONFIRM_12.wav'], 0.45); }
    function victory() {
        var a = _load('victory.mp3'); a.volume = 0.25; a.currentTime = 0;
        a.play().catch(function(){});
        if (a._fadeInterval) { clearInterval(a._fadeInterval); }
        var fade = setInterval(function() {
            if (a.volume > 0.02) a.volume = Math.max(0, a.volume - 0.02);
            else { clearInterval(fade); a.pause(); a.volume = 0.25; a._fadeInterval = null; }
        }, 180);
        a._fadeInterval = fade;
    }
    function defeat()    { var a = _load('Wrong Error.wav'); a.volume=0.5; a.currentTime=0; a.play().catch(function(){}); }
    function click()     { var a = _load('hover.mp3'); a.volume=0.15; a.currentTime=0; a.play().catch(function(){}); }

    // ======== 背景音乐 ========
    var _bgm = null;
    var _bgmFade = null;
    var _bgmType = null;

    function _stopFade() {
        if (_bgmFade) { clearInterval(_bgmFade); _bgmFade = null; }
    }

    function _fadeOut(a, cb) {
        _stopFade();
        _bgmFade = setInterval(function() {
            if (a.volume > 0.02) { a.volume = Math.max(0, a.volume - 0.02); }
            else { clearInterval(_bgmFade); _bgmFade = null; a.pause(); a.currentTime = 0; if (cb) cb(); }
        }, 80);
    }

    function _fadeIn(a, targetVol) {
        _stopFade();
        a.volume = 0;
        a.play().catch(function(){});
        _bgmFade = setInterval(function() {
            if (a.volume < targetVol - 0.02) { a.volume = Math.min(targetVol, a.volume + 0.02); }
            else { a.volume = targetVol; clearInterval(_bgmFade); _bgmFade = null; }
        }, 80);
    }

    function _switchBGM(src, vol, type) {
        if (!_enabled) return;
        if (_bgmType === type && _bgm && !_bgm.paused) return; // 已在播放同类型

        var old = _bgm;
        _bgm = new Audio(base + src);
        _bgm.loop = true;
        _bgm.volume = 0;
        _bgmType = type;
        _cache['__bgm_' + type] = _bgm;

        if (old && !old.paused) {
            _fadeOut(old, function() {
                _fadeIn(_bgm, vol);
            });
        } else {
            _fadeIn(_bgm, vol);
        }
    }

    function playExploreBGM() { _switchBGM('airy.mp3', 0.15, 'explore'); }
    function playBattleBGM()  { _switchBGM('urgent.mp3', 0.18, 'battle'); }

    function stopBGM() {
        _stopFade();
        if (_bgm) { _bgm.pause(); _bgm.currentTime = 0; _bgm = null; }
        _bgmType = null;
    }

    return {
        attack: attack, monster: monster, hit: hit, electric: electric,
        victory: victory, defeat: defeat, click: click,
        playExploreBGM: playExploreBGM, playBattleBGM: playBattleBGM,
        stopBGM: stopBGM
    };
})();
