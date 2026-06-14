/**
 * World.js — v3.0 神经触突路径引擎
 */
window.WorldSystem = (function () {
    'use strict';
    const GS = function () { return window.GameState.getState(); };

    function discover(pathIndex) {
        var gs = GS(); if (!gs || !gs.mapState) return { success: false, error: '未初始化' };
        var paths = gs.mapState.discoveryPaths;
        if (!paths || !paths[pathIndex]) return { success: false, error: '无效路径' };

        var target = paths[pathIndex];
        var p = gs.player;

        // 通关路径：直接返回，不触发战斗/奖励逻辑
        if (target.type === 'victory') {
            gs.mapState.currentRoom = { type: 'victory', label: target.label, desc: target.desc };
            return { success: true, room: gs.mapState.currentRoom, events: [] };
        }

        // 标记节点为已消耗
        var poolIndex = target._poolIndex;
        if (poolIndex !== undefined && gs.mapState.floorNodePool && gs.mapState.floorNodePool[poolIndex]) {
            gs.mapState.floorNodePool[poolIndex].exhausted = true;
        }

        // 1. 步进前判定：毒性超载扣血
        if (p.toxicity > 50) {
            p.hp = Math.max(0, p.hp - Math.ceil(p.hp_max * 0.02));
        }

        // 2. 游荡Boss遭遇（非营地/传送门/遗物）
        var encChance = (window.GameData.STATUS_CONSTANTS && window.GameData.STATUS_CONSTANTS.encounterChance) || 0.03;
        if (target.type !== 'camp' && target.type !== 'portal' && target.type !== 'relic' && Math.random() < encChance && gs.mapState.stepsTaken > 3) {
            var bosses = ['MON_CH1_TYRANT', 'MON_CH1_QUEEN', 'MON_CH1_CORE'];
            var bossId = bosses[Math.floor(Math.random() * bosses.length)];
            target = {
                type: 'boss',
                label: '<span class="icon icon-crown"></span> 巡逻首领：' + window.GameData.MONSTERS[bossId].name,
                desc: '传感器疯狂报警——前方出现超高能级生命体征！一个游荡的超级变异体已经发现了你的存在。没有退路了。',
                monsterId: bossId
            };
        }

        // 传送门：推进楼层
        if (target.type === 'portal') {
            gs.mapState.currentFloor = (gs.mapState.currentFloor || 1) + 1;
            gs.mapState.mapLevel = gs.mapState.currentFloor;
            gs.mapState.bossDefeated = false;
            gs.mapState.portalUnlocked = false;
            gs.mapState.floorNodePool = window.GameState._genFloorNodePool(gs.mapState.currentFloor);
            target.label = target.label + ' [B' + gs.mapState.currentFloor + 'F]';
            target.desc = target.desc + ' 传送门将你送到了更深层的实验室区域。';
        }

        // 遗物：非战斗奖励
        var relicEvent = null;
        if (target.type === 'relic') {
            p.relicsFound = (p.relicsFound || 0) + 1;
            var rewardRoll = Math.random();
            var comps = window.GameData.COMPONENTS || {};
            var compNames = Object.keys(comps);
            if (rewardRoll < 0.4) {
                // 组件碎片 x2~3
                var cid = compNames[Math.floor(Math.random() * compNames.length)];
                var amt = 2 + Math.floor(Math.random() * 2);
                gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + amt;
                relicEvent = { type: 'relic', msg: '发现基因遗物！获得 ' + cid + ' ×' + amt };
            } else if (rewardRoll < 0.7) {
                // 基因点数 +15~30
                var bpAmt = 15 + Math.floor(Math.random() * 16);
                p.bp += bpAmt;
                relicEvent = { type: 'relic', msg: '发现基因遗物！获得 ' + bpAmt + ' 基因点数' };
            } else if (rewardRoll < 0.85) {
                // 血量回满（稀有）
                p.hp = p.hp_max;
                relicEvent = { type: 'relic', msg: '发现远古医疗舱！生命已完全恢复。' };
            } else {
                // 毒性清零（稀有）
                p.toxicity = 0;
                relicEvent = { type: 'relic', msg: '发现净化矩阵！毒性已完全清零。' };
            }
        }

        // 地下城计数
        if (target.type === 'dungeon') { p.dungeonsEntered = (p.dungeonsEntered || 0) + 1; }

        // 3. 状态更新
        gs.mapState.currentRoom = {
            type: target.type,
            label: target.label,
            desc: target.desc,
            monsterId: target.monsterId
        };
        gs.mapState.stepsTaken = (gs.mapState.stepsTaken || 0) + 1;

        // 4. 结果处理
        var events = [];
        if (relicEvent) events.push(relicEvent);
        if (target.type === 'camp') {
            p.toxicity = 0;
            p.hp = p.hp_max;
            p._potionHistory = [];
            p._potionHistoryTick = 0;
            events.push({ type: 'camp_arrive', msg: '抵达中立细胞核。生命回满、毒性清零、耐药性重置。' });
        } else if (target.type !== 'relic') {
            p.toxicity = Math.max(0, p.toxicity - 1);
            if (p._potionHistory && p._potionHistory.length > 0) {
                p._potionHistoryTick = (p._potionHistoryTick || 0) + 1;
                if (p._potionHistoryTick >= 5) {
                    p._potionHistory = [];
                    p._potionHistoryTick = 0;
                }
            }
        }

        // 5. 生成下一组分支（传送门强制刷新，营地/遗物保留手牌）
        if (target.type === 'portal') {
            gs.mapState.discoveryPaths = window.GameState._genDiscoveryPaths(gs);
        }

        return {
            success: true,
            room: gs.mapState.currentRoom,
            events: events
        };
    }

    function generateNextPaths() {
        var gs = GS(); if (!gs) return;
        gs.mapState.discoveryPaths = window.GameState._genDiscoveryPaths(gs);
    }

    function getCurrentRoom() {
        var gs = GS(); if (!gs) return null;
        return gs.mapState.currentRoom;
    }

    function isAtCamp() {
        var r = getCurrentRoom();
        return r && r.type === 'camp';
    }

    function getAvailablePaths() {
        var gs = GS(); if (!gs) return [];
        return gs.mapState.discoveryPaths || [];
    }

    return {
        discover: discover,
        generateNextPaths: generateNextPaths
    };
})();
