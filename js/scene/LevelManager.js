import { CONFIG } from '../utils/Constants.js';

export class LevelManager {
    constructor() {
        this.level = 1;
        this.waveTotalEnemies = 0;
        this.waveKilledEnemies = 0;
        this.startWave();
    }

    startWave() {
        this.waveTotalEnemies = this.getEnemyCount();
        this.waveKilledEnemies = 0;
    }

    advanceLevel() {
        this.level++;
        this.startWave();
    }

    registerKill() {
        this.waveKilledEnemies = Math.min(
            this.waveKilledEnemies + 1,
            this.waveTotalEnemies
        );
    }

    getEnemyCount() {
        const counts = CONFIG.LEVELS.WAVE_ENEMY_COUNTS;
        if (this.level <= counts.length) {
            return counts[this.level - 1];
        }

        const extraLevels = this.level - counts.length;
        return Math.min(
            counts[counts.length - 1] + Math.floor((extraLevels + 1) / 2),
            CONFIG.LEVELS.MAX_ENEMY_COUNT
        );
    }

    getProgress() {
        if (this.waveTotalEnemies <= 0) return 0;
        return this.waveKilledEnemies / this.waveTotalEnemies;
    }

    getGroupSizeLimit() {
        if (this.level <= 1) return 1;
        if (this.level <= 3) return 2;
        return CONFIG.LEVELS.MAX_GROUP_SIZE;
    }

    getDifficulty() {
        const levelIndex = this.level - 1;
        const armoredEnemyChance = this._getArmoredEnemyChance();

        return {
            health: CONFIG.Enemy.HEALTH,
            armoredHealth: CONFIG.Enemy.HEALTH + 1,
            armoredEnemyChance,
            moveSpeedMultiplier: Math.min(1.35, 1 + levelIndex * 0.04),
            fireCooldownMultiplier: Math.max(0.65, 1 - levelIndex * 0.04),
            detectionRangeMultiplier: Math.min(1.3, 1 + levelIndex * 0.05),
            startsAlertedChance: this.level >= 5 ? Math.min(0.3, levelIndex * 0.04) : 0,
            groupAlertRadius: Math.min(260, CONFIG.LEVELS.GROUP_ALERT_RADIUS + levelIndex * 12),
            shotNoiseRadius: Math.min(300, CONFIG.LEVELS.SHOT_NOISE_RADIUS + levelIndex * 8),
        };
    }

    _getArmoredEnemyChance() {
        const startLevel = CONFIG.LEVELS.ARMORED_ENEMY_START_LEVEL;
        const fullLevel = CONFIG.LEVELS.ARMORED_ENEMY_FULL_LEVEL;

        if (this.level < startLevel) return 0;
        if (this.level >= fullLevel) return 1;

        const progress = (this.level - startLevel) / (fullLevel - startLevel);
        return 0.25 + progress * 0.75;
    }
}
