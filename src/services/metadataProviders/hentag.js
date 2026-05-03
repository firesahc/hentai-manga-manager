export const createHentagProvider = ({ categoryOption, tag2cat, ehSearchResultList, saveBook }) => {
  const resolveHentagResult = (data) => {
    const resultList = data.works.slice(0, 30)
    ehSearchResultList.value = []
    resultList.forEach((result) => {
      const findExUrl = result.locations.find((location) => location.startsWith('https://exhentai.org'))
      if (findExUrl) {
        ehSearchResultList.value.push({ title: result.title, url: findExUrl, type: 'e-hentai' })
      } else {
        ehSearchResultList.value.push({ title: result.title, url: `https://hentag.com/vault/${result.id}`, type: 'hentag' })
      }
    })
    return ehSearchResultList.value
  }

  const getBookInfoFromHentag = async (book) => {
    const data = await fetch(`https://hentag.com/public/api/vault/${book.url.slice(25)}`).then(res => res.json())
    const tags = {}
    data.language === 11 ? tags.language = ['chinese', 'translated'] : ''
    data.parodies.length > 0 ? tags.parody = data.parodies.map(parody => parody.name) : ''
    data.characters.length > 0 ? tags.character = data.characters.map(character => character.name) : ''
    data.circles.length > 0 ? tags.group = data.circles.map(circle => circle.name) : ''
    data.artists.length > 0 ? tags.artist = data.artists.map(artist => artist.name) : ''
    data.maleTags.length > 0 ? tags.male = data.maleTags.map(maleTag => maleTag.name) : ''
    data.femaleTags.length > 0 ? tags.female = data.femaleTags.map(femaleTag => femaleTag.name) : ''
    if (data.otherTags.length > 0) {
      data.otherTags.forEach(({ name }) => {
        const cat = tag2cat.value[name]
        if (cat) {
          if (tags[cat]) tags[cat].push(name)
          else tags[cat] = [name]
        } else {
          if (tags.misc) tags.misc.push(name)
          else tags.misc = [name]
        }
      })
    }
    _.assign(book, { title: data.title, posted: Math.floor(data.createdAt / 1000), category: categoryOption.value[data.category - 1], tags })
    book.status = 'tagged'
    await saveBook(book)
  }

  return {
    metadataTypes: ['hentag'],
    urlMatch: (url) => url.startsWith('https://hentag.com'),
    searchResolvers: {
      hentag: async ({ title }) => fetch(`https://hentag.com/public/api/vault-search?t=${encodeURI(title)}`).then(res => res.json()).then(resolveHentagResult)
    },
    redirectResolvers: {
      hentag: ({ title }) => `https://hentag.com/?t=${encodeURI(title)}`
    },
    getBookInfo: getBookInfoFromHentag,
  }
}
