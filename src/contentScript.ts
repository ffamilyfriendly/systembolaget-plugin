import { EntityViewRender, ListViewRender } from "./render"
export const log = (text: string) => console.log(`[UNTAPPD PLUGIN] ${text}`)
const PATH_BASES = [ { match: "https://www.systembolaget.se/sortiment/", render: ListViewRender }, { match: "https://www.systembolaget.se/produkt/ol/", render: EntityViewRender } ]

let prevUrl = ""
const observer = new MutationObserver(function(mutations) {
    if(location.href !== prevUrl) {
        log("url changed")
        prevUrl = location.href

        for(const m of PATH_BASES) {
            if(location.href.startsWith(m.match)) {
                m.render()
                break;
            }
        }
    }
})

const config = { subtree: true, childList: true }
observer.observe(document, config)