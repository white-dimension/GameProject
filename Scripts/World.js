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
        var p = gs.player; if (!p) return { success: false, error: '玩家数据异常' };

        // [新增] 突发事件系统触发 (10% 概率)
        // 规则：排除教学区 (B1F & 步数<=1)、Boss 房、传送门、遗物、通关
        var canTriggerEvent = gs.mapState.currentFloor > 1 || gs.mapState.stepsTaken > 1;
        if (canTriggerEvent && target.type !== 'boss' && target.type !== 'portal' && target.type !== 'relic' && target.type !== 'victory' && !gs.mapState._eventActive) {
            if (Math.random() < 0.10 && window.GameData && window.GameData.RANDOM_EVENTS) {
                var eventKeys = Object.keys(window.GameData.RANDOM_EVENTS);
                if (eventKeys.length === 0) { gs.mapState._eventActive = false; } else {
                    var eid = eventKeys[Math.floor(Math.random() * eventKeys.length)];
                    gs.mapState._eventActive = true;
                    window.UISystem.showEventModal(eid, pathIndex);
                    return { success: false, isEvent: true };
                }
            }
        }
        gs.mapState._eventActive = false; // 重置标记

        // 通关路径：直接返回，不触发战斗/奖励逻辑
        if (target.type === 'victory') {
            gs.mapState.currentRoom = { type: 'victory', label: target.label, desc: target.desc };
            return { success: true, room: gs.mapState.currentRoom, events: [] };
        }

        // 标记节点为已消耗
        var poolIndex = target._poolIndex;
        if (poolIndex !== undefined && gs.mapState.floorNodePool && gs.mapState.floorNodePool[poolIndex]) {
            gs.mapState.floorNodePool[poolIndex].exhausted = true;
        } else if (target.id && gs.mapState.floorNodePool) {
            // 兜底：通过节点ID在池中查找匹配项
            for (var i = 0; i < gs.mapState.floorNodePool.length; i++) {
                if (gs.mapState.floorNodePool[i].id === target.id) {
                    gs.mapState.floorNodePool[i].exhausted = true;
                    break;
                }
            }
        }

        // 1. 步进前判定：毒性超载扣血
        if (p.toxicity > 50) {
            p.hp = Math.max(0, p.hp - Math.ceil(p.hp_max * 0.02));
            gs.mapState._toxSteps = (gs.mapState._toxSteps || 0) + 1;
        } else {
            gs.mapState._toxSteps = 0;
        }

        // 2. 游荡Boss遭遇（非营地/传送门/遗物）
        var encChance = (window.GameData.STATUS_CONSTANTS && window.GameData.STATUS_CONSTANTS.encounterChance) || 0.03;
        if (target.type !== 'camp' && target.type !== 'portal' && target.type !== 'relic' && Math.random() < encChance && gs.mapState.stepsTaken > 3) {
            var bosses = ['MON_CH1_TYRANT', 'MON_CH1_QUEEN', 'MON_CH1_CORE'];
            var bossId = bosses[Math.floor(Math.random() * bosses.length)];
            target = {
                type: 'boss',
                wandering: true,
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
            gs.mapState.floorNodePool = window.GameState._genFloorNodePool(gs.mapState.currentFloor, gs);
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

            if (rewardRoll < 0.3) {
                // 组件碎片 x2~3
                if (compNames.length > 0) {
                    var cid = compNames[Math.floor(Math.random() * compNames.length)];
                    var amt = 2 + Math.floor(Math.random() * 2);
                    gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + amt;
                    relicEvent = { type: 'relic', msg: '发现基因遗物！获得 ' + cid + ' ×' + amt };
                }
            } else if (rewardRoll < 0.6) {
                // 基因点数 +20~40
                var bpAmt = 20 + Math.floor(Math.random() * 21);
                p.bp += bpAmt;
                relicEvent = { type: 'relic', msg: '发现基因遗物！获得 ' + bpAmt + ' 基因点数' };
            } else if (rewardRoll < 0.8) {
                // 血量回满
                p.hp = p.hp_max;
                relicEvent = { type: 'relic', msg: '发现远古医疗舱！生命已完全恢复。' };
            } else if (rewardRoll < 0.95 && p.toxicity > 0) {
                // 毒性清零（仅在有毒时出现）
                p.toxicity = 0;
                relicEvent = { type: 'relic', msg: '发现净化矩阵！体内毒性已彻底中和。' };
            } else if (rewardRoll < 0.95 && p.toxicity <= 0) {
                // 没毒时奖励 RAM 恢复
                p.process = p.process_max;
                relicEvent = { type: 'relic', msg: '发现能量基站！进程能量已超量回充。' };
            } else {
                // 5% 概率获得 Boss 器官（从全部世界Boss中随机）
                var allMonsters = window.GameData.MONSTERS || {};
                var bossPool = [];
                Object.keys(allMonsters).forEach(function(k) {
                    var m = allMonsters[k];
                    if (m && m.tier === 'world_boss' && m.drop && m.drop.type === 'organ') {
                        bossPool.push(m);
                    }
                });
                if (bossPool.length > 0) {
                    var bm = bossPool[Math.floor(Math.random() * bossPool.length)];
                    gs.inventory.organs.push(bm.drop.id);
                    relicEvent = { type: 'relic', msg: '【异常反应】！从遗迹中剥离出：' + bm.drop.id };
                } else {
                    p.bp += 100;
                    relicEvent = { type: 'relic', msg: '发现高价值核心！获得 100 基因点数' };
                }
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
            p.process = p.process_max; // 回复进程
            p._potionHistory = [];
            p._potionHistoryTick = 0;
            events.push({ type: 'camp_arrive', msg: '抵达中立细胞核。生命、进程已回满，毒性清零。' });
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

        window.GameState.save();

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
