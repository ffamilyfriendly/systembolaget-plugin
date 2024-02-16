import CacheMap from "../cacheMap"
import { log } from "../contentScript"

export type beerInfo = {
    brewery:    string,
    beer_name_row1:  string,
    beer_name_row2?: string|null,
    ABV: number,
    ref: Element
}

export type apiHit = {
    beer_abv: number,
    beer_index: string,
    beer_index_short: string,
    beer_name: string,
    beer_name_sort: string,

    brewery_alias: string[],
    brewery_name: string,
    brewery_name_sort: string,

    in_production: boolean,

    popularity: number,
    ratings_count: number,
    rating_score: number,

    objectID: string,

    matchScore: number
}

type apiResponse = {
    hitsPerPage: number,
    nbHits: number,
    nbPages: number,
    page: number,
    params: string,
    processingTimeMS: number,
    query: string,
    hits: apiHit[]
}

const cache = new CacheMap<string, apiHit>("untappd")

// stolen from https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely

function editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

function similarity(s1: string, s2: string) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toString());
  }

function inRange(x: number, min: number, max: number) {
    return ((x-min)*(x-max) <= 0);
}

export default function getBeer(beer: beerInfo): Promise<apiHit|undefined> {
    return new Promise((resolve, reject) => {

        if(cache.has(beer.beer_name_row1)) {
            log(`cache hit: ${beer.beer_name_row1}`)
            return resolve(cache.get(beer.beer_name_row1))
        }

        fetch("https://9wbo4rq3ho-dsn.algolia.net/1/indexes/beer/query?x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%203.24.8&x-algolia-application-id=9WBO4RQ3HO&x-algolia-api-key=1d347324d67ec472bb7132c66aead485", {
            "credentials": "omit",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
                "Accept": "application/json",
                "Accept-Language": "sv,en-US;q=0.7,en;q=0.3",
                "content-type": "application/x-www-form-urlencoded",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site",
                "Sec-GPC": "1"
            },
            "referrer": "https://untappd.com/",
            "body": `{\"params\":\"query=${encodeURIComponent(beer.beer_name_row1 + (beer.beer_name_row2 != null ? ` ${beer.beer_name_row2}` : ""))}&hitsPerPage=20&clickAnalytics=true&analytics=true\"}`,
            "method": "POST",
            "mode": "cors",
            "cache": "force-cache"
        })
        .then(res => {
            res.json()
                .then(json => {
                    const resp: apiResponse = json 
                    
                    const beerListing = resp.hits

                    for(const b of beerListing) {
                        if(!b.matchScore) b.matchScore = 0

                        if(inRange(b.beer_abv, beer.ABV - 0.2, beer.ABV + 0.2)) b.matchScore + 0.5
                        b.matchScore += similarity(b.beer_name, beer.beer_name_row1)
                        if(beer.beer_name_row2) b.matchScore += similarity(b.beer_name, beer.beer_name_row2)
                    }

                    const beerHit = beerListing.filter(x => inRange(x.beer_abv, beer.ABV - 0.2, beer.ABV + 0.2)).sort((b, a) => a.matchScore - b.matchScore).shift()
                    if(beerHit) cache.set(beer.beer_name_row1, beerHit)

                    resolve(beerHit)
                })
                .catch(reject)
        })
        .catch(reject)
    })
}