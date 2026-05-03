export const createEhviewerProvider = ({ ipcRenderer, ehSearchResultList }) => {
  return {
    metadataTypes: [],
    urlMatch: () => false,
    searchResolvers: {
      '.ehviewer': async ({ title, bookPath }) => {
        const ehviewerData = await ipcRenderer.invoke('get-ehviewer-data', bookPath)
        ehSearchResultList.value = []
        if (!ehviewerData) return []
        const resultList = [{ title, url: `https://exhentai.org/g/${ehviewerData.gid}/${ehviewerData.token}/`, type: 'e-hentai' }]
        ehSearchResultList.value = resultList
        return resultList
      }
    },
    redirectResolvers: {
      '.ehviewer': ({ title }) => `https://exhentai.org/?f_search=${encodeURI(title)}&f_cats=161`
    },
    getBookInfo: null,
  }
}
