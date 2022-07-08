const axios = require("axios");
const { resolve } = require("path");
const cheerio = require("cheerio");
const moment = require("moment");

const dir = './src/assets/bilibili';

let requestResultList = null;

function getTypeComic(type) {
   return axios({
      url: `https://api.bilibili.com/pgc/web/timeline?types=${type}&before=0&after=0`,
      mmethod: 'GET',
   })
}

async function handleOutput(callbackSetList) {
   callbackSetList([{
      title: `正在查询中，请稍后`,
      description: '如果长时间未加载，请重试',
   }]);
   try {
      const results = await Promise.all([
         getTypeComic('1'),
         getTypeComic('4'),
      ]);
      const list = results.filter(res => !res.data.code).map(res => res.data.result[0].episodes).flat().sort((a, b) => a.pub_ts - b.pub_ts)
      const resp = await axios({
         url: 'http://dilidili.in/',
         method: 'get',
      })

      // 新增dilidili番剧来源
      const $ = cheerio.load(resp.data);
      const eles = $(`#con_dm_${moment().day()} li`).map(function (i, el) {
         return {
            title: $(this).text(),
            description: '来源: D站',
            url: `http://dilidili.in${$(this).find('a').attr('href')}`,
            icon: resolve('./logo.png'),
         };
      }).get();
      const allList = requestResultList = list.map((val, ind) => ({
         title: `${val.title}`,
         description: `${val.pub_index} 时间: ${val.pub_time} 来源: B站`,
         url: `https://www.bilibili.com/bangumi/play/ss${val.season_id}`,
         icon: val.square_cover,
      })).concat(eles);
      if (allList.length) {
         callbackSetList(allList);
      } else {
         callbackSetList([{
            title: `该番剧也许不在今日播出呢`,
            description: '回车搜索',
            url: `https://www.baidu.com/s?wd=${searchWord}`
         }]);
      }
   } catch (err) {
      callbackSetList([{
         title: `该番剧也许不在今日播出呢`,
         description: '回车搜索',
         url: `https://www.baidu.com/s?wd=${searchWord}`
      }]);
   }
}

window.exports = {
   "utools-comic": {
      mode: "list",
      args: {
         enter: (action, callbackSetList) => {
            handleOutput(callbackSetList);
         },
         search: async (action, searchWord, callbackSetList) => {
            const filterList = requestResultList.filter(val => searchWord ? val.title.includes(searchWord) : true);
            callbackSetList(filterList);
         },
         // 用户选择列表中某个条目时被调用
         select: (action, itemData) => {
            window.utools.hideMainWindow()
            require('electron').shell.openExternal(itemData.url)
            // 保证网页正常跳转再关闭插件
            setTimeout(() => {
               window.utools.outPlugin()
            }, 500);
         },
         placeholder: '请输入番剧名称进行筛选',
      },
   }
}