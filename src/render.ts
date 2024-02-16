import { log } from "./contentScript";
import { getBeerInfo, getBeerInfoList } from "./scraper";
import getBeer, { apiHit } from "./untappd/test";

// stolen from: https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
function waitForElm(selector: string) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function generateStar(fill: number): Element {
    const template = document.createElement("template")
    // this is bad practise but cba

    const id = Math.floor(Math.random() * 10_000_000)

    const star = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1rem" height="1rem" viewBox="0 0 32 32">
    <defs>
      <linearGradient id="${id}">
        ${ fill == 0 ? "" : `<stop offset="${fill}%" stop-color="rgb(9, 87, 65)"/>` }
        <stop offset="${100 - fill}%" stop-color="rgba(0, 0, 0, 0.18)" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <path fill="url(#${id})" d="M20.388,10.918L32,12.118l-8.735,7.749L25.914,31.4l-9.893-6.088L6.127,31.4l2.695-11.533L0,12.118
  l11.547-1.2L16.026,0.6L20.388,10.918z"/>
  </svg>
    `
    template.innerHTML = star

    return template.content.children[0]
}

function generateStars(rating: number): Element {
    const div = document.createElement("div")
    div.style.setProperty("height", "1rem")
    div.style.setProperty("display", "flex")
    div.style.setProperty("align-items", "center")

    for(let i = 0; i < Math.floor(rating); i++) {
        div.append(generateStar(100))
    }

    div.append(generateStar( (rating - Math.floor(rating)) * 100 ))

    for(let i = div.children.length; i < 5; i++) {
        div.append(generateStar(0))
    }

    return div
}

function generateStarRow(data: apiHit) {
    const div           = document.createElement("div")
    const name          = document.createElement("a")
    const starContainer = document.createElement("div")
    const ratingsText   = document.createElement("span")
    
    name.innerText = data.beer_name
    name.style.setProperty("display", "block")
    name.href = `https://untappd.com/b/${data.brewery_name}/${data.objectID}`

    ratingsText.innerText = data.rating_score.toFixed(1).toString()
    ratingsText.style.setProperty("display", "block")

    div.style.setProperty("display", "flex")
    div.style.setProperty("align-items", "center")
    div.style.setProperty("justify-content", "space-between")
    div.style.setProperty("text-align", "center")
    div.className = "plugin-star-row"

    starContainer.style.setProperty("display", "flex")
    starContainer.style.setProperty("align-items", "center")
    starContainer.style.setProperty("justify-content", "center")
    starContainer.style.setProperty("gap", "0.5rem")

    starContainer.append(ratingsText, generateStars(data.rating_score))
    div.append(name, starContainer)

    return div
}

function attachStarRow(listing: Element, starRow: Element) {
    const element = listing.querySelector(".css-1korc2k.e18roaja0") ?? listing.querySelector(".css-6df2t1.e18roaja0")
    listing.setAttribute("ext-handled", "true")
    element?.append(starRow)
}

export async function EntityViewRender() {
    log("Rendering: entity view")
    await waitForElm(".css-18u135q.e5nuzct0")

    const beer = getBeerInfo()
    const beerInfo = await getBeer(beer)

    //if(beer.ref.querySelector(".plugin-star-row")) return

    if(beerInfo) attachStarRow(beer.ref, generateStarRow(beerInfo))
       
}

export async function ListViewRender() {
    const config = { childList: true, subtree: false };

    let lastLen = 0
    const observer = new MutationObserver(function(mutations) {
        for(const mutation of mutations) {
            if(mutation.type === "childList") {
                if(mutation.addedNodes.length !== lastLen) {
                    lastLen = mutation.addedNodes.length
                    log("list has been mutated. Rendering ListView again.")
                    observer.disconnect()
                    ListViewRender()
                }
            }
        }
    })



    log("Rendering: list view")

    await waitForElm("div.css-176nwz9.e18roaja0")

    const beerListElement = document.querySelector("div.css-176nwz9.e18roaja0")
    if(beerListElement) observer.observe(beerListElement, config)

    const beers = getBeerInfoList()

    for(const beer of beers) {
        if(!beer.ref.querySelector(".css-hksddn.e1hb4h4s0")?.textContent?.toLocaleLowerCase().includes("öl")) continue;
        if(beer.ref.getAttribute("ext-handled") || beer.ref.querySelector(".plugin-star-row")) {
            log(`beer ${beer.beer_name_row1} already handled. Skipping`)
            continue;
        }
        const data = await getBeer(beer)

        if(data) {
            const starRow = generateStarRow(data)
            attachStarRow(beer.ref, starRow)
        }
    }
    
}