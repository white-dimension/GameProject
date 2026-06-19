/**
 * Combat.js — v3.1 战术连招引擎 (修复 进程 同步与战斗闭环)
 */
window.CombatSystem = (function () {
    'use strict';
    var GS = function () { return window.GameState.getState(); };
    var GD = function () { return window.GameData; };

    var _battleState = null;

    function startBattle(monsterId, options) {
        var gs = GS(); if (!gs) return;
        // 支持单怪物（字符串）或多怪物（数组）
        var ids = Array.isArray(monsterId) ? monsterId : [monsterId];
        var scale = window.GameState.getMapLevelScaling(gs);
        var monsters = [];
        for (var i = 0; i < ids.length; i++) {
            var m = GD().MONSTERS[ids[i]]; if (!m) continue;
            var hpScaled = Math.ceil(m.hp * scale.hpMul);
            var atkScaled = Math.ceil(m.atk * scale.atkMul);
            var defScaled = Math.ceil(m.def * scale.defMul);
            monsters.push({
                id: ids[i], name: m.name, hp: hpScaled, hpMax: hpScaled,
                atk: atkScaled, def: defScaled,
                _scaleAtk: scale.atkMul,
                intent: _generateIntent(m), status: {},
                affixes: [] // [新增] 维度词缀
            });
        }
        if (monsters.length === 0) return;

        // [新增] Loop 2+ 怪物词缀分配
        if (gs.mapState.loop >= 2) {
            var affixPool = [
                { id: 'thorns', name: '反馈', desc: '反弹 10% 伤害', color: 'var(--accent-red)' },
                { id: 'regen', name: '再生', desc: '每回合恢复 5% HP', color: 'var(--accent-green)' },
                { id: 'berserk', name: '死誓', desc: '伤害+50%，但每回合扣 5% HP', color: 'var(--accent-orange)' },
                { id: 'jammer', name: '扰频', desc: '玩家每回合进程回复 -1', color: 'var(--accent-blue)' }
            ];
            monsters.forEach(function(mon) {
                var mData = GD().MONSTERS[mon.id];
                if (mData.tier === 'elite' || mData.tier === 'world_boss') {
                    var aff = affixPool[Math.floor(Math.random() * affixPool.length)];
                    mon.affixes.push(aff);
                    if (aff.id === 'berserk') mon._atkMult = (mon._atkMult || 1) * 1.5;
                }
            });
        }

        _battleState = {
            monsters: monsters,
            currentTarget: 0,
            turn: 1,
            phase: 'player_turn',
            log: [{ turn: 1, msg: '第 1 回合开始。' + (monsters.length > 1 ? ' 前方 ' + monsters.length + ' 只变异体！' : '') }],
            isDungeon: !!(options && options.isDungeon),
            isWandering: !!(options && options.wandering),
            dungeonEnv: (options && options.env) || null,
            pathAffix: (options && options.pathAffix) || null, // [新增] 接收路径词缀
            shieldAmount: 0,
            playerProcess: gs.player.process,
            playerStatus: {},
            playerRaces: [gs.player.masteries[0], gs.player.masteries[1], gs.player.masteries[2]].filter(function(r) { return r; })
        };

        // [新增] 应用路径感官词缀效果
        if (_battleState.pathAffix) {
            var af = _battleState.pathAffix;
            _log('<span style="color:' + af.color + '">【感官共鸣】' + af.name + '：' + af.desc + '</span>');

            if (af.id === 'high_process') {
                _battleState.playerProcess = Math.min(gs.player.process_max, _battleState.playerProcess + 2);
                _log('<span style="color:var(--accent-green)">神经突触激活，初始进程 +2。</span>');
            }
            else if (af.id === 'weak_bio') {
                _battleState.monsters.forEach(function(m) {
                    var loss = Math.ceil(m.hp * 0.2);
                    m.hp -= loss;
                    _log('<span style="color:var(--accent-red)">辐射削弱了 ' + m.name + '，生命损失 ' + loss + '。</span>');
                });
            }
            else if (af.id === 'corrosive') {
                _battleState.monsters.forEach(function(m) {
                    m.status['poison'] = 3;
                    _log('<span style="color:var(--accent-purple)">酸蚀蔓延，' + m.name + ' 已处于中毒状态。</span>');
                });
            }
        }

        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.startTox) {
            _battleState._toxAdded = _battleState.dungeonEnv.effect.startTox;
            gs.player.toxicity += _battleState._toxAdded;
            _log('<span style="color:var(--accent-purple)">环境异变：初始毒性 +' + _battleState._toxAdded + '。</span>');
        }
        if (_battleState.dungeonEnv) {
            _log('<span style="color:var(--accent-blue)">环境代码：' + _battleState.dungeonEnv.name + '（' + _battleState.dungeonEnv.desc + '）</span>');
        }

        // 判定双专精被动
        _applyGlobalPassives(gs.player);
        // 缓存组件效果供 UI 展示
        _battleState.componentEffects = _getComponentEffects();

        window.UISystem.render();
        if (window.Sound) window.Sound.monster();
        if (window.Sound) window.Sound.playBattleBGM();
    }

    // 获取当前目标怪物数据
    function _getMonster() {
        if (!_battleState || !_battleState.monsters) return null;
        return _battleState.monsters[_battleState.currentTarget] || null;
    }

    function _getMonsterData() {
        var m = _getMonster(); if (!m) return null;
        return GD().MONSTERS[m.id] || null;
    }

    function _allMonstersDead() {
        if (!_battleState || !_battleState.monsters) return true;
        for (var i = 0; i < _battleState.monsters.length; i++) {
            if (_battleState.monsters[i].hp > 0) return false;
        }
        return true;
    }

    function _getAliveMonsters() {
        if (!_battleState || !_battleState.monsters) return [];
        return _battleState.monsters.filter(function(m) { return m.hp > 0; });
    }

    function selectTarget(index) {
        if (!_battleState || !_battleState.monsters) return;
        var alive = _getAliveMonsters();
        if (alive.length === 0) return;
        if (index >= 0 && index < _battleState.monsters.length && _battleState.monsters[index].hp > 0) {
            _battleState.currentTarget = index;
        } else {
            for (var i = 0; i < _battleState.monsters.length; i++) {
                if (_battleState.monsters[i].hp > 0) { _battleState.currentTarget = i; break; }
            }
        }
        window.UISystem.render();
    }

    function playCard(slot, potionId) {
        if (!_battleState || _battleState.phase !== 'player_turn' || _battleState._fleeing) return;
        var gs = GS(); var p = gs.player;

        // --- 1. 魔药逻辑 ---
        if (potionId) {
            var pot = GD().POTIONS[potionId];
            var idx = gs.inventory.potions.indexOf(potionId);
            if (!pot || idx === -1) return;

            gs.inventory.potions.splice(idx, 1);
            p.toxicity += pot.toxicity;
            p._potionsUsed = (p._potionsUsed || 0) + 1;
            // 耐药性衰减：基于全局历史记录
            var consec = 0;
            var history = p._potionHistory || [];
            for (var hi = history.length - 1; hi >= 0; hi--) { if (history[hi] === potionId) consec++; else break; }
            var decayFactor = Math.max(0.3, Math.pow(0.7, consec));
            if (!p._potionHistory) p._potionHistory = [];
            p._potionHistory.push(potionId);
            if (p._potionHistory.length > 10) p._potionHistory.shift();

            _log('<span style="color:var(--accent-purple)">使用了 ' + pot.name + '。</span>毒性增加至 ' + p.toxicity + (consec > 0 ? ' (耐药效能' + Math.round(decayFactor * 100) + '%)' : ''));

            window.UISystem.showDamageFloat('<span class="icon icon-biohazard"></span>', 'var(--accent-purple)', 'player');

            if (pot.id === 'POT_BERSERK') { _battleState.playerStatus['berserk'] = 99; if (consec > 0) _battleState.playerStatus['berserkMult'] = decayFactor; }
            else if (pot.id === 'POT_ANTIDOTE') {
                var curM2 = _getMonster();
                var md2 = _getMonsterData();
                if (curM2) {
                    // 哨兵蓄力期免疫物理控制
                    if (md2 && md2.immuneToPhysicalCC) { _log(curM2.name + ' 免疫物理控制。'); }
                    else {
                        // 神经阻断剂：普通/精英100%成功率，Boss 60%
                        var stunChance = (md2 && md2.tier === 'world_boss') ? 0.6 : 1.0;
                        stunChance *= decayFactor;
                        if (md2 && md2.drugResist) { stunChance *= (1 - md2.drugResist); }

                        if (Math.random() < stunChance) {
                            curM2.intent = { label: '<span class="icon icon-time-trap"></span> 行动延后', type: 'stun' };
                            _log('<span style="color:var(--accent-purple);">神经抑制生效：' + curM2.name + ' 行动被延后。</span>');
                        }
                        else {
                            _log('<span style="color:var(--text-dim);">' + curM2.name + ' 判定抗性通过，神经抑制失败。</span>');
                        }
                    }
                }
                _battleState._noProcessRecovery = true;
            }
            else if (pot.id === 'POT_SHIELD_CORE') { _battleState.shieldAmount = (_battleState.shieldAmount || 0) + Math.ceil(p.hp_max * 0.4 * decayFactor); _battleState._toxResistDebuff = true; }
            else if (pot.id === 'POT_HEAL') { p.hp = Math.min(p.hp_max, p.hp + Math.ceil(p.hp_max * 0.4 * decayFactor)); _battleState.playerStatus['defDebuff'] = 3; _log('<span style="color:var(--accent-green)">凝血再生！防御暂时下降。</span>'); window.UISystem.showDamageFloat('+' + Math.ceil(p.hp_max * 0.4), 'var(--accent-green)', 'player'); }
            else if (pot.id === 'POT_DEFENSE') { _battleState.playerStatus['defBoost'] = 3; _battleState.playerStatus['atkDebuff'] = 3; _log('<span style="color:var(--accent-blue)">表皮硬化！防御提升，攻击下降。</span>'); }
            else if (pot.id === 'POT_RAM') { _battleState.playerProcess = Math.min(GS().player.process_max, _battleState.playerProcess + 5); GS().player.process = _battleState.playerProcess; p.toxicity += 10; _log('<span style="color:var(--accent-green)">进程回复 5 点，毒性 +10。</span>'); }

            window.UISystem.render();
            return;
        }

        // --- 2. 技能逻辑 ---
        var baseCost = (slot === 'predatory_organ' ? 2 : 3);
        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.ramPenalty) {
            baseCost += _battleState.dungeonEnv.effect.ramPenalty;
        }
        var cost = baseCost + (_battleState._processPenalty || 0);
        if (_battleState._processPenalty) _battleState._processPenalty = 0; // 单次消耗后重置
        // 电子真菌：毒技能 35% 免 进程
        if (slot === 'gland_core' && _battleState.dualKey === 'ember+swarm' && Math.random() < 0.35) {
            cost = 0;
            _log('<span style="color:var(--accent-yellow)">【触突过载】电荷偏转！本次不消耗 进程。</span>');
        }
        if (_battleState.playerProcess < cost) return;

        _battleState.playerProcess -= cost;
        p.process = _battleState.playerProcess; // 强制写回 GameState 确保顶部 HUD 同步

        _executePlayerSkill(slot);
        if (_battleState) window.UISystem.render();
    }

    function _getComponentEffects() {
        var p = GS().player; if (!p) return {};
        var comps = GD().COMPONENTS || {};
        var effects = { armorPen: 0, bonusVsSwarm: 0, toxinConv: 0, lifeDrainChance: 0, lifeDrainAmt: 0, dotBonus: 0, thornsPct: 0, killHeal: 0, deathDefy: false, processOnHit: 0, critChance: 0, critMultiplier: 1.5, poisonImmune: false };
        ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function(sn) {
            var slot = p[sn]; if (!slot || !slot.component_slots) return;
            slot.component_slots.forEach(function(cid) {
                if (!cid || !comps[cid]) return;
                var a = comps[cid].affixes; if (!a) return;
                if (a.armorPenetration) effects.armorPen += a.armorPenetration;
                if (a.bonusVsSwarm) effects.bonusVsSwarm += a.bonusVsSwarm;
                if (a.toxinConversion) effects.toxinConv += a.toxinConversion;
                if (a.lifeDrainChance) { effects.lifeDrainChance = Math.max(effects.lifeDrainChance, a.lifeDrainChance); }
                if (a.lifeDrainAmount) effects.lifeDrainAmt += a.lifeDrainAmount;
                if (a.dotBonus) effects.dotBonus += a.dotBonus;
                if (a.thornsPercent) effects.thornsPct += a.thornsPercent;
                if (a.killHeal) effects.killHeal += a.killHeal;
                if (a.deathDefy) effects.deathDefy = true;
                if (a.processOnHit) effects.processOnHit += a.processOnHit;
                if (a.critChance) { effects.critChance = Math.max(effects.critChance, a.critChance); }
                if (a.critMultiplier) effects.critMultiplier = Math.max(effects.critMultiplier, a.critMultiplier);
                if (a.poisonImmune) effects.poisonImmune = true;
            });
        });
        return effects;
    }

    function _executePlayerSkill(slot) {
        var gs = GS(); var p = gs.player;
        var m = _getMonsterData();
        var curMon = _getMonster();
        var baseAtk = p.atk;
        var damage = 0;
        var ignoreDef = false;

        window.UISystem.triggerShake('monster-icon');
        if (window.Sound) { if (slot === 'gland_core') window.Sound.electric(); else window.Sound.attack(); }
        if (_battleState.playerStatus['berserk']) {
            var berserkMult = _battleState.playerStatus['berserkMult'] || 1.0;
            baseAtk = Math.ceil(baseAtk * (1 + 0.5 * berserkMult));
        }
        if (_battleState.playerStatus['atkDebuff']) { baseAtk = Math.ceil(baseAtk * 0.8); }

        // --- 环境衰减 ---
        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.nonEmberAtkMult) {
            var isEmberSkill = (p.masteries[0] === 'ember' || p.masteries[1] === 'ember') && slot === 'gland_core';
            if (!isEmberSkill) {
                baseAtk = Math.ceil(baseAtk * _battleState.dungeonEnv.effect.nonEmberAtkMult);
            }
        }

        // --- 种族克制矩阵（基础机制，不依赖双专精） ---
        var counterBonus = 0;
        if (m && m.race) {
            var counterRaces = [];
            if (p.masteries[0]) counterRaces.push(p.masteries[0]);
            if (p.masteries[1]) counterRaces.push(p.masteries[1]);
            var hasCounter = false;
            for (var ci = 0; ci < counterRaces.length; ci++) {
                if ((counterRaces[ci] === 'mutant' && m.race === 'swarm') ||
                    (counterRaces[ci] === 'swarm' && m.race === 'ember') ||
                    (counterRaces[ci] === 'ember' && m.race === 'mutant')) { hasCounter = true; break; }
            }
            if (hasCounter) counterBonus = (GD().STATUS_CONSTANTS && GD().STATUS_CONSTANTS.counterBonus) || 0.5;
        }

        // [新增] 研究等级 2 奖励：伤害提升 10%
        var researchBonus = 1.0;
        if (gs.bestiary && gs.bestiary.researchLevels && gs.bestiary.researchLevels[curMon.id] >= 2) {
            researchBonus = 1.1;
        }

        if (slot === 'predatory_organ') {
            var sData = p[slot];
            var syncLvl = gs.inventory.organSyncLevels[sData.equipped] || 1;
            var tierFactor = 1 + (sData.tier - 1) * 0.1 * syncLvl;

            damage = Math.ceil(baseAtk * researchBonus * tierFactor);

            // Boss 特效：暴君核心 (Lv.3 觉醒：真实伤害)
            if (sData.equipped === '暴君核心') {
                if (syncLvl >= 3) {
                    ignoreDef = true;
                    _log('<span style="color:var(--accent-red)">【暴君觉醒】原体释放终极撕裂，无视目标防御！</span>');
                }
            }

            // 涂层：细胞壁溶解酶（反异变）
            if (p.activeCoating === 'COAT_ANTI_MUTANT' && m && m.race === 'mutant') {
                damage = Math.ceil(damage * 1.5);
                ignoreDef = true;
            }
            // 涂层：生物自溶催化剂（反寄生 — 全伤+20% + 毒素+40%）
            if (p.activeCoating === 'COAT_ANTI_SWARM' && m && m.race === 'swarm') {
                damage = Math.ceil(damage * 1.6);
            }
            // 涂层：电磁短路脉冲液（反机械 — 全伤+30% + 拆盾50）
            if (p.activeCoating === 'COAT_ANTI_EMBER' && m && m.race === 'ember') {
                damage = Math.ceil(damage * 1.3);
                curMon._shield = Math.max(0, (curMon._shield || 0) - 50);
            }

            // Boss器官：暴君核心
            if (p.predatory_organ.equipped === '暴君核心') {
                damage = Math.ceil(damage * 2.5);
                ignoreDef = true;
            }

            // 种族克制
            if (counterBonus > 0) { damage = Math.ceil(damage * (1 + counterBonus)); }

            // 源初毁灭者
            if (_battleState.dualKey === 'mutant+mutant') {
                damage = Math.ceil(damage * 1.4);
                ignoreDef = true;
            }

            // 挂毒与电离标记（两步：先标记，下次命中再引爆）
            if (m && m.race === 'ember') {
                if (curMon.status['ionized']) {
                    // 已有电离标记 → 引爆
                    delete curMon.status['ionized'];
                    var shieldStrip = curMon._shield || 0;
                    curMon._shield = 0;
                    var splash = Math.ceil(damage * 0.5);
                    _log('<span style="color:var(--accent-blue)">>> [电荷传导] 连招触发！剥离 ' + shieldStrip + ' 护盾，传导造成 ' + splash + ' 溅射伤害。</span>');
                    _getAliveMonsters().forEach(function(om) {
                        if (om !== curMon) { om.hp = Math.max(0, om.hp - splash); window.UISystem.showDamageFloat('-' + splash, 'var(--accent-blue)', 'monster'); }
                    });
                } else {
                    // 首次命中 → 施加电离标记（下次命中引爆）
                    curMon.status['ionized'] = true;
                    _log('<span style="color:var(--accent-blue)">捕食打击造成电荷残留：目标已被【电离标记】。</span>');
                }
            }

            // 挂毒：30%概率
            if (Math.random() < 0.3) {
                curMon.status['poison'] = 3;
                _log('<span style="color:var(--accent-red)">发起捕食打击：' + damage + '点伤害</span>，注入毒素标记。');
            } else {
                _log('<span style="color:var(--accent-red)">发起捕食打击，造成 ' + damage + ' 点物理伤害。</span>');
            }

            // 生物崩解积攒
            if (m && m.race === 'swarm') {
                curMon._compTicks = (curMon._compTicks || 0) + 1;
                if (curMon._compTicks >= 2) {
                    curMon.status['compromised'] = 3;
                    _log('<span style="color:var(--accent-yellow)">连续打击生效：目标已被【生物崩解标记】。</span>');
                    curMon._compTicks = 0;
                }
            }
        } else if (slot === 'gland_core') {
            var sData3 = p[slot];
            var syncLvl3 = gs.inventory.organSyncLevels[sData3.equipped] || 1;
            var tierFactor3 = 1 + (sData3.tier - 1) * 0.1 * syncLvl3;

            // Boss器官：蜂后髓核
            if (p.gland_core.equipped === '蜂后髓核') {
                damage = Math.ceil(baseAtk * 3 * tierFactor3);
                var healMsg = '汲取 ' + damage + ' HP';
                // Lv.3 觉醒：额外吸取护盾
                if (syncLvl3 >= 3) {
                    var stolenShield = Math.ceil(damage * 0.5);
                    _battleState.shieldAmount += stolenShield;
                    healMsg += ' 并生成 ' + stolenShield + ' 护盾';
                }
                _log('<span style="color:var(--accent-yellow)">>> [母体孵化] 召唤集群突袭！造成 ' + damage + ' 点伤害。' + healMsg + '</span>');
                p.hp = Math.min(p.hp_max, p.hp + damage);
                window.UISystem.showDamageFloat('+' + damage, 'var(--accent-green)', 'player');
            }
            // Boss器官：高能电泳核 — 电离穿透，无视防御
            else if (p.gland_core.equipped === '高能电泳核') {
                damage = Math.ceil(baseAtk * 2.0 * tierFactor3);
                ignoreDef = true;
                // Lv.3 觉醒：连锁全场
                if (syncLvl3 >= 3) {
                    var others = _getAliveMonsters().filter(function(m2) { return m2 !== curMon; });
                    others.forEach(function(om) {
                        var splash = Math.ceil(damage * 0.5);
                        om.hp = Math.max(0, om.hp - splash);
                        _log('<span style="color:var(--accent-blue)">>> [闪电链] 溅射伤害 ' + splash + ' 点。</span>');
                    });
                }
                _log('<span style="color:var(--accent-blue)">>> [电弧过载风暴] 释放高压电弧！造成 ' + damage + ' 点电离伤害。</span>');
            }
            else if (curMon.status['poison']) {
                damage = baseAtk * 3;
                delete curMon.status['poison'];
                var heal = damage;
                p.hp = Math.min(p.hp_max, p.hp + heal);
                _log('<span style="color:var(--accent-yellow)">>> [基因融毁] 触发连招爆破！造成 ' + damage + ' 点伤害</span>，<span style="color:var(--accent-green)">吸取 ' + heal + ' HP</span>。');
                window.UISystem.showDamageFloat('+' + heal, 'var(--accent-green)', 'player');
            }
            else if (curMon.status['compromised']) {
                // [连招] 生物崩解 -> 腺体脉冲 (引爆：禁闪避+易伤)
                damage = Math.ceil(baseAtk * 2 * tierFactor3);
                curMon._dodging = false;
                curMon._vulnerable = 2; // 易伤 2 回合
                delete curMon.status['compromised'];
                _log('<span style="color:var(--accent-yellow)">>> [生物崩解] 连招触发！目标闪避归零，陷入易伤状态。造成 ' + damage + ' 点伤害。</span>');
            }
            else {
                damage = Math.ceil(baseAtk * 0.5);
                _log('<span style="color:var(--accent-yellow)">腺体脉冲造成 ' + damage + ' 点轻微酸蚀。</span>');
            }
        } else if (slot === 'chitin_epidermis') {
            var shield = Math.ceil(baseAtk * 0.6);
            _battleState.shieldAmount += shield;
            _log('<span style="color:var(--accent-green)">生物增殖，获得 ' + shield + ' 点防御护盾。</span>');
            window.UISystem.showDamageFloat('<span class="icon icon-energy-shield"></span>' + shield, 'var(--accent-green)', 'player');
            return;
        }

        // --- 蜂后闪避：100% 闪避 ---
        if (curMon._dodging) {
            _log(m.name + ' 正在产卵闪避中！攻击落空。');
            window.UISystem.showDamageFloat('闪避', 'var(--accent-yellow)', 'monster');
            return;
        }
        // --- 怪物护盾吸收（每只独立）---
        if ((curMon._shield || 0) > 0) {
            var absorbed = Math.min(curMon._shield, damage);
            curMon._shield -= absorbed;
            damage -= absorbed;
            if (absorbed > 0) _log('<span style="color:var(--accent-blue);">护盾吸收 ' + absorbed + ' 点伤害。</span>');
        }
        // 物理抗性（暴君皮肤免疫50%物理伤害）
        if (slot === 'predatory_organ' && m && m.physicalResist) {
            damage = Math.ceil(damage * (1 - m.physicalResist));
        }

        // [连招] 易伤修正
        if (curMon._vulnerable) {
            damage = Math.ceil(damage * 1.5);
            _log('<span style="color:var(--accent-red)">易伤修正：伤害提升 50%。</span>');
        }
        // --- 组件词条：种族增伤 ---
        var compFx = _getComponentEffects();
        if (compFx.bonusVsSwarm > 0 && m && m.race === 'swarm') {
            damage = Math.ceil(damage * (1 + compFx.bonusVsSwarm));
        }
        // --- 组件破甲：减少怪物有效防御 ---
        var effDef = (curMon ? (curMon.def || 0) : (m ? (m.def || 0) : 0)) + (curMon ? (curMon._defBuff || 0) : 0);
        if (compFx.armorPen > 0) { effDef = Math.max(0, effDef * (1 - compFx.armorPen)); }
        var breakdown = '';
        if (!ignoreDef && effDef > 0) {
            var reduction = window.GameState.calcDamageReduction(effDef);
            var afterRed = Math.ceil(damage * (1 - reduction));
            var redVal = damage - afterRed;
            damage = afterRed;
            breakdown = ' (' + (damage + redVal) + '原始 - ' + redVal + '防御)';
        }

        // 暴击判定
        if (compFx.critChance > 0 && Math.random() < compFx.critChance) {
            damage = Math.ceil(damage * compFx.critMultiplier);
            _log('<span style="color:var(--accent-yellow)">暴击！伤害 ×' + compFx.critMultiplier.toFixed(1) + '！</span>');
        }

        curMon.hp = Math.max(0, curMon.hp - damage);

        // [新增] 维度词缀：反馈 (Thorns)
        if (curMon.affixes && curMon.affixes.some(function(a){return a.id==='thorns';})) {
            var reflect = Math.ceil(damage * 0.1);
            p.hp = Math.max(0, p.hp - reflect);
            _log('<span style="color:var(--accent-red)">【反馈】目标反弹了 ' + reflect + ' 点伤害！</span>');
            window.UISystem.showDamageFloat('-' + reflect, 'var(--accent-red)', 'player');
        }

        // 毒素转化：额外侵蚀（所有技能均可触发）
        if (compFx.toxinConv > 0 && damage > 0) {
            var toxinExtra = Math.ceil(damage * compFx.toxinConv);
            curMon.hp = Math.max(0, curMon.hp - toxinExtra);
            _log('<span style="color:var(--accent-purple)">毒素转化额外造成 ' + toxinExtra + ' 点侵蚀。</span>');
        }
        _log('<span style="color:var(--accent-red)">>> 发起攻击：造成 ' + damage + breakdown + ' 点伤害。</span>');
        window.UISystem.showDamageFloat('-' + damage, 'var(--accent-red)', 'monster');
        if (curMon.hp <= 0) {
            selectTarget(0);
            _log('<span style="color:var(--accent-red)">' + curMon.name + ' 已融毁。</span>');
            if (compFx.killHeal > 0) {
                var healAmt = compFx.killHeal;
                p.hp = Math.min(p.hp_max, p.hp + healAmt);
                _log('<span style="color:var(--accent-green)">肾上腺素晶体：击杀回复 ' + healAmt + ' HP。</span>');
                window.UISystem.showDamageFloat('+' + healAmt, 'var(--accent-green)', 'player');
            }
        }
        if (_allMonstersDead()) { _winBattle(); return; }
    }

    function endTurn() {
        if (!_battleState || _battleState.phase !== 'player_turn' || _battleState._fleeing) return;
        _battleState.phase = 'monster_turn';
        _log('<span style="color:var(--accent-orange)">--- 第 ' + _battleState.turn + ' 回合结束 ---</span>');
        _battleState.turn++; // 统一在回合结束时自增，确保玩家和怪物处于同回合
        _processStatusEffects();
        window.UISystem.render();
        setTimeout(_monsterAction, 800);
    }

    function _monsterAction() {
        if (!_battleState || _battleState.phase !== 'monster_turn') return;
        // 训练模式：人偶不行动，直接切回玩家回合
        if (_battleState._isTraining) { _log('<span class="txt-dim">训练人偶待命中...</span>'); _finishMonsterTurn(); return; }
        var p = GS().player;

        var alive = _getAliveMonsters();
        if (alive.length === 0) { _winBattle(); return; }

        // 处理毒性（跳过第1回合，World.js 已扣过步进伤害）
        // 跳过第1回合：World.js 已扣过步进伤害（_battleState.turn 已增至2，故 > 1 才扣）
        if (p.toxicity > 50 && _battleState.turn > 1) {
            var od = Math.ceil(p.hp_max * 0.02 * (_battleState._toxResistDebuff ? 1.2 : 1.0));
            p.hp = Math.max(0, p.hp - od);
            _log('<span style="color:var(--accent-purple)">[基因自溶] 体内毒素爆发，损失 ' + od + ' HP。' + (_battleState._toxResistDebuff ? '（毒素抗性削弱）' : '') + '</span>');
        }

        _log('<span style="color:var(--accent-orange)">>>> 第 ' + _battleState.turn + ' 回合开始。</span>');

        var processMonster = function(idx) {
            if (idx >= alive.length) {
                // 所有怪物行动完毕
                _finishMonsterTurn();
                return;
            }
            var mon = alive[idx];
            // 反伤/反噬可能导致怪物在轮到它行动前死亡，跳过
            if (mon.hp <= 0) { processMonster(idx + 1); return; }
            var md = GD().MONSTERS[mon.id];
            if (!md) { _log('<span style="color:var(--accent-red);">[错误] 未知怪物数据: ' + mon.id + '，已跳过。</span>'); processMonster(idx + 1); return; }
            var intent = mon.intent;

            if (intent.type === 'stun') {
                _log('<span style="color:var(--text-dim);">' + mon.name + ' 处于神经抑制状态，跳过回合。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                setTimeout(function() { processMonster(idx + 1); }, 400);
            } else if (intent.type === 'shield') {
                mon._shield = (mon._shield || 0) + (intent.value || 0);
                _log('<span style="color:var(--accent-blue);">' + mon.name + ' 获得 ' + intent.value + ' 护盾。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                setTimeout(function() { processMonster(idx + 1); }, 300);
            } else if (intent.type === 'drain') {
                var drainAmt = Math.ceil((intent.value || 0) * (mon._scaleAtk || 1));
                p.hp = Math.max(0, p.hp - drainAmt);
                _log('<span style="color:var(--accent-purple);">' + mon.name + ' 吸取 ' + drainAmt + ' 生命。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                if (p.hp <= 0) { _doDefeat(); } else { setTimeout(function() { processMonster(idx + 1); }, 300); }
            } else if (intent.type === 'summon' || intent.type === 'spawn') {
                var summonDmg = Math.ceil((intent.summonCount || 0) * (intent.summonDamage || 0) * (mon._scaleAtk || 1));
                if (summonDmg > 0) { p.hp = Math.max(0, p.hp - summonDmg); _log('<span style="color:var(--accent-yellow);">' + mon.name + ' 召唤集群造成 ' + summonDmg + ' 点伤害。</span>'); }
                else { _log('<span style="color:var(--accent-yellow);">' + mon.name + ' 正在集结力量...</span>'); }
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                if (p.hp <= 0) { _doDefeat(); } else { setTimeout(function() { processMonster(idx + 1); }, 300); }
            } else if (intent.type === 'charge') {
                if (!mon._charged) {
                    mon._charged = true;
                    _log('<span style="color:var(--accent-orange);">' + mon.name + ' 正在蓄力，下回合释放！</span>');
                } else {
                    mon._charged = false;
                    var rawDmgC = Math.ceil((intent.value || 0) * (mon._scaleAtk || 1));
                    var playerRedC = window.GameState.calcDamageReduction(p.def || 0);
                    var dmgC = Math.ceil(rawDmgC * (1 - playerRedC));
                    var finalDmgC = Math.max(0, dmgC - (_battleState.shieldAmount || 0));
                    _battleState.shieldAmount = Math.max(0, (_battleState.shieldAmount || 0) - dmgC);
                    p.hp = Math.max(0, p.hp - finalDmgC);
                    _log('<span style="color:var(--accent-orange);">' + mon.name + ' 蓄力释放！造成 ' + finalDmgC + ' 点伤害。</span>');
                    window.UISystem.triggerShake('app');
                    if (finalDmgC > 0) window.UISystem.showDamageFloat('-' + finalDmgC, 'var(--accent-red)', 'player');
                }
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                if (p.hp <= 0) { _doDefeat(); } else { setTimeout(function() { processMonster(idx + 1); }, 300); }
            } else if (intent.type === 'scan') {
                _battleState._processPenalty = (_battleState._processPenalty || 0) + (intent.ramPenalty || 1);
                _log('<span style="color:var(--accent-blue);">' + mon.name + ' 扫描干扰！下回合卡牌费用 +' + (intent.ramPenalty || 1) + '。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                if (p.hp <= 0) { _doDefeat(); } else { setTimeout(function() { processMonster(idx + 1); }, 300); }
            } else {
                // 伤害类意图：physical / toxin / electric / enrage
                var rawDmg = Math.ceil((intent.value || 0) * (mon._atkMult || 1) * (mon._scaleAtk || 1));
                var origDmg = rawDmg;

                // 游荡 Boss 脱离惩罚：非地下城中的游荡遭遇每回合 ×3 倍伤害
                if (md.tier === 'world_boss' && _battleState.isWandering && _battleState.turn > 1) {
                    rawDmg *= 3;
                    origDmg = rawDmg;
                }

                var effDef = p.def || 0;
                if (_battleState.playerStatus['defBoost']) effDef = Math.ceil(effDef * 1.5);
                if (_battleState.playerStatus['defDebuff']) effDef = Math.ceil(effDef * 0.8);
                var playerReduction = window.GameState.calcDamageReduction(effDef);
                var afterDef = Math.ceil(rawDmg * (1 - playerReduction));
                var defReduced = Math.floor(rawDmg * playerReduction);

                var finalDmg;
                var breakdown = '';

                if (intent.type === 'toxin') {
                    // 解毒酶结晶 / 涂层抗毒免疫
                    var poisonImmuneFlag = _getComponentEffects().poisonImmune;
                    if ((p.activeCoating === 'COAT_ANTI_SWARM' && md && md.race === 'swarm') || poisonImmuneFlag) {
                        finalDmg = 0;
                        _log('<span style="color:var(--accent-green);">毒素被' + (poisonImmuneFlag ? '解毒酶结晶' : '涂层') + '中和。</span>');
                    } else {
                        // 毒素无视护盾
                        finalDmg = afterDef;
                        p.hp = Math.max(0, p.hp - finalDmg);
                        breakdown = finalDmg + ' (' + origDmg + '原始 - ' + defReduced + '防御)';
                        _log('<span style="color:var(--accent-purple);">' + mon.name + ' 喷射毒素造成 ' + breakdown + ' 点伤害。（无视护盾）</span>');
                    }
                } else {
                    var absorbed = Math.min(_battleState.shieldAmount || 0, afterDef);
                    finalDmg = Math.max(0, afterDef - absorbed);
                    _battleState.shieldAmount = Math.max(0, (_battleState.shieldAmount || 0) - afterDef);

                    if (_battleState.dualKey === 'ember+mutant') {
                        var shieldGain = Math.ceil(p.def * 0.3);
                        _battleState.shieldAmount = (_battleState.shieldAmount || 0) + shieldGain;
                        _battleState.playerProcess = Math.min(GS().player.process_max, _battleState.playerProcess + 1);
                        GS().player.process = _battleState.playerProcess;
                    }

                    // 战败补偿减伤：每层 10%
                    var adaptBonus = Math.min(0.3, (p.bossFailCount || 0) * 0.1);
                    var afterAdapt = Math.ceil(finalDmg * (1 - adaptBonus));
                    var adaptReduced = finalDmg - afterAdapt;
                    finalDmg = afterAdapt;
                    if (adaptReduced > 0) {
                        breakdown = breakdown.replace(')', ' - ' + adaptReduced + '自适应)');
                        _log('<span style="color:var(--accent-green)">【基因自适应】减免了 ' + adaptReduced + ' 点伤害。</span>');
                    }

                    p.hp = Math.max(0, p.hp - finalDmg);
                    breakdown = finalDmg + ' (' + origDmg + '原始 - ' + defReduced + '防御' + (absorbed > 0 ? ' - ' + absorbed + '护盾' : '') + ')';
                    _log('<span style="color:var(--accent-red);">' + mon.name + ' 对你造成 ' + breakdown + ' 点伤害。</span>');
                }
                window.UISystem.triggerShake('app');
                if (window.Sound) window.Sound.hit();
                if (finalDmg > 0) window.UISystem.showDamageFloat('-' + finalDmg, 'var(--accent-red)', 'player');
                // 神经突触结：受击回复进程
                var cfx3 = _getComponentEffects();
                if (cfx3.processOnHit > 0 && finalDmg > 0) {
                    _battleState.playerProcess = Math.min(GS().player.process_max, _battleState.playerProcess + cfx3.processOnHit);
                    GS().player.process = _battleState.playerProcess;
                    _log('<span style="color:var(--accent-green)">神经突触激活，受击回复 ' + cfx3.processOnHit + ' 进程。</span>');
                }
                // 组件反伤
                var cfx2 = _getComponentEffects();
                if (cfx2.thornsPct > 0 && rawDmg > 0) {
                    var thornDmg = Math.ceil(rawDmg * cfx2.thornsPct);
                    mon.hp = Math.max(0, mon.hp - thornDmg);
                    _log('<span style="color:var(--accent-blue)">电磁反伤！' + mon.name + ' 受到 ' + thornDmg + ' 点反击伤害。</span>');
                    window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + thornDmg, 'var(--accent-blue)', 'monster');
                    if (_allMonstersDead()) { _winBattle(); return; }
                }
                // 流血（机械余烬免疫）
                if (intent.bleed && !md.bleedImmune) { _battleState.playerStatus['bleed'] = intent.bleed.duration || 3; _log('<span style="color:var(--accent-red);">施加流血 ' + intent.bleed.duration + ' 回合。</span>'); }
                // 自防buff
                if (intent.selfDefBuff) { mon._defBuff = (mon._defBuff || 0) + intent.selfDefBuff; }
                // 反噬
                if (md.recoilDamage && finalDmg > 0) { mon.hp = Math.max(0, mon.hp - md.recoilDamage); _log('<span style="color:var(--accent-blue)">' + mon.name + ' 受到 ' + md.recoilDamage + ' 反噬伤害。</span>'); window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + md.recoilDamage, 'var(--accent-blue)', 'monster'); }
                // 酸蚀肉山被动
                if (_battleState.dualKey === 'mutant+swarm' && Math.random() < 0.55) {
                    mon.status['poison'] = 3;
                    _log('<span style="color:var(--accent-purple);">【骨疽自溶】毒雾反击！</span>');
                }
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                if (p.hp <= 0) { _doDefeat(); } else { setTimeout(function() { processMonster(idx + 1); }, 300); }
            }
        };

        processMonster(0);
    }

    function _finishMonsterTurn() {
        var p = GS().player;
        if (p.hp <= 0) { _doDefeat(); return; }
        _battleState.phase = 'player_turn';

        // 环境伤害
        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.turnDamage) {
            var ed = _battleState.dungeonEnv.effect.turnDamage;
            p.hp = Math.max(0, p.hp - ed);
            _log('<span style="color:var(--accent-blue)">环境异变 [' + _battleState.dungeonEnv.name + '] 对你造成 ' + ed + ' 点伤害。</span>');
            window.UISystem.showDamageFloat(ed, 'var(--accent-blue)', 'player');
            if (p.hp <= 0) { _doDefeat(); return; }
        }

        // 发送回合更新事件供 UI 渲染
        window.UISystem.render();
        // 流血伤害（护盾优先吸收）
        if (_battleState.playerStatus['bleed']) {
            var bleedDmg = GD().STATUS_CONSTANTS.bleed.damagePerTurn || 4;
            if ((_battleState.shieldAmount || 0) > 0) {
                var bleedAbs = Math.min(_battleState.shieldAmount, bleedDmg);
                _battleState.shieldAmount -= bleedAbs;
                bleedDmg -= bleedAbs;
                if (bleedAbs > 0) _log('<span style="color:var(--accent-blue);">护盾吸收 ' + bleedAbs + ' 点流血。</span>');
            }
            if (bleedDmg > 0) { p.hp = Math.max(0, p.hp - bleedDmg); _log('<span style="color:var(--accent-red);">流血造成 ' + bleedDmg + ' 点伤害。</span>'); }
            _battleState.playerStatus['bleed']--;
            if (_battleState.playerStatus['bleed'] <= 0) delete _battleState.playerStatus['bleed'];
        }
        // 安保核心：每回合护盾
        var aliveMons = _getAliveMonsters();
        aliveMons.forEach(function(mon) {
            var md = GD().MONSTERS[mon.id]; if (!md) return;
            if (md.shieldPerTurn) { mon._shield = (mon._shield || 0) + md.shieldPerTurn; }

            // [新增] 维度词缀：再生 (Regen)
            if (mon.affixes && mon.affixes.some(function(a){return a.id==='regen';})) {
                var regen = Math.ceil(mon.hpMax * 0.05);
                mon.hp = Math.min(mon.hpMax, mon.hp + regen);
                _log('<span style="color:var(--accent-green)">【再生】' + mon.name + ' 恢复了 ' + regen + ' HP。</span>');
                window.UISystem.showDamageFloat('+' + regen, 'var(--accent-green)', 'monster');
            }

            // [新增] 维度词缀：死誓 (Berserk) - 每回合扣血
            if (mon.affixes && mon.affixes.some(function(a){return a.id==='berserk';})) {
                var bDmg = Math.ceil(mon.hpMax * 0.05);
                mon.hp = Math.max(1, mon.hp - bDmg);
                _log('<span style="color:var(--accent-orange)">【死誓】' + mon.name + ' 燃尽生命，损失 ' + bDmg + ' HP。</span>');
            }

            // 狂怒触发（读取 Data.js 中的 triggerTurn）
            if (md.intents) {
                var enrageIntent = md.intents.find(function(it) { return it.type === 'enrage'; });
                if (enrageIntent && !mon._enraged && _battleState.turn >= (enrageIntent.triggerTurn || 30)) { mon._enraged = true; mon._atkMult = (mon._atkMult || 1) * (enrageIntent.value || 2); _log('<span style="color:var(--accent-red);font-weight:bold;">' + mon.name + ' 进入狂怒！攻击力永久翻倍！</span>'); }
            }
            // 蜂后闪避
            if (md.intents) {
                var spawnIntent = md.intents.find(function(it) { return it.type === 'spawn'; });
                if (spawnIntent && _battleState.turn % (spawnIntent.spawnInterval || 3) === 0 && !mon._dodging) {
                    mon._dodging = true;
                    if (!mon._originalDef) mon._originalDef = mon.def;
                    mon.def = 0; // defenseZero 生效
                    _log('<span class="txt-red">' + mon.name + ' 开始产卵！获得 100% 闪避，但防御力归零。</span>');
                }
                if (mon._dodging && _battleState.turn % (spawnIntent.spawnInterval || 3) !== 0) {
                    mon._dodging = false;
                    if (mon._originalDef !== undefined) { mon.def = mon._originalDef; mon._originalDef = undefined; }
                    _log('<span>' + mon.name + ' 产卵结束，防御力恢复。</span>');
                }
            }
        });

        var recoveryVal = GS().player.process_recovery || 3;
        var recovery = _battleState._noProcessRecovery ? 0 : Math.round(recoveryVal);

        // [新增] 维度词缀：扰频 (Jammer) - 减少 1 点进程回复
        var aliveMons2 = _getAliveMonsters();
        if (aliveMons2.some(function(m){ return m.affixes && m.affixes.some(function(a){return a.id==='jammer';}); })) {
            recovery = Math.max(1, recovery - 1);
            _log('<span style="color:var(--accent-blue)">【扰频】信号干扰中，进程回复效率下降。</span>');
        }

        _battleState._noProcessRecovery = false;
        var processCap = GS().player.process_max || GD().STATUS_CONSTANTS.processMax;
        _battleState.playerProcess = Math.min(processCap, _battleState.playerProcess + recovery);
        GS().player.process = _battleState.playerProcess;
        _log('<span style="color:var(--accent-green);">进程回复 ' + recovery + ' 点，当前 ' + _battleState.playerProcess + '/' + processCap + '</span>');
        if (p.coatingTurnsLeft > 0) { p.coatingTurnsLeft--; if (p.coatingTurnsLeft <= 0) { p.activeCoating = null; _log('<span class="txt-dim">涂层活性耗尽。</span>'); } }
        // 狂暴状态递减
        if (_battleState.playerStatus['berserk']) {
            _battleState.playerStatus['berserk']--;
            p.hp = Math.max(0, p.hp - Math.ceil(p.hp_max * 0.005));
            if (_battleState.playerStatus['berserk'] <= 0) { delete _battleState.playerStatus['berserk']; _log('<span class="txt-dim">狂暴效果消退。</span>'); }
        }
        // 防御/攻击临时效果递减
        ['defBoost','defDebuff','atkDebuff'].forEach(function(s) {
            if (_battleState.playerStatus[s]) { _battleState.playerStatus[s]--; if (_battleState.playerStatus[s] <= 0) delete _battleState.playerStatus[s]; }
        });
        p.toxicity = Math.max(0, p.toxicity - 1);
        // 终焉母核：连锁闪电
        if (_battleState.dualKey === 'ember+ember') {
            if (window.Sound) window.Sound.electric();
            var alive2 = _getAliveMonsters();
            // 清除所有怪物闪避状态
            for (var i2 = 0; i2 < alive2.length; i2++) {
                if (alive2[i2].status && alive2[i2].status['dodging']) {
                    delete alive2[i2].status['dodging'];
                    _log('<span style="color:var(--accent-blue)">【格式化电弧】清除' + alive2[i2].name + '闪避防御。</span>');
                }
            }
            // 连锁闪电（最多2个目标）
            for (var i2 = 0; i2 < alive2.length && i2 < 2; i2++) {
                var lDmg = Math.ceil(GS().player.def * 1.2);
                alive2[i2].hp = Math.max(0, alive2[i2].hp - lDmg);
                _log('<span style="color:var(--accent-blue)">【格式化电弧】' + alive2[i2].name + ' 受到 ' + lDmg + ' 点电离伤害。</span>');
                window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + lDmg, 'var(--accent-blue)', 'monster');
            }
            if (_allMonstersDead()) { _winBattle(); return; }
        }
        window.UISystem.render();
    }

    function _doDefeat() {
        // 不死细胞核：致命伤害免死一次
        var compFx = _getComponentEffects();
        if (compFx.deathDefy && !_battleState._deathDefyUsed) {
            _battleState._deathDefyUsed = true;
            var p = GS().player;
            p.hp = 1;
            _log('<span style="color:var(--accent-yellow); font-weight:bold;">不死细胞核激活！从死亡边缘归来，HP 剩余 1。</span>');
            window.UISystem.showDamageFloat('免死!', 'var(--accent-yellow)', 'player');
            if (window.Sound) window.Sound.click();
            return;
        }
        _battleState.phase = 'defeat';
        if (window.Sound) window.Sound.defeat();
        _log('<span style="color:var(--accent-red); font-weight:bold;">>> 警告：原体序列彻底崩解... 神经链路断开。</span>');

        var gs = GS();
        if (gs && gs.player && _battleState.monsters.some(function(m){ return GD().MONSTERS[m.id].tier === 'world_boss'; })) {
            gs.player.bossFailCount = (gs.player.bossFailCount || 0) + 1; // 输给 Boss 增加计数
        }

        window.UISystem.render();
        var cdEl = document.createElement('div');
        cdEl.id = 'death-overlay';
        cdEl.style.cssText = 'position:fixed;inset:0;z-index:3200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);';
        cdEl.innerHTML = '<div style="text-align:center;" class="death-box">' +
            '<div class="txt-lg txt-red txt-bold" style="margin-bottom:20px;">序列崩解</div>' +
            '<div class="progress-container" style="width:300px;margin:0 auto;"><div class="progress-fill hp-fill" id="death-countdown-fill" style="width:100%;"></div></div>' +
            '<div class="txt-sm txt-dim" style="margin-top:10px;">母巢重组中...</div></div>';
        document.body.appendChild(cdEl);
        requestAnimationFrame(function() {
            var fill = document.getElementById('death-countdown-fill');
            if (fill) { fill.style.transition = 'width 3s linear'; fill.style.width = '0%'; }
        });
        var doRespawn = function() {
            var el = document.getElementById('death-overlay'); if (el) el.remove();
            _battleState = null;
            var gs2 = GS();
            if (gs2 && gs2.player) {
                var p2 = gs2.player;
                p2.hp = p2.hp_max; p2.process = p2.process_max;
                p2.toxicity = 0; p2._potionHistory = []; p2._potionHistoryTick = 0;
                gs2.mapState.currentRoom = { type: 'camp', label: '<span class="icon icon-campfire"></span> 源初母巢', desc: '从基因崩解中艰难重组。' };
                // 死亡后刷新部分非Boss节点，避免只剩Boss打不过
                var pool2 = gs2.mapState.floorNodePool;
                if (pool2 && pool2.length > 0) {
                    var refreshable = [];
                    for (var ri = 0; ri < pool2.length; ri++) {
                        if (pool2[ri].type !== 'boss' && pool2[ri].type !== 'portal' && pool2[ri].exhausted) refreshable.push(ri);
                    }
                    var cnt = Math.min(3, refreshable.length);
                    for (var rc = 0; rc < cnt; rc++) {
                        var rIdx = Math.floor(Math.random() * refreshable.length);
                        pool2[refreshable.splice(rIdx, 1)[0]].exhausted = false;
                    }
                }
                window.WorldSystem.generateNextPaths();
                window.GameState.save();
                var logEl = document.getElementById('ui-log');
                if (logEl) {
                    var logDiv = document.createElement('div');
                    logDiv.className = 'txt-xs txt-dim';
                    logDiv.style.cssText = 'margin-bottom:5px;';
                    logDiv.innerHTML = '<span class="txt-green">></span> <span>基因重组完成。已返回母巢安全区。</span>';
                    logEl.insertBefore(logDiv, logEl.firstChild);
                }
            }
            window.UISystem.render();
        };
        setTimeout(function() {
            var gs = GS();
            if (gs && gs.player) {
                var p = gs.player;
                var penalty = Math.max(10, Math.floor(p.bp * 0.2));
                p.bp = Math.max(0, p.bp - penalty);
                window.GameState.save();
                cdEl.innerHTML = '<div style="text-align:center;" class="death-box">' +
                    '<div class="txt-lg txt-red txt-bold" style="margin-bottom:16px;">序列崩解</div>' +
                    '<div class="txt-md txt-red txt-bold" style="margin-bottom:10px;">失去 ' + penalty + ' 基因点数</div>' +
                    '<div class="txt-xs txt-dim" style="margin-bottom:16px;">剩余 ' + p.bp + ' | 将回到母巢重组</div>' +
                    '<button class="btn btn-red btn-capsule" id="death-respawn-btn" style="padding:10px 40px;">确认重组</button></div>';
                var btn = document.getElementById('death-respawn-btn');
                if (btn) btn.addEventListener('click', function() {
                    // [修复] 死亡重组时也将进程状态同步
                    if (_battleState) GS().player.process = _battleState.playerProcess;
                    doRespawn();
                });
            }
        }, 3000);
    }

    function _winBattle() {
        _battleState.phase = 'victory';
        if (window.Sound) window.Sound.victory();
        var gs = GS();
        if (!gs.bestiary.killCount) gs.bestiary.killCount = {};

        var scale = window.GameState.getMapLevelScaling(gs);
        var totalBp = 0;
        var totalXp = 0;
        var allDrops = [];

        var hasBoss = false;
        _battleState.monsters.forEach(function(mon) {
            var m = GD().MONSTERS[mon.id]; if (!m) return;
            if (m.tier === 'world_boss') { gs.player.bossFailCount = 0; hasBoss = true; }
            gs.bestiary.killCount[mon.id] = (gs.bestiary.killCount[mon.id] || 0) + 1;
            totalBp += Math.ceil((Math.floor(Math.random() * (m.bpReward[1] - m.bpReward[0] + 1)) + m.bpReward[0]) * scale.bpMul);
            var xpGain = Math.ceil(m.level * 15 * scale.xpMul);

            // [新增] 路径词缀：信号富集 (经验 +50%)
            if (_battleState.pathAffix && _battleState.pathAffix.id === 'data_rich') {
                xpGain = Math.ceil(xpGain * 1.5);
            }
            totalXp += xpGain;

            // [新增] 研究等级 3 奖励：组件掉落率提升 25% (乘法叠加)
            var dropChance = m.drop ? m.drop.chance : 0;
            if (gs.bestiary.researchLevels && gs.bestiary.researchLevels[mon.id] >= 3) {
                dropChance *= 1.25;
            }

            if (m.drop && Math.random() < dropChance) {
                // [新增] 路径词缀：金属堆积 (额外掉落 1)
                var extraDrop = (_battleState.pathAffix && _battleState.pathAffix.id === 'scrap_rich') ? 1 : 0;

                if (m.tier !== 'world_boss') {
                    if (m.drop.type === 'organ') { gs.inventory.organs.push(m.drop.id); }
                    else { gs.inventory.components[m.drop.id] = (gs.inventory.components[m.drop.id] || 0) + 1 + extraDrop; }
                }
                allDrops.push(m.drop.id);
                if (extraDrop) allDrops.push(m.drop.id + "(额外)");
            }
        });

        gs.player.bp += totalBp;
        // Boss宝箱：暂存掉落，等玩家点击宝箱再发放
        if (hasBoss) {
            var bossMon = _battleState.monsters.find(function(mon) { var md = GD().MONSTERS[mon.id]; return md && md.tier === 'world_boss'; });
            var bossData = bossMon ? GD().MONSTERS[bossMon.id] : null;
            if (bossData && bossData.drop) {
                // [修复] 必须缓存总 BP 奖励，防止宝箱发放时计算丢失
                var currentTotalBp = totalBp;
                _battleState._bossChest = {
                    bossName: bossData.name,
                    bpReward: currentTotalBp,
                    dropId: bossData.drop.id,
                    dropType: bossData.drop.type
                };
                totalBp = 0; // 这里的 totalBp 仅用于显示在战报文字中，宝箱内容由 _bossChest 决定
                // 从未掉落列表中移除Boss物品(宝箱必掉)
                allDrops = allDrops.filter(function(d) { return d !== bossData.drop.id; });
            }
        }
        var dropCounts = {}; allDrops.forEach(function(d) { dropCounts[d] = (dropCounts[d] || 0) + 1; });
        var dropParts = []; Object.keys(dropCounts).forEach(function(d) { dropParts.push(d + ' \u00D7' + dropCounts[d]); });
        var dropMsg = dropParts.length > 0 ? ' | 获得材料：' + dropParts.join(', ') : '';
        _log('<span style="color:var(--accent-red)">>> 全部目标已融毁。</span> <span style="color:var(--accent-yellow)">获得基因点数：' + totalBp + '</span>' + dropMsg);
        var xpResult = window.GameState.gainXp(totalXp);
        if (xpResult && xpResult.leveled) {
            _log('<span style="color:var(--accent-blue);font-weight:bold;">>> 等阶提升至 ' + xpResult.newLevel + '！获得 1 专精点（可用：' + xpResult.points + '）</span>');
        }
        window.UISystem.render();

        // 合并战斗胜利通知
        var notifyTitle = '+ ' + totalBp + ' 基因点数';
        var notifySub = dropParts.length > 0 ? dropParts.join('  ') + '  ' : '';
        if (xpResult && xpResult.leveled) notifySub += '等阶提升至 ' + xpResult.newLevel;
        setTimeout(function() {
            window.UISystem.showNotification(notifyTitle, notifySub || null, 'var(--accent-yellow)');
        }, 400);
    }

    function _processStatusEffects() {
        if (!_battleState || !_battleState.monsters) return;
        var dotPct = _battleState.dualKey === 'swarm+swarm' ? 0.10 : 0.05;
        var cfx = _getComponentEffects();
        _battleState.monsters.forEach(function(mon) {
            if (mon.status['poison'] && mon.hp > 0) {
                var dot = Math.ceil(mon.hpMax * dotPct) + (cfx.dotBonus || 0);
                mon.hp = Math.max(0, mon.hp - dot);
                window.UISystem.showDamageFloat(dot, 'var(--accent-purple)', 'monster');
                _log('<span style="color:var(--accent-purple)">' + mon.name + ' 毒素自溶 -' + dot + ' HP。（剩余' + (mon.status['poison'] - 1) + '回合）</span>');
                mon.status['poison']--;
                if (mon.status['poison'] <= 0) { delete mon.status['poison']; _log('<span style="color:var(--text-dim);">' + mon.name + ' 毒素已清除。</span>'); }
                // 组件生命吸取
                if (cfx.lifeDrainChance > 0 && Math.random() < cfx.lifeDrainChance) {
                    var p = GS().player;
                    var drain = Math.min(cfx.lifeDrainAmt, mon.hp);
                    p.hp = Math.min(p.hp_max, p.hp + drain);
                    _log('<span style="color:var(--accent-green)">活性孢子吸取 ' + drain + ' HP。</span>');
                    window.UISystem.showDamageFloat('+' + drain, 'var(--accent-green)', 'player');
                }
            }
        });
        if (_battleState.dualKey === 'ember+mutant' && _battleState.playerStatus['bleed']) {
            delete _battleState.playerStatus['bleed'];
        }
    }

    function _generateIntent(m) {
        var intents = (m.intents || [{label:'未知行为', value:5}]).filter(function(it) {
            // [修复] 允许 spawn (Boss 产卵) 意图被抽取，只过滤 enrage (狂怒是状态而非行为)
            return it.type !== 'enrage';
        });
        if (intents.length === 0) return { label: '未知行为', value: 5, type: 'physical' };
        return intents[Math.floor(Math.random() * intents.length)];
    }

    function _applyGlobalPassives(p) {
        var mk = '';
        var activeRaces = (p.masteries || []).filter(function(r){return r;});
        if (activeRaces.length >= 2) {
            // 多槽时选取优先级最高的双专精组合：异变 > 寄生 > 机械
            var racePriority = { mutant: 1, swarm: 2, ember: 3 };
            activeRaces.sort(function(a,b){ return (racePriority[a]||99) - (racePriority[b]||99); });
            mk = [activeRaces[0], activeRaces[1]].sort().join('+');
        }
        if (!mk) return;
        _battleState.dualKey = mk;
        var dc = GD().DUAL_CLASSES[mk];
        if (!dc) return;

        // 源初毁灭者：被动数据存到battleState，攻击时应用
        if (mk === 'mutant+mutant') {
            _log('<span style="color:var(--accent-red);">被动【超量撕裂】激活：物理 ×1.4，无视 30% 防御</span>');
        }
        if (mk === 'mutant+swarm') {
            _log('<span style="color:var(--accent-purple);">被动【骨疽自溶】激活：受击 55% 概率毒雾反击</span>');
        }
        if (mk === 'ember+mutant') {
            _battleState.shieldAmount += p.def;
            _log('<span style="color:var(--accent-blue);">被动【动能回馈】激活：防御转护盾 +' + p.def + '，受击+1进程，流血免疫</span>');
        }
        if (mk === 'swarm+swarm') {
            _log('<span style="color:var(--accent-purple);">被动【无限蚀骨】激活：毒素 5%→10%，无视护盾</span>');
        }
        if (mk === 'ember+swarm') {
            _log('<span style="color:var(--accent-yellow);">被动【触突过载】激活：毒技能 35% 免 进程</span>');
        }
        if (mk === 'ember+ember') {
            _log('<span style="color:var(--accent-blue);">被动【格式化电弧】激活：每回合自动连锁闪电×2</span>');
        }
    }

    function _log(msg) { _battleState.log.push({ turn: _battleState.turn, msg: msg }); }
    function isInBattle() { return _battleState !== null; }
    function exitBattle() {
        var gs = GS();
        // [修复] 战斗结束时将镜像进程同步回全局状态
        if (gs && _battleState) {
            gs.player.process = _battleState.playerProcess;
            // 清理环境毒性
            if (_battleState._toxAdded) {
                gs.player.toxicity = Math.max(0, gs.player.toxicity - _battleState._toxAdded);
            }
        }
        // 游荡Boss不触发通关标记
        if (gs && gs.mapState.currentRoom && gs.mapState.currentRoom.type === 'boss' && !gs.mapState.currentRoom.wandering) {
            gs.mapState.bossDefeated = true;
            gs.mapState.portalUnlocked = true;
        }
        var wasTraining = _battleState && _battleState._isTraining;
        _log('<span style="color:var(--accent-green)">神经链路重新校准，脱离战斗模式。</span>'); window.UISystem.render();
        _battleState = null;
        if (!wasTraining) {
            window.WorldSystem.generateNextPaths(); window.UISystem.render();
            window.GameState.save();
        } else {
            window.UISystem.render();
        }
    }

    function startTraining() {
        if (_battleState) return;
        startBattle(['TRAINING_DUMMY_MUTANT', 'TRAINING_DUMMY_SWARM', 'TRAINING_DUMMY_EMBER'], {});
        if (_battleState) _battleState._isTraining = true;
    }

    function dungeonDeep() {
        if (!_battleState || !_battleState.isDungeon) return;
        var floor = (_battleState._dungeonFloor || 0) + 1;
        var gs = GS(); var p = gs.player;
        _log('>> 深入地下城 B' + floor + 'F... HP 继承。');
        var pool2 = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'];
        var ids;
        if (floor >= 3) {
            // 最终层：Boss
            var bosses = ['MON_CH1_TYRANT', 'MON_CH1_QUEEN', 'MON_CH1_CORE'];
            ids = [bosses[Math.floor(Math.random() * bosses.length)]];
        } else {
            ids = [pool2[Math.floor(Math.random() * pool2.length)], pool2[Math.floor(Math.random() * pool2.length)]];
        }
        _battleState = null;
        startBattle(ids, { isDungeon: true });
        _battleState._dungeonFloor = floor;
    }
    function openBossChest() {
        if (!_battleState || !_battleState._bossChest) return;
        var chest = _battleState._bossChest;
        var gs = GS();

        // 发放 BP 和 核心器官
        gs.player.bp += chest.bpReward;
        if (chest.dropType === 'organ') {
            gs.inventory.organs.push(chest.dropId);
        } else {
            gs.inventory.components[chest.dropId] = (gs.inventory.components[chest.dropId] || 0) + 1;
        }

        // [新增] 领主宝箱额外产出：随机 3-5 个组件碎片
        var allCompIds = Object.keys(GD().COMPONENTS);
        var count = 3 + Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var cid = allCompIds[Math.floor(Math.random() * allCompIds.length)];
            gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + 1;
        }

        _log('<span style="color:var(--accent-yellow);font-weight:bold;">>> 领主宝箱开启！获得 ' + chest.bpReward + ' BP、' + chest.dropId + ' 及额外 ' + count + ' 份组织碎片。</span>');
        window.UISystem.showNotification('宝箱大爆！', '额外获得 ' + count + ' 个高阶碎片', 'var(--accent-yellow)');

        _battleState._bossChest = null;
        window.GameState.save();
        window.UISystem.render();
    }
    function getBattleState() { return _battleState; }

    function flee() {
        if (!_battleState || _battleState.phase !== 'player_turn' || _battleState._fleeing) return;
        var gs = GS();

        // [新增] 逃跑时机判定：仅限首回合
        if (_battleState.turn > 1) {
            _log('<span style="color:var(--accent-red)">逃跑协议已锁定。只有在战斗第 1 回合才能执行紧急切断。</span>');
            window.UISystem.render();
            return;
        }

        var cost = 4;
        if (_battleState.playerProcess < cost) {
            _log('<span style="color:var(--accent-red)">进程不足，无法执行紧急切断（需 4 进程）。</span>');
            window.UISystem.render();
            return;
        }
        _battleState.playerProcess -= cost;
        gs.player.process = _battleState.playerProcess;

        // 逃跑成功率
        var successRate = 1.0;
        var mon = _getMonsterData();
        if (mon) {
            if (mon.tier === 'elite') successRate = 0.75;
            else if (mon.tier === 'world_boss') successRate = 0.4;
        }

        if (Math.random() < successRate) {
            _battleState._fleeing = true;
            _log('<span style="color:var(--accent-red)">消耗 4 进程执行紧急神经切断。已脱离战斗。</span>');
            window.UISystem.render();
            setTimeout(function() {
                // [修复] 逃跑成功时也需要清理环境毒性并保存
                if (_battleState && _battleState._toxAdded) {
                    gs.player.toxicity = Math.max(0, gs.player.toxicity - _battleState._toxAdded);
                }
                _battleState = null;
                window.WorldSystem.generateNextPaths();
                window.UISystem.render();
                window.GameState.save();
            }, 400);
        } else {
            _log('<span style="color:var(--accent-red)">神经切断失败！被 ' + (mon ? mon.name : '目标') + ' 压制。</span>');

            // [新增] 世界 Boss 惩罚：逃跑失败直接承受一次高额伤害（数值碾压）
            if (mon && mon.tier === 'world_boss') {
                var penaltyDmg = Math.ceil(gs.player.hp_max * 0.25);
                gs.player.hp = Math.max(1, gs.player.hp - penaltyDmg);
                _log('<span style="color:var(--accent-red)">【数值碾压】' + mon.name + ' 对你造成了 ' + penaltyDmg + ' 点逃离惩罚伤害！</span>');
                window.UISystem.showDamageFloat(penaltyDmg, 'var(--accent-red)', 'player');
            }

            window.UISystem.render();
        }
    }

    return {
        startBattle: startBattle,
        playCard: playCard,
        endTurn: endTurn,
        isInBattle: isInBattle, exitBattle: exitBattle, startTraining: startTraining,
        getBattleState: getBattleState,
        flee: flee, selectTarget: selectTarget, dungeonDeep: dungeonDeep,
        openBossChest: openBossChest
    };
})();
