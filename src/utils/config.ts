


interface EnvConfig {
    [key: string]: string | undefined;
}

class EnvLoader {
    private static envCache: EnvConfig

    static load(): EnvConfig {
        if (!this.envCache) {
            this.envCache = {
                PORT: process.env.PORT,
                MODEL: process.env.MODEL,
                TIMER_BOT: process.env.TIMER_BOT,
                DEBOUNCE_TIME: process.env.DEBOUNCE_TIME
            }
        }
        //console.log(this.envCache)
        return this.envCache
    }

    static get(key: string): string | undefined {
        if (!this.envCache) {
            this.load()
        }
        return this.envCache[key]
    }
}

export default EnvLoader;
