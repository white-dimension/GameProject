/**
 * Audio.js — 轻量音效管理
 */
window.Sound = (function () {
    'use strict';
    var base = '../Assets/Audio/';
    var _enabled = true;
    var _cache = {};

    function _load(src) {
        if (_cache[src]) return _cache[src];
        var a = new Audio(base + src);
        a.volume = 0.3;
        _cache[src] = a;
        return a;
    }

    function _playRand(list) {
        if (!_enabled) return;
        var s = list[Math.floor(Math.random() * list.length)];
        var a = _load(s);
        a.currentTime = 0;
        a.play().catch(function(){});
    }

    function attack()    { _playRand(['attack_01.ogg','attack_02.ogg','attack_03.ogg','attack_04.ogg','attack_05.ogg']); }
    function monster()   { _playRand(['alien_07.ogg','alien_08.ogg','bug_05.ogg','monster_08.ogg','roar_04.ogg']); }
    function hit()       { _playRand(['grunt_06.ogg','grunt_07.ogg','human_01.ogg','human_02.ogg']); }
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
    return {
        attack: attack, monster: monster, hit: hit,
        victory: victory, defeat: defeat, click: click
    };
})();
