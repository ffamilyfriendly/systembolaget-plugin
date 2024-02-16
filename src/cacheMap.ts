import { log } from "./contentScript";

type cacheItem<TKey, TValue> = { key: TKey, value: TValue }

export default class CacheMap<TKey, TValue> extends Map<TKey, TValue> {
    public cacheName: string;
    constructor(cachename: string) {
        super()

        this.cacheName = cachename

        this.loadFromCache()

        const func = this.saveToCache.bind(this)

        setInterval(func, 1000 * 30)
    }

    private saveToCache() {
        log("saving Set to cache")
        let toBeSaved: cacheItem<TKey, TValue>[] = [ ]

        const entries = super.entries()

        for(const e of Array.from(entries)) {
            toBeSaved.push({ key: e[0], value: e[1] })
        }

        localStorage.setItem(`cache_${this.cacheName}`, JSON.stringify(toBeSaved))
    }

    private loadFromCache() {
        const items = localStorage.getItem(`cache_${this.cacheName}`)

        if(items) {
            const itemArr: cacheItem<TKey, TValue>[] = JSON.parse(items)

            if(itemArr instanceof Array) {
                for(const item of itemArr) {
                    this.set(item.key, item.value)
                }
            }
        }
    }
}