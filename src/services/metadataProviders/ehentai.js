import he from 'he'

export const createEhentaiProvider = ({ ipcRenderer, cookie, serviceAvailable, printMessage, t, ehSearchResultList, saveBook }) => {
  const resolveEhentaiResult = (htmlString) => {
    try {
      const resultNodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('.gl3c.glname')
      ehSearchResultList.value = []
      resultNodes.forEach((node) => {
        ehSearchResultList.value.push({
          title: node.querySelector('.glink').innerHTML,
          url: node.querySelector('a').getAttribute('href'),
          type: 'e-hentai'
        })
      })
      return ehSearchResultList.value
    } catch (e) {
      console.log(e)
      if (htmlString.includes('Your IP address has been')) {
        serviceAvailable.value = false
        printMessage('error', t('c.ipBanned'))
      } else {
        printMessage('error', t('c.getMetadataFailed'))
      }
      return []
    }
  }

  const getBookInfoFromEh = async (book) => {
    const match = /(\d+)\/([a-z0-9]+)/.exec(book.url)
    const res = await ipcRenderer.invoke('post-data-ex', {
      url: 'https://api.e-hentai.org/api.php',
      data: { method: 'gdata', gidlist: [[+match[1], match[2]]], namespace: 1 }
    })
    try {
      _.assign(book, _.pick(JSON.parse(res).gmetadata[0], ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']))
      book.posted = +book.posted
      book.filecount = +book.filecount
      book.rating = +book.rating
      book.title = he.decode(book.title)
      book.title_jpn = he.decode(book.title_jpn)
      const tagObject = _.groupBy(book.tags, tag => /(.+):/.exec(tag)?.[1] || 'misc')
      _.forIn(tagObject, (arr, key) => {
        tagObject[key] = arr.map(tag => /:(.+)$/.exec(tag)?.[1] || tag)
      })
      book.tags = tagObject
      book.status = 'tagged'
      await saveBook(book)
    } catch (e) {
      console.log(e)
      if (_.includes(res, 'Your IP address has been')) {
        book.status = 'non-tag'
        printMessage('error', t('c.ipBanned'))
        await saveBook(book)
        serviceAvailable.value = false
      } else {
        book.status = 'tag-failed'
        printMessage('error', t('c.getMetadataFailed'))
        await saveBook(book)
      }
    }
  }

  return {
    metadataTypes: ['e-hentai'],
    urlMatch: (url) => url.includes('exhentai') || url.includes('e-hentai'),
    searchResolvers: {
      'e-hentai': async ({ bookHash }) => fetch(`https://e-hentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`).then(res => res.text()).then(resolveEhentaiResult),
      exhentai: async ({ bookHash }) => ipcRenderer.invoke('get-ex-webpage', { url: `https://exhentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`, cookie: cookie.value }).then(resolveEhentaiResult),
      'e-search': async ({ title }) => fetch(`https://e-hentai.org/?f_search=${encodeURI(title)}&f_cats=161`).then(res => res.text()).then(resolveEhentaiResult),
      exsearch: async ({ title }) => ipcRenderer.invoke('get-ex-webpage', { url: `https://exhentai.org/?f_search=${encodeURI(title)}&f_cats=161`, cookie: cookie.value }).then(resolveEhentaiResult),
    },
    redirectResolvers: {
      'e-hentai': ({ bookHash }) => `https://e-hentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`,
      exhentai: ({ bookHash }) => `https://exhentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`,
      'e-search': ({ title }) => `https://e-hentai.org/?f_search=${encodeURI(title)}&f_cats=161`,
      exsearch: ({ title }) => `https://exhentai.org/?f_search=${encodeURI(title)}&f_cats=161`,
    },
    getBookInfo: getBookInfoFromEh,
  }
}
