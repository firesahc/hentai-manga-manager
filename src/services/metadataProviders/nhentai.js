export const createNhentaiProvider = ({ ehSearchResultList, saveBook, printMessage, t }) => {
  const resolveNhentaiResult = async (title) => {
    const result = []
    try {
      const apiData = await fetch(`https://nhentai.net/api/v2/search?query=${encodeURIComponent(title)}&page=1`).then(res => res.json())
      const apiResultList = apiData.result || []
      apiResultList.forEach((item) => {
        if (!item?.id) return
        result.push({ title: item.english_title || item.japanese_title || title, url: `https://nhentai.net/g/${item.id}/`, type: 'nhentai' })
      })
    } catch (e) {
      console.log(e)
    }
    try {
      const htmlString = await fetch(`https://nhentai.net/search/?q=${encodeURIComponent(title)}`).then(res => res.text())
      const nodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('a.cover')
      nodes.forEach((node) => {
        const href = node.getAttribute('href') || ''
        const caption = node.querySelector('.caption')?.textContent
        const alt = node.querySelector('img')?.getAttribute('alt')
        if (!href || !href.startsWith('/g/')) return
        const url = `https://nhentai.net${href}`
        if (!result.find(item => item.url === url)) result.push({ title: caption || alt || title, url, type: 'nhentai' })
      })
    } catch (e) {
      console.log(e)
    }
    ehSearchResultList.value = result
    return ehSearchResultList.value
  }

  const getBookInfoFromNhentai = async (book) => {
    const match = /\/g\/(\d+)\//.exec(book.url)
    if (!match) return
    try {
      const data = await fetch(`https://nhentai.net/api/v2/galleries/${match[1]}`).then(res => res.json())
      const tags = _.chain(data.tags).groupBy(tag => tag.type === 'other' ? 'misc' : tag.type).mapValues(group => group.map(tag => tag.name)).value()
      _.assign(book, {
        title: data.title?.english || data.title?.pretty || data.title?.japanese || book.title,
        title_jpn: data.title?.japanese || '',
        filecount: +data.num_pages || 0,
        posted: +data.upload_date || 0,
        category: _.startCase(data.tags?.find(tag => tag.type === 'category')?.name || 'Doujinshi'),
        tags
      })
      book.status = 'tagged'
      await saveBook(book)
    } catch (e) {
      console.log(e)
      book.status = 'tag-failed'
      printMessage('error', t('c.getMetadataFailed'))
      await saveBook(book)
    }
  }

  return {
    metadataTypes: ['nhentai'],
    urlMatch: (url) => url.includes('nhentai.net'),
    searchResolvers: {
      nhentai: async ({ title }) => resolveNhentaiResult(title)
    },
    redirectResolvers: {
      nhentai: ({ title }) => `https://nhentai.net/search/?q=${encodeURI(title)}`
    },
    getBookInfo: getBookInfoFromNhentai,
  }
}
