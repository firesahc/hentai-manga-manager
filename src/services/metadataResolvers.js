import { createEhentaiProvider } from './metadataProviders/ehentai.js'
import { createHentagProvider } from './metadataProviders/hentag.js'
import { createNhentaiProvider } from './metadataProviders/nhentai.js'
import { createEhviewerProvider } from './metadataProviders/ehviewer.js'

export const createMetadataResolvers = (deps) => {
  const providers = [
    createEhentaiProvider(deps),
    createHentagProvider(deps),
    createNhentaiProvider(deps),
    createEhviewerProvider(deps),
  ]

  const metadataResolverMap = {}
  const bookInfoResolverList = []
  const searchResolverMap = {}
  const redirectUrlResolverMap = {}

  providers.forEach((provider) => {
    provider.metadataTypes.forEach((type) => {
      metadataResolverMap[type] = provider.getBookInfo
    })
    if (provider.getBookInfo && provider.urlMatch) {
      bookInfoResolverList.push({
        match: provider.urlMatch,
        resolve: provider.getBookInfo
      })
    }
    _.assign(searchResolverMap, provider.searchResolvers)
    _.assign(redirectUrlResolverMap, provider.redirectResolvers)
  })

  return {
    metadataResolverMap,
    bookInfoResolverList,
    searchResolverMap,
    redirectUrlResolverMap,
  }
}
