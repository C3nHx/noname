export function createEffectsConfig() {
    return {
        effects: {
            transformEffects: {
                default: {
                    scale: 0.7,
                    speed: 0.6,
                    delay: 0.1,
                },
                posui: {
                    scale: 0.6,
                    speed: 1,
                    name: 'posui',
                    json: true,
                    delay: 0.5,
                },
                jinka: {
                    scale: 0.6,
                    speed: 1,
                    name: 'jinka',
                    json: true,
                    delay: 0.5,
                },
                qiancheng: {
                    scale: 0.6,
                    speed: 1,
                    name: 'qiancheng',
                    json: true,
                    delay: 0.5,
                },
                shaohui: {
                    scale: 0.6,
                    speed: 1,
                    x: [0, 0.6],
                    y: [0, 0.5],
                    name: 'shaohui',
                    json: true,
                    delay: 0.5,
                },
            }
        },
    }
}

