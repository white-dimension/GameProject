/**
 * Items.js — v3.0 组件/器官/魔药/涂层数据库
 */

window.ItemDB = (function () {
    'use strict';

    var RACE = window.MonsterDB.RACE;

const COMPONENTS = {
        '变异组织': {
            id: '变异组织',
            allowedSlots: ['predatory_organ'],
            affixes: {
                atkBonus: 3,
                bonusVsSwarm: 0.20
            }
        },
        '异变肌肉束': {
            id: '异变肌肉束',
            allowedSlots: ['predatory_organ'],
            affixes: {
                armorPenetration: 0.15,
                physMultiplier: 1.20
            }
        },
        '毒囊材料': {
            id: '毒囊材料',
            allowedSlots: ['predatory_organ', 'gland_core'],
            affixes: {
                toxinConversion: 0.10,
                dotBonus: 2
            }
        },
        '活性孢子': {
            id: '活性孢子',
            allowedSlots: ['gland_core'],
            affixes: {
                lifeDrainChance: 0.25,
                lifeDrainAmount: 5
            }
        },
        '纳米破片': {
            id: '纳米破片',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                flatDefBonus: 2,
                shieldBonus: 15
            }
        },
        '高压电缆碎片': {
            id: '高压电缆碎片',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                thornsPercent: 0.20,
                thornsType: 'electric'
            }
        },
        '肾上腺素晶体': {
            id: '肾上腺素晶体',
            allowedSlots: ['predatory_organ'],
            affixes: {
                atkBonus: 3,
                killHeal: 8
            }
        },
        '不死细胞核': {
            id: '不死细胞核',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                shieldBonus: 10,
                deathDefy: true
            }
        },
        '神经突触结': {
            id: '神经突触结',
            allowedSlots: ['gland_core'],
            affixes: {
                processOnHit: 2
            }
        },
        '电磁催化剂': {
            id: '电磁催化剂',
            allowedSlots: ['predatory_organ', 'gland_core'],
            affixes: {
                critChance: 0.15,
                critMultiplier: 1.5
            }
        },
        '解毒酶结晶': {
            id: '解毒酶结晶',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                defBonus: 2,
                poisonImmune: true
            }
        },
        '原始基因': {
            id: '原始基因',
            allowedSlots: ['predatory_organ', 'chitin_epidermis', 'gland_core'],
            affixes: {
                atkBonus: 3,
                defBonus: 3,
                shieldBonus: 20
            }
        }
    };

    const BOSS_ORGANS = {
        '暴君核心': {
            id: '暴君核心', slotType: 'predatory_organ', tier: 3, bossSource: 'MON_CH1_TYRANT',
            skillName: '暴君撕裂', skillCost: 4,
            skillEffect: { type: 'physical', baseMultiplier: 2.5, armorPenetration: 0.3, desc: '重型物理撕裂，2.5×倍率，无视30%防御' }
        },
        '暴君甲壳': {
            id: '暴君甲壳', slotType: 'chitin_epidermis', tier: 3, bossSource: 'MON_CH1_TYRANT',
            skillName: '骨板硬化', skillCost: 3,
            skillEffect: { type: 'shield', shieldMultiplier: 1.2, thornsReflect: 0.15, desc: '生成攻击力×1.2护盾，受击反弹15%伤害' }
        },
        '暴君腺体': {
            id: '暴君腺体', slotType: 'gland_core', tier: 3, bossSource: 'MON_CH1_TYRANT',
            skillName: '震波咆哮', skillCost: 5,
            skillEffect: { type: 'physical', baseMultiplier: 2.0, stunChance: 0.4, desc: '2.0×倍率，40%概率使目标跳过下回合' }
        },
        '蜂后毒牙': {
            id: '蜂后毒牙', slotType: 'predatory_organ', tier: 3, bossSource: 'MON_CH1_QUEEN',
            skillName: '毒液注射', skillCost: 3,
            skillEffect: { type: 'toxin', baseMultiplier: 1.5, poisonDuration: 5, poisonDamage: 3, desc: '1.5×倍率，施加5回合猛毒（每回合3点）' }
        },
        '蜂后甲壳': {
            id: '蜂后甲壳', slotType: 'chitin_epidermis', tier: 3, bossSource: 'MON_CH1_QUEEN',
            skillName: '幼虫护盾', skillCost: 2,
            skillEffect: { type: 'shield', shieldMultiplier: 0.8, healOnShield: 0.1, desc: '生成攻击力×0.8护盾，护盾存在时每回合回复10%最大HP' }
        },
        '蜂后髓核': {
            id: '蜂后髓核', slotType: 'gland_core', tier: 3, bossSource: 'MON_CH1_QUEEN',
            skillName: '畸变群落母体孵化', skillCost: 4,
            skillEffect: { type: 'summon', baseMultiplier: 3.0, summonCount: 3, desc: '3.0×倍率召唤集群突袭，伤害全额吸血' }
        },
        '核心钻头': {
            id: '核心钻头', slotType: 'predatory_organ', tier: 3, bossSource: 'MON_CH1_CORE',
            skillName: '超频贯穿', skillCost: 4,
            skillEffect: { type: 'physical', baseMultiplier: 2.0, armorPenetration: 0.5, critChance: 0.2, desc: '2.0×倍率+50%破甲，20%概率暴击（×2伤害）' }
        },
        '核心护盾': {
            id: '核心护盾', slotType: 'chitin_epidermis', tier: 3, bossSource: 'MON_CH1_CORE',
            skillName: '纳米修复场', skillCost: 3,
            skillEffect: { type: 'shield', shieldMultiplier: 0.6, regenPerTurn: 0.05, desc: '生成攻击力×0.6护盾，每回合自动回复5%进程' }
        },
        '高能电泳核': {
            id: '高能电泳核', slotType: 'gland_core', tier: 3, bossSource: 'MON_CH1_CORE',
            skillName: '电弧过载风暴', skillCost: 5,
            skillEffect: { type: 'electric', baseMultiplier: 2.0, chainTargets: 3, desc: '2.0×倍率高压电弧，连锁3个目标' }
        }
    };

    var _bossOrganPools = {
        MON_CH1_TYRANT: ['暴君核心','暴君甲壳','暴君腺体'],
        MON_CH1_QUEEN: ['蜂后毒牙','蜂后甲壳','蜂后髓核'],
        MON_CH1_CORE: ['核心钻头','核心护盾','高能电泳核']
    };
    var _getRandomBossOrgan = function(bossId) {
        var pool = _bossOrganPools[bossId]; if (!pool) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const POTIONS = {
        POT_BERSERK: {
            id: 'POT_BERSERK',
            name: '野性狂暴血清',
            toxicity: 25,
            effect: { type: 'atkBoost', value: 0.50, desc: '攻击力暴增 50%' },
            sideEffect: { type: 'hpDrain', value: 0.005, desc: '每回合扣除 0.5% 最大生命值' }
        },
        POT_ANTIDOTE: {
            id: 'POT_ANTIDOTE',
            name: '神经阻断减速剂',
            toxicity: 18,
            effect: { type: 'delayIntent', value: 1, desc: '强制延后怪物行动意图 1 回合（Boss 60% 成功率）' },
            sideEffect: { type: 'ramBlock', desc: '释放回合无法获得进程恢复' }
        },
        POT_SHIELD_CORE: {
            id: 'POT_SHIELD_CORE',
            name: '离子过载充能液',
            toxicity: 20,
            effect: { type: 'shield', value: 0.40, desc: '获得相当于最大生命值 40% 的科技护盾' },
            sideEffect: { type: 'toxResistDebuff', desc: '护盾存在期间，毒素抗性降低 20%' }
        },
        POT_HEAL: {
            id: 'POT_HEAL',
            name: '凝血再生剂',
            toxicity: 18,
            effect: { type: 'heal', value: 0.40, desc: '瞬间恢复最大生命值的 40%' },
            sideEffect: { type: 'defDebuff', value: 0.20, desc: '防御力下降 20%（3回合）' }
        },
        POT_DEFENSE: {
            id: 'POT_DEFENSE',
            name: '角质硬化素',
            toxicity: 22,
            effect: { type: 'defBoost', value: 0.50, desc: '防御力提升 50%' },
            sideEffect: { type: 'atkDebuff', value: 0.20, desc: '攻击力下降 20%（3回合）' }
        },
        POT_RAM: {
            id: 'POT_RAM',
            name: '神经突触催化剂',
            toxicity: 12,
            effect: { type: 'ramRecover', value: 8, desc: '立即回复 8 点进程' },
            sideEffect: { type: 'toxinBurst', value: 5, desc: '额外增加 5 点毒性' }
        }
    };

    const COATINGS = {
        COAT_ANTI_MUTANT: {
            id: 'COAT_ANTI_MUTANT',
            name: '细胞壁溶解酶涂层',
            cost: { '变异组织': 2 },
            targetRace: RACE.MUTANT,
            effect: { damageBonus: 0.50, ignoreDefense: true },
            duration: 100
        },
        COAT_ANTI_SWARM: {
            id: 'COAT_ANTI_SWARM',
            name: '生物自溶催化剂',
            cost: { '毒囊材料': 2 },
            targetRace: RACE.SWARM,
            effect: { toxinBonus: 0.40, toxinImmune: true, damageBonus: 0.20 },
            duration: 100
        },
        COAT_ANTI_EMBER: {
            id: 'COAT_ANTI_EMBER',
            name: '电磁短路脉冲液',
            cost: { '纳米破片': 2 },
            targetRace: RACE.EMBER,
            effect: { shieldStrip: 100, stripChance: 1.0, damageBonus: 0.30 },
            duration: 100
        }
    };

    return { COMPONENTS: COMPONENTS, BOSS_ORGANS: BOSS_ORGANS, _bossOrganPools: _bossOrganPools, _getRandomBossOrgan: _getRandomBossOrgan, POTIONS: POTIONS, COATINGS: COATINGS };
})();
