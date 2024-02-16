import { beerInfo } from "./untappd/test"

export function getBeerInfo(base: Element = document.body): beerInfo {
    const beerNameParent = base.querySelector(".css-18u135q.e5nuzct0") || base.querySelector(".css-18q0zs4.e3wog7r1")
    // This is absolutely haram
    const beerProducerElem = base.querySelector("#productInformation > div > div > div > div:nth-child(2) > p.css-a4n5dh.e1hb4h4s0")

    const abvElem = Array.from([...base.querySelectorAll("p.css-shsfoy.ed4i2bt0").values(), ...base.querySelectorAll("p.css-1r1n3du.e1yhfiwj0").values()]).filter(e => e?.textContent?.includes("%")).shift()

    if(!beerNameParent) throw new Error("Could not get parent element") 
    const vals = Array.from(beerNameParent.childNodes.values())

    let beerName2 = vals[1]?.textContent
    if(beerName2?.startsWith("Nr")) beerName2 = null

    return { beer_name_row1: vals[0]?.textContent ?? "beer", beer_name_row2: beerName2, brewery: beerProducerElem?.textContent ?? "producer", ABV: Number.parseFloat(abvElem?.textContent?.replace(",", ".") ?? "0"), ref: base }
}

export function getBeerInfoList(): beerInfo[] {
    return Array.from(document.querySelectorAll("div.css-1spqwqt.e18roaja0").values()).map(e => getBeerInfo(e))
}