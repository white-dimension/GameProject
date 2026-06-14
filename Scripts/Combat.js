/**
 * Combat.js — v3.1 战术连招引擎 (修复 RAM 同步与战斗闭环)
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
        var monsters = [];
        for (var i = 0; i < ids.length; i++) {
            var m = GD().MONSTERS[ids[i]]; if (!m) continue;
            monsters.push({
                id: ids[i], name: m.name, hp: m.hp, hpMax: m.hp,
                intent: _generateIntent(m), status: {}
            });
        }
        if (monsters.length === 0) return;

        _battleState = {
            monsters: monsters,
            currentTarget: 0,
            turn: 1,
            phase: 'player_turn',
            log: [{ turn: 1, msg: '第 1 回合开始。' + (monsters.length > 1 ? ' 前方 ' + monsters.length + ' 只变异体！' : '') }],
            isDungeon: !!(options && options.isDungeon),
            shieldAmount: 0,
            playerRam: gs.player.ram,
            playerStatus: {},
            playerRaces: [gs.player.masteries[0], gs.player.masteries[1]].filter(function(r) { return r; })
        };

        // 判定双专精被动
        _applyGlobalPassives(gs.player);
        // 缓存组件效果供 UI 展示
        _battleState.componentEffects = _getComponentEffects();

        window.UISystem.render();
        if (window.Sound) window.Sound.monster();
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
        if (!_battleState || _battleState.phase !== 'player_turn') return;
        var gs = GS(); var p = gs.player;

        // --- 1. 魔药逻辑 ---
        if (potionId) {
            var pot = GD().POTIONS[potionId];
            var idx = gs.inventory.potions.indexOf(potionId);
            if (!pot || idx === -1) return;

            gs.inventory.potions.splice(idx, 1);
            p.toxicity += pot.toxicity;
            p._potionsUsed = (p._potionsUsed || 0) + 1;
            // 耐药性衰减
            if (!p._potionHistory) p._potionHistory = [];
            var consec = 0;
            for (var hi = p._potionHistory.length - 1; hi >= 0; hi--) { if (p._potionHistory[hi] === potionId) consec++; else break; }
            var decayFactor = Math.max(0.3, Math.pow(0.7, consec));
            p._potionHistory.push(potionId);
            if (p._potionHistory.length > 10) p._potionHistory.shift();
            _log('<span style="color:var(--accent-purple)">使用了 ' + pot.name + '。</span>毒性增加至 ' + p.toxicity + (consec > 0 ? ' (耐药' + Math.round(decayFactor * 100) + '%)' : ''));

            window.UISystem.showDamageFloat('<span class="icon icon-biohazard"></span>', 'var(--accent-purple)', 'player');

            if (pot.id === 'POT_BERSERK') { _battleState.playerStatus['berserk'] = 99; if (consec > 0) _battleState.playerStatus['berserkMult'] = decayFactor; }
            else if (pot.id === 'POT_ANTIDOTE') {
                var curM2 = _getMonster();
                var md2 = _getMonsterData();
                if (curM2) {
                    // 哨兵蓄力期免疫物理控制
                    if (md2 && md2.immuneToPhysicalCC) { _log(curM2.name + ' 免疫物理控制。'); }
                    else {
                        curM2._antiStunCount = (curM2._antiStunCount || 0) + 1;
                        var stunChance = Math.max(0.3, Math.pow(0.7, curM2._antiStunCount - 1));
                        // 孢子耐药性
                        if (md2 && md2.drugResist) { stunChance *= (1 - md2.drugResist); }
                        if (Math.random() < stunChance) { curM2.intent = { label: '<span class="icon icon-time-trap"></span> 行动延后', type: 'stun' }; _log('<span style="color:var(--accent-purple);">神经阻断成功。</span>'); }
                        else { _log(curM2.name + ' 已产生抗性，神经阻断失败。'); }
                    }
                }
                _battleState._noRamRecovery = true;
            }
            else if (pot.id === 'POT_SHIELD_CORE') { _battleState.shieldAmount = (_battleState.shieldAmount || 0) + Math.ceil(p.hp_max * 0.3 * decayFactor); _battleState.playerStatus['toxDebuff'] = true; }

            window.UISystem.render();
            return;
        }

        // --- 2. 技能逻辑 ---
        var cost = (slot === 'predatory_organ' ? 2 : 3) + (_battleState._ramPenalty || 0);
        if (_battleState._ramPenalty) _battleState._ramPenalty = 0; // 单次消耗后重置
        // 电子真菌：毒技能 35% 免 进程
        if (slot === 'gland_core' && _battleState.dualKey === 'ember+swarm' && Math.random() < 0.35) {
            cost = 0;
            _log('<span style="color:var(--accent-yellow)">【触突过载】电荷偏转！本次不消耗 进程。</span>');
        }
        if (_battleState.playerRam < cost) return;

        _battleState.playerRam -= cost;
        p.ram = _battleState.playerRam; // 强制写回 GameState 确保顶部 HUD 同步

        _executePlayerSkill(slot);
        if (_battleState) window.UISystem.render();
    }

    function _getComponentEffects() {
        var p = GS().player; if (!p) return {};
        var comps = GD().COMPONENTS || {};
        var effects = { armorPen: 0, bonusVsSwarm: 0, toxinConv: 0, lifeDrainChance: 0, lifeDrainAmt: 0, dotBonus: 0, thornsPct: 0 };
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
        if (window.Sound) window.Sound.attack();
        if (_battleState.playerStatus['berserk']) {
            var berserkMult = _battleState.playerStatus['berserkMult'] || 1.0;
            baseAtk = Math.ceil(baseAtk * (1 + 0.5 * berserkMult));
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

        if (slot === 'predatory_organ') {
            damage = baseAtk;

            // 涂层：细胞壁溶解酶（反异变）
            if (p.activeCoating === 'COAT_ANTI_MUTANT' && m && m.race === 'mutant') {
                damage = Math.ceil(damage * 1.5);
                ignoreDef = true;
            }
            // 涂层：生物自溶催化剂（反寄生 — 额外毒素伤害）
            if (p.activeCoating === 'COAT_ANTI_SWARM' && m && m.race === 'swarm') {
                damage = Math.ceil(damage * (1 + 0.4));
            }
            // 涂层：电磁短路脉冲液（反机械 — 削减怪物护盾）
            if (p.activeCoating === 'COAT_ANTI_EMBER' && m && m.race === 'ember') {
                curMon._shield = Math.max(0, (curMon._shield || 0) - 30);
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

            // 挂毒：30%概率
            if (Math.random() < 0.3) {
                curMon.status['poison'] = 3;
                _log('<span style="color:var(--accent-red)">发起捕食打击：' + damage + '点伤害</span>，注入毒素标记。');
            } else {
                _log('<span style="color:var(--accent-red)">发起捕食打击，造成 ' + damage + ' 点物理伤害。</span>');
            }
        } else if (slot === 'gland_core') {
            // Boss器官：蜂后髓核
            if (p.gland_core.equipped === '蜂后髓核') {
                damage = baseAtk * 3;
                _log('<span style="color:var(--accent-yellow)">>> [母体孵化] 召唤 3 只工蜂突袭！造成 ' + damage + ' 点伤害。</span>');
            }
            // Boss器官：高能电泳核
            else if (p.gland_core.equipped === '高能电泳核') {
                damage = Math.ceil(baseAtk * 2.0);
                _log('<span style="color:var(--accent-blue)">>> [电弧过载风暴] 释放高压电弧！造成 ' + damage + ' 点电离伤害。</span>');
            }
            else if (curMon.status['poison']) {
                damage = baseAtk * 3;
                delete curMon.status['poison'];
                var heal = damage;
                p.hp = Math.min(p.hp_max, p.hp + heal);
                _log('<span style="color:var(--accent-yellow)">>> [基因融毁] 触发连招爆破！造成 ' + damage + ' 点伤害</span>，<span style="color:var(--accent-green)">吸取 ' + heal + ' HP</span>。');
                window.UISystem.showDamageFloat('+' + heal, 'var(--accent-green)', 'player');
            } else {
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
        // --- 组件词条：种族增伤 ---
        var compFx = _getComponentEffects();
        if (compFx.bonusVsSwarm > 0 && m && m.race === 'swarm') {
            damage = Math.ceil(damage * (1 + compFx.bonusVsSwarm));
        }
        // --- 组件破甲：减少怪物有效防御 ---
        var effDef = m ? ((m.def || 0) + (curMon._defBuff || 0)) : 0;
        if (compFx.armorPen > 0) { effDef = Math.max(0, effDef * (1 - compFx.armorPen)); }
        // --- 应用怪物防御减伤 ---
        if (!ignoreDef && effDef > 0) {
            var reduction = window.GameState.calcDamageReduction(effDef);
            damage = Math.ceil(damage * (1 - reduction));
        }

        curMon.hp = Math.max(0, curMon.hp - damage);
        // 毒素转化：额外DOT
        if (compFx.toxinConv > 0 && damage > 0) {
            var toxinExtra = Math.ceil(damage * compFx.toxinConv);
            curMon.hp = Math.max(0, curMon.hp - toxinExtra);
            _log('<span style="color:var(--accent-purple)">毒素转化额外造成 ' + toxinExtra + ' 点伤害。</span>');
        }
        if (curMon.hp <= 0) { selectTarget(0); _log('<span style="color:var(--accent-red)">' + curMon.name + ' 已融毁。</span>'); }
        if (_allMonstersDead()) { _winBattle(); return; }
        window.UISystem.showDamageFloat('-' + damage, 'var(--accent-red)', 'monster');
    }

    function endTurn() {
        if (!_battleState || _battleState.phase !== 'player_turn') return;
        _battleState.phase = 'monster_turn';
        _log('第 ' + _battleState.turn + ' 回合结束。');
        _processStatusEffects();
        window.UISystem.render();
        setTimeout(_monsterAction, 800);
    }

    function _monsterAction() {
        if (!_battleState || _battleState.phase !== 'monster_turn') return;
        var p = GS().player;
        _battleState.turn++;

        var alive = _getAliveMonsters();
        if (alive.length === 0) { _winBattle(); return; }

        // 处理毒性（跳过第1回合，World.js 已扣过步进伤害）
        if (p.toxicity > 50 && _battleState.turn > 1) { var od = Math.ceil(p.hp_max * 0.02); p.hp = Math.max(0, p.hp - od); _log('<span style="color:var(--accent-purple)">[基因自溶] -' + od + ' HP</span>'); }

        _log('第 ' + _battleState.turn + ' 回合开始。');

        var processMonster = function(idx) {
            if (idx >= alive.length) {
                // 所有怪物行动完毕
                _finishMonsterTurn();
                return;
            }
            var mon = alive[idx];
            var md = GD().MONSTERS[mon.id];
            var intent = mon.intent;

            if (intent.type === 'stun') {
                _log(mon.name + ' 处于神经抑制状态，跳过回合。');
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
                var drainAmt = intent.value || 0;
                p.hp = Math.max(0, p.hp - drainAmt);
                _log('<span style="color:var(--accent-purple);">' + mon.name + ' 吸取 ' + drainAmt + ' 生命。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                if (p.hp <= 0) { _doDefeat(); } else { setTimeout(function() { processMonster(idx + 1); }, 300); }
            } else if (intent.type === 'summon' || intent.type === 'spawn') {
                var summonDmg = (intent.summonCount || 0) * (intent.summonDamage || 0);
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
                    var rawDmgC = intent.value || 0;
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
                _battleState._ramPenalty = (_battleState._ramPenalty || 0) + (intent.ramPenalty || 1);
                _log('<span style="color:var(--accent-blue);">' + mon.name + ' 扫描干扰！下回合卡牌费用 +' + (intent.ramPenalty || 1) + '。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                setTimeout(function() { processMonster(idx + 1); }, 300);
            } else {
                // 伤害类意图：physical / toxin / electric / enrage
                var rawDmg = (intent.value || 0) * (mon._atkMult || 1);
                var playerReduction = window.GameState.calcDamageReduction(p.def || 0);
                var dmg = Math.ceil(rawDmg * (1 - playerReduction));
                var finalDmg;
                if (intent.type === 'toxin') {
                    // 涂层抗毒免疫
                    if (p.activeCoating === 'COAT_ANTI_SWARM' && md && md.race === 'swarm') {
                        finalDmg = 0;
                        _log('<span style="color:var(--accent-green);">' + mon.name + ' 毒素被涂层中和。</span>');
                    } else {
                        // 毒素无视护盾
                        finalDmg = dmg;
                        p.hp = Math.max(0, p.hp - finalDmg);
                        _log('<span style="color:var(--accent-purple);">' + mon.name + ' 喷射毒素造成 ' + finalDmg + ' 点伤害。（无视护盾）</span>');
                    }
                } else {
                    finalDmg = Math.max(0, dmg - (_battleState.shieldAmount || 0));
                    _battleState.shieldAmount = Math.max(0, (_battleState.shieldAmount || 0) - dmg);
                    if (_battleState.dualKey === 'ember+mutant') {
                        _battleState.shieldAmount = (_battleState.shieldAmount || 0) + p.def;
                    }
                    p.hp = Math.max(0, p.hp - finalDmg);
                    _log('<span style="color:var(--accent-red);">' + mon.name + ' 对你造成 ' + finalDmg + ' 点伤害。</span>');
                }
                window.UISystem.triggerShake('app');
                if (window.Sound) window.Sound.hit();
                if (finalDmg > 0) window.UISystem.showDamageFloat('-' + finalDmg, 'var(--accent-red)', 'player');
                // 组件反伤
                var cfx2 = _getComponentEffects();
                if (cfx2.thornsPct > 0 && rawDmg > 0) {
                    var thornDmg = Math.ceil(rawDmg * cfx2.thornsPct);
                    mon.hp = Math.max(0, mon.hp - thornDmg);
                    _log('<span style="color:var(--accent-blue)">电磁反伤！' + mon.name + ' 受到 ' + thornDmg + ' 点反击伤害。</span>');
                    window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + thornDmg, 'var(--accent-blue)', 'monster');
                }
                // 流血（机械余烬免疫）
                if (intent.bleed && !md.bleedImmune) { _battleState.playerStatus['bleed'] = intent.bleed.duration || 3; _log('<span style="color:var(--accent-red);">施加流血 ' + intent.bleed.duration + ' 回合。</span>'); }
                // 自防buff
                if (intent.selfDefBuff) { mon._defBuff = (mon._defBuff || 0) + intent.selfDefBuff; }
                // 反噬
                if (md.recoilDamage && finalDmg > 0) { mon.hp = Math.max(0, mon.hp - md.recoilDamage); _log('<span style="color:var(--accent-blue)">' + mon.name + ' 受到 ' + md.recoilDamage + ' 反噬伤害。</span>'); window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + md.recoilDamage, 'var(--accent-blue)', 'monster'); }
                // 酸蚀肉山被动
                if (_battleState.dualKey === 'mutant+swarm' && Math.random() < 0.4) {
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
            // 狂怒触发（读取 Data.js 中的 triggerTurn）
            if (md.intents) {
                var enrageIntent = md.intents.find(function(it) { return it.type === 'enrage'; });
                if (enrageIntent && !mon._enraged && _battleState.turn >= (enrageIntent.triggerTurn || 30)) { mon._enraged = true; mon._atkMult = (mon._atkMult || 1) * (enrageIntent.value || 2); _log('<span style="color:var(--accent-red);font-weight:bold;">' + mon.name + ' 进入狂怒！攻击力永久翻倍！</span>'); }
            }
            // 蜂后闪避
            if (md.intents) {
                var spawnIntent = md.intents.find(function(it) { return it.type === 'spawn'; });
                if (spawnIntent && _battleState.turn % (spawnIntent.spawnInterval || 3) === 0 && !mon._dodging) {
                    mon._dodging = true; _log('<span class="txt-red">' + mon.name + ' 开始产卵！获得 100% 闪避，但防御力归零。</span>');
                }
                if (mon._dodging && _battleState.turn % (spawnIntent.spawnInterval || 3) !== 0) {
                    mon._dodging = false; _log(mon.name + ' 产卵结束。</span>');
                }
            }
        });

        var recovery = _battleState._noRamRecovery ? 0 : GD().STATUS_CONSTANTS.ramRecoveryPerTurn;
        _battleState._noRamRecovery = false;
        var ramCap = GS().player.ram_max || GD().STATUS_CONSTANTS.ramMax;
        _battleState.playerRam = Math.min(ramCap, _battleState.playerRam + recovery);
        GS().player.ram = _battleState.playerRam;
        _log('<span style="color:var(--accent-green);">进程回复 ' + recovery + ' 点，当前 ' + _battleState.playerRam + '/' + ramCap + '</span>');
        if (p.coatingTurnsLeft > 0) { p.coatingTurnsLeft--; if (p.coatingTurnsLeft <= 0) { p.activeCoating = null; _log('<span class="txt-dim">涂层活性耗尽。</span>'); } }
        // 狂暴状态递减
        if (_battleState.playerStatus['berserk']) {
            _battleState.playerStatus['berserk']--;
            p.hp = Math.max(0, p.hp - Math.ceil(p.hp_max * 0.01));
            if (_battleState.playerStatus['berserk'] <= 0) { delete _battleState.playerStatus['berserk']; _log('<span class="txt-dim">狂暴效果消退。</span>'); }
        }
        p.toxicity = Math.max(0, p.toxicity - 1);
        // 终焉母核：连锁闪电
        if (_battleState.dualKey === 'ember+ember') {
            var alive2 = _getAliveMonsters();
            for (var i2 = 0; i2 < alive2.length && i2 < 3; i2++) {
                var lDmg = Math.ceil(GS().player.def * 2.0);
                alive2[i2].hp = Math.max(0, alive2[i2].hp - lDmg);
                _log('<span style="color:var(--accent-blue)">【格式化电弧】' + alive2[i2].name + ' 受到 ' + lDmg + ' 点电离伤害。</span>');
                window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + lDmg, 'var(--accent-blue)', 'monster');
            }
            if (_allMonstersDead()) { _winBattle(); return; }
        }
        window.UISystem.render();
    }

    function _doDefeat() {
        _battleState.phase = 'defeat';
        if (window.Sound) window.Sound.defeat();
        _log('>> 序列彻底崩解...');
        window.UISystem.render();
        var cdEl = document.createElement('div');
        cdEl.id = 'death-overlay';
        cdEl.style.cssText = 'position:fixed;inset:0;z-index:3200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);';
        cdEl.innerHTML = '<div style="text-align:center;">' +
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
                p2.hp = p2.hp_max; p2.ram = p2.ram_max;
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
                cdEl.innerHTML = '<div style="text-align:center;">' +
                    '<div class="txt-lg txt-red txt-bold" style="margin-bottom:16px;">序列崩解</div>' +
                    '<div class="txt-md txt-red txt-bold" style="margin-bottom:10px;">失去 ' + penalty + ' 基因点数</div>' +
                    '<div class="txt-xs txt-dim" style="margin-bottom:16px;">剩余 ' + p.bp + ' | 将回到母巢重组</div>' +
                    '<button class="btn btn-red btn-capsule" id="death-respawn-btn" style="padding:10px 40px;">确认重组</button></div>';
                var btn = document.getElementById('death-respawn-btn');
                if (btn) btn.addEventListener('click', function() { doRespawn(); });
            }
        }, 3000);
    }

    function _winBattle() {
        _battleState.phase = 'victory';
        if (window.Sound) window.Sound.victory();
        var gs = GS();
        if (!gs.bestiary.killCount) gs.bestiary.killCount = {};

        var totalBp = 0;
        var totalXp = 0;
        var allDrops = [];

        _battleState.monsters.forEach(function(mon) {
            var m = GD().MONSTERS[mon.id]; if (!m) return;
            gs.bestiary.killCount[mon.id] = (gs.bestiary.killCount[mon.id] || 0) + 1;
            totalBp += Math.floor(Math.random() * (m.bpReward[1] - m.bpReward[0] + 1)) + m.bpReward[0];
            totalXp += m.level * 15;
            if (m.drop && Math.random() < m.drop.chance) {
                if (m.drop.type === 'organ') {
                    gs.inventory.organs.push(m.drop.id);
                } else {
                    gs.inventory.components[m.drop.id] = (gs.inventory.components[m.drop.id] || 0) + 1;
                }
                allDrops.push(m.drop.id);
            }
        });

        gs.player.bp += totalBp;
        var dropCounts = {}; allDrops.forEach(function(d) { dropCounts[d] = (dropCounts[d] || 0) + 1; });
        var dropParts = []; Object.keys(dropCounts).forEach(function(d) { dropParts.push(d + ' \u00D7' + dropCounts[d]); });
        var dropMsg = dropParts.length > 0 ? ' | 获得材料：' + dropParts.join(', ') : '';
        _log('<span style="color:var(--accent-red)">>> 全部目标已融毁。</span> <span style="color:var(--accent-yellow)">获得基因点数：' + totalBp + '</span>' + dropMsg);
        var xpResult = window.GameState.gainXp(totalXp);
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
        var dotPct = _battleState.dualKey === 'swarm+swarm' ? 0.08 : 0.05;
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
        var intents = m.intents || [{label:'未知行为', value:5}];
        return intents[Math.floor(Math.random() * intents.length)];
    }

    function _applyGlobalPassives(p) {
        var mk = (p.masteries[0] && p.masteries[1]) ? [p.masteries[0], p.masteries[1]].sort().join('+') : '';
        if (!mk) return;
        _battleState.dualKey = mk;
        var dc = GD().DUAL_CLASSES[mk];
        if (!dc) return;

        // 源初毁灭者：被动数据存到battleState，攻击时应用
        if (mk === 'mutant+mutant') {
            _log('<span style="color:var(--accent-red);">被动【超量撕裂】激活：物理 ×1.4，无视 30% 防御</span>');
        }
        if (mk === 'mutant+swarm') {
            _log('<span style="color:var(--accent-purple);">被动【骨疽自溶】激活：受击 40% 概率毒雾反击</span>');
        }
        if (mk === 'ember+mutant') {
            _battleState.shieldAmount += p.def;
            _log('<span style="color:var(--accent-blue);">被动【动能回馈】激活：防御转护盾 +' + p.def + '，流血免疫</span>');
        }
        if (mk === 'swarm+swarm') {
            _log('<span style="color:var(--accent-purple);">被动【无限蚀骨】激活：敌方毒素抗性 -30%，毒素 5%→8%</span>');
        }
        if (mk === 'ember+swarm') {
            _log('<span style="color:var(--accent-yellow);">被动【触突过载】激活：毒技能 35% 免 进程</span>');
        }
        if (mk === 'ember+ember') {
            _log('<span style="color:var(--accent-blue);">被动【格式化电弧】激活：每回合自动连锁闪电</span>');
        }
    }

    function _log(msg) { _battleState.log.push({ turn: _battleState.turn, msg: msg }); }
    function isInBattle() { return _battleState !== null; }
    function exitBattle() {
        var gs = GS();
        if (gs && gs.mapState.currentRoom && gs.mapState.currentRoom.type === 'boss') {
            gs.mapState.bossDefeated = true;
            gs.mapState.portalUnlocked = true;
        }
        _log('已脱离战斗，神经链路重新校准。'); window.UISystem.render();
        _battleState = null;
        window.WorldSystem.generateNextPaths(); window.UISystem.render();
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
    function getBattleState() { return _battleState; }

    function flee() {
        if (!_battleState || _battleState.phase !== 'player_turn') return;
        var gs = GS(); var cost = 4;
        if (_battleState.playerRam < cost) {
            _log('进程不足，无法执行紧急切断（需 4 进程）。');
            window.UISystem.render();
            return;
        }
        _battleState.playerRam -= cost;
        gs.player.ram = _battleState.playerRam;
        // 逃跑成功率
        var successRate = 1.0;
        var mon = _getMonsterData();
        if (mon) {
            if (mon.tier === 'elite') successRate = 0.75;
            else if (mon.tier === 'world_boss') successRate = 0.4;
        }
        if (Math.random() < successRate) {
            _log('<span style="color:var(--accent-red)">消耗 4 进程执行紧急神经切断。已脱离战斗。</span>');
            window.UISystem.render();
            setTimeout(function() {
                _battleState = null;
                window.WorldSystem.generateNextPaths();
                window.UISystem.render();
            }, 400);
        } else {
            _log('<span style="color:var(--accent-red)">神经切断失败！被 ' + (mon ? mon.name : '目标') + ' 压制。</span>');
            window.UISystem.render();
        }
    }

    return {
        startBattle: startBattle,
        playCard: playCard,
        endTurn: endTurn,
        isInBattle: isInBattle, exitBattle: exitBattle,
        getBattleState: getBattleState,
        flee: flee, selectTarget: selectTarget, dungeonDeep: dungeonDeep
    };
})();
