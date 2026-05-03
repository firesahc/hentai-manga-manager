<template>
  <el-dialog v-model="dialogVisibleEhSearch"
    width="60vw"
    :title="$t('m.search')"
    destroy-on-close
    class="dialog-search"
  >
    <el-form :inline="true">
      <el-form-item>
        <el-input
          v-model="searchStringDialog"
          @keyup.enter="getBookListFromWeb(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog, bookDetail.filepath)"
          class="search-input"
        >
          <template #append>
            <el-select class="search-type-select" v-model="searchTypeDialog">
              <el-option v-for="searchType in searchTypeList" :key="searchType.value" :label="searchType.label" :value="searchType.value" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary" plain :icon="Search32Filled"
          @click="getBookListFromWeb(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog, bookDetail.filepath)"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary" plain :icon="Link"
          @click="redirectSearch(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog)"
        />
      </el-form-item>
    </el-form>
    <div v-loading="searchResultLoading">
      <div class="search-result" v-if="ehSearchResultList.length > 0">
        <p
          v-for="result in ehSearchResultList"
          :key="result.url"
          @click="resolveSearchResult(bookDetail.id, result.url, result.type)"
          class="search-result-ind"
        >{{result.title}}</p>
      </div>
      <el-empty v-else :description="$t('m.noResults')" :image-size="100" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Search32Filled } from '@vicons/fluent'
import { Link } from '@element-plus/icons-vue'
import { createMetadataResolvers } from '../services/metadataResolvers.js'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const {
  searchTypeList, categoryOption,
  setting, bookList, serviceAvailable,
  cookie, tag2cat
} = storeToRefs(appStore)
const { printMessage, returnTrimFileName, saveBook } = appStore

const { t } = useI18n()

const dialogVisibleEhSearch = ref(false)
const searchResultLoading = ref(false)
const searchStringDialog = ref('')
const searchTypeDialog = ref('')
const ehSearchResultList = ref([])
const bookDetail = ref({})

const openSearchDialog = (book, server) => {
  if (!searchTypeDialog.value) searchTypeDialog.value = setting.value.defaultScraper || 'exhentai'
  dialogVisibleEhSearch.value = true
  bookDetail.value = _.cloneDeep(book)
  if (server) searchTypeDialog.value = server
  ehSearchResultList.value = []
  searchStringDialog.value = returnTrimFileName(bookDetail.value)
  getBookListFromWeb(bookDetail.value.hash.toUpperCase(), searchStringDialog.value, searchTypeDialog.value, bookDetail.value.filepath)
}

const {
  metadataResolverMap,
  bookInfoResolverList,
  searchResolverMap,
  redirectUrlResolverMap
} = createMetadataResolvers({
  ipcRenderer,
  cookie,
  categoryOption,
  tag2cat,
  t,
  printMessage,
  saveBook,
  serviceAvailable,
  ehSearchResultList
})

const resolveSearchResult = (bookId, url, type) => {
  const book = _.find(bookList.value, {id: bookId})
  const metadataResolver = metadataResolverMap[type]
  if (!metadataResolver) return
  book.url = url
  metadataResolver(book)
  dialogVisibleEhSearch.value = false
}

const getBookInfo = (book) => {
  const resolver = _.find(bookInfoResolverList, ({ match }) => match(book.url))?.resolve
  if (resolver) resolver(book)
}

const getBooksMetadata = async (bookList, gap, callback) => {
  const server = setting.value.defaultScraper || 'exhentai'
  serviceAvailable.value = true
  const timer = ms => new Promise(res => setTimeout(res, ms))
  const messageInstance = ElMessage({
    message: t('c.gettingMetadata'),
    type: 'success',
    duration: 0,
    showClose: true,
    onClose: () => {
      serviceAvailable.value = false
    }
  })
  for (let i = 0; i < bookList.length; i++) {
    ipcRenderer.invoke('set-progress-bar', (i + 1) / bookList.length)
    const book = bookList[i]
    try {
      if (serviceAvailable.value) {
        if (!book.url) {
          const resultList = await getBookListFromWeb(
            book.hash.toUpperCase(),
            returnTrimFileName(book),
            server,
            book.filepath
          )
          resolveSearchResult(book.id, resultList[0].url, resultList[0].type)
        } else {
          getBookInfo(book)
        }
        await timer(gap)
      }
    } catch (error) {
      book.status = 'tag-failed'
      await saveBook(book)
      console.error(error)
    }
  }
  messageInstance.close()
  ipcRenderer.invoke('set-progress-bar', -1)
  printMessage('success', t('c.getMetadataComplete'))
  if (callback) callback()
}

const getBookListFromWeb = async (bookHash, title, server = 'e-hentai', bookPath = '') => {
  searchResultLoading.value = true
  const searchResolver = searchResolverMap[server]
  const resultList = searchResolver ? await searchResolver({ bookHash, title, bookPath }) : []
  searchResultLoading.value = false
  return resultList
}

const redirectSearch = (bookHash, title, server = 'e-hentai') => {
  let url
  switch (server) {
    case 'e-hentai':
      url = `https://e-hentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`
      break
    case 'exhentai':
      url = `https://exhentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`
      break
    case 'e-search':
      url = `https://e-hentai.org/?f_search=${encodeURI(title)}&f_cats=161`
      break
    case '.ehviewer':
    case 'exsearch':
      url = `https://exhentai.org/?f_search=${encodeURI(title)}&f_cats=161`
      break
    case 'hentag':
      url = `https://hentag.com/?t=${encodeURI(title)}`
      break
    case 'nhentai':
      url = `https://nhentai.net/search/?q=${encodeURI(title)}`
      break
  }
  ipcRenderer.invoke('open-url', url)
}

defineExpose({
  dialogVisibleEhSearch,
  openSearchDialog,
  getBookInfo,
  getBooksMetadata,
})

</script>

<style lang="stylus">
.dialog-search
  .el-form-item
    margin-right: 4px
  .search-input
    width: calc(60vw - 152px)
  .search-type-select
    width: 160px
  .search-result-ind
    cursor: pointer
    text-align: left
    margin: 8px 0
  .search-result-ind:hover
    background-color: var(--el-fill-color-dark)
</style>