<template>
  <v-app>
    <v-content>
      <h1 class="app-title mt-5" id="title" title="台灣各地區藥局口罩數量現況">台灣各地區藥局口罩數量現況</h1>
      <div class="container">
        <div class="row mt-md-5">
          <div class="col-md-4">
            <div class="content mb-5">
              <div class="control-area">
                <div class="search-input">
                <v-text-field class="mb-5"
                              label="依縣市、地址或藥局名稱快速搜尋"
                              v-model="searchStr"
                              :rules="searchRules"
                              hide-details="auto"
                              @keydown.enter="quickSearch()"></v-text-field>
                </div>
                <div class="search-items">
                  <v-switch v-model="showOnlyHave" 
                            :label="`只顯示有口罩的店家`" 
                            hide-details
                            color="teal darken-1"
                            small></v-switch>
                  <v-btn  class="search-btn white--text"
                          @click="quickSearch()"
                          small
                          :width="60"
                          color="teal darken-1"
                          :disabled="searchStr.length < 2"
                          :loading="apiLoading">查詢
                  </v-btn>
                </div>
              </div>
            </div>
            <div class="content" v-show="mapPoint.length > 0">
              <div class="total-response">
                <div class="left">
                  <span class="sort-items mr-3"
                        :class="{'active':!sortSwitch}"
                        @click="sortSwitch = false">
                        最多成人口罩
                  </span>
                  <span class="sort-items"
                        :class="{'active':sortSwitch}"
                        @click="sortSwitch = true">
                        最多兒童口罩
                  </span>
                </div>
                <div class="right">
                  {{'共 '+ mapPoint.length + ' 筆資料'}}
                </div>
              </div>
              <div class="info-table cus-scrollbar">
                <div  class="info-items"
                      v-for="(item, index) in mapPoint" 
                      :key="index"
                      :class="{'item-active':item.active}"
                      @click.stop="toggleInfoWindow(item,index)"
                      v-scroll-to="'#map'">
                  <div class="items-title items-row">{{item.info.name}}</div>
                  <div class="items-row">
                    <div class="row-title">成人口罩數</div>
                    <div class="row-content">{{item.info.mask_adult}}</div>
                  </div>
                  <div class="items-row">
                    <div class="row-title">兒童口罩數</div>
                    <div class="row-content">{{item.info.mask_child}}</div>
                  </div>
                  <div class="items-row">
                    <div class="row-title">地址</div>
                    <div class="row-content ellipsis" 
                         :title="item.info.address">
                         {{item.info.address}}
                    </div>
                  </div>
                  <div class="items-row">
                    <div class="row-title">電話</div>
                    <div class="row-content">{{item.info.phone}}</div>
                  </div>
                  <div class="items-row">
                    <div class="row-title">更新時間</div>
                    <div class="row-content">{{item.info.updated}}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-8" id="map">
            <div class="content">
              <GmapMap
                ref="mapRef"
                :center="centerPoint"
                :zoom="15"
                :options="{
                  mapTypeControl: false}"
                style="width: 100%; height: 535px"
              >
              <gmap-info-window :options="infoOptions" 
                                :position="infoWindowPos" 
                                :opened="infoWinOpen">
              </gmap-info-window>
              <GmapMarker
                  :key="index"
                  v-for="(item, index) in mapPoint"
                  :position="item.position"
                  :title="item.title"
                  :infoWindow="'<h1>999</h1>'"
                  :clickable="true"
                  @click="toggleInfoWindow(item,index)"
                />
              </GmapMap>
            </div>
          </div>
        </div>
      </div>
      <div class="back-to-top" v-scroll-to="'#title'">
        <v-icon dark>mdi-menu-up</v-icon>
      </div>
      <v-dialog  v-model="errorShow"
                 width="200">
        <v-card>
          <v-card-title>
          </v-card-title>
          <v-card-text class="pb-0">
            <p class="text-center mt-5 mb-5">{{errMsg}}</p>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn  color="teal darken-1" text @click="errorShow = false">
              OK
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-content>
  </v-app>
</template>

<script>
const axios = require('axios').default;
export default {
  name: 'App',
  components: {
  },
  data: () => ({
    centerPoint:{lat:25.033964, lng:121.564468},
    mapPoint: [],
    originData:null,
    searchStr:'',
    searchRules:[
      v => v.length > 1 || '請輸入2個字元以上',
      v => v !== '藥局'  || '搜尋條件過於廣泛'
    ],
    showOnlyHave:true,
    apiLoading: false,
    infoWindowPos: null,
    infoWinOpen: false,
    currentMidx: null,
    infoOptions: {
    content: '',
      //optional: offset infowindow so it visually sits nicely on top of our marker
      pixelOffset: {
        width: 0,
        height: -35
      }
    },
    updatedTime: '',
    sortSwitch: false,
    periodsMap: {
      'N':'O',
      'Y':'X'
    },
    errorShow: false ,
    errMsg: ''
  }),
  created() {
    this.showOnlyHave = true
    this.getData()
  },
  mounted() {
  },
  methods: {
    setUserLocation(){
      let self = this
        if(navigator.geolocation) {
          function success(position){
            self.centerPoint.lng = position.coords.longitude
            self.centerPoint.lat = position.coords.latitude
            self.getStreet()
          }
          function error(){
            alert('請確認網址是否為https://')
            console.error('無法定位')
          }
          navigator.geolocation.getCurrentPosition(success,error)
        }
    },
    setPoint(data){
      let arr = []
      data.forEach((item,index)=>{
        if(index === 0)
            this.updatedTime = item.properties.update
        let periods = item.properties.service_periods.split('')
        let obj = {
          title:item.properties.name,
          total:parseInt(item.properties.mask_adult) + parseInt(item.properties.mask_child),
          info:{
            name: item.properties.name,
            mask_adult:item.properties.mask_adult,
            mask_child:item.properties.mask_child,
            address:item.properties.address,
            phone:item.properties.phone,
            note:item.properties.note,
            updated: item.properties.updated
          },
          position:{
            lng:item.geometry.coordinates[0],
            lat:item.geometry.coordinates[1]
          },
          infoText:`
          <h3 style="font-weight: bold;">${item.properties.name}</h3>
          <div>成人口罩數: ${item.properties.mask_adult}</div>
          <div>兒童口罩數: ${item.properties.mask_child}</div>
          <div>地址: ${item.properties.address}</div>
          <div>電話: ${item.properties.phone}</div>
          <div>備註: </div>
          <div style="max-width: 200px">${item.properties.note}</div>
          `,
          active: false
        }              
        if(this.showOnlyHave)
          obj.total > 0 ? arr.push(obj) : null
        else
          arr.push(obj)
      })
        return arr
    },
    quickSearch(){
      if(this.searchStr === '藥局')
      {
        this.errMsg = '關鍵字"藥局"過於廣泛請輸入其他關鍵字'
        return this.errorShow = true
      }
      if(!this.searchStr)
      {
        this.errMsg = '輸入關鍵字即可查詢'
        return this.errorShow = true
      }
      if(this.searchStr.length < 2)
      {
        this.errMsg = '關鍵字需超過2個字'
        return this.errorShow = true
      }
      this.errMsg = ''
      this.mapPoint = []
      this.apiLoading = true
      let tempArr = []
      tempArr = this.originData.filter(item=>{
        return item.properties.address.indexOf(this.searchStr) > -1 || 
                item.properties.name.indexOf(this.searchStr) > -1
      })
      this.mapPoint = this.setPoint(tempArr)
      this.apiLoading = false
      this.sortTotal(this.sortSwitch)
      if(this.mapPoint.length > 0){
        this.centerPoint =  {
                              lng: this.mapPoint[0].position.lng,
                              lat: this.mapPoint[0].position.lat
                            }
      }
      else
      {
        this.errMsg = '查無資料'
        return this.errorShow = true
      }
      
    },
    toggleInfoWindow(marker, idx) {
      this.infoWindowPos = marker.position;
      this.infoOptions.content = marker.infoText;
      this.$refs.mapRef.$mapPromise.then((map) => {
        map.panTo(marker.position)
      })
      this.mapPoint.forEach(item=>{
        item.active = false
      })
      marker.active = true
      //check if its the same marker that was selected if yes toggle
      if (this.currentMidx == idx) {
        this.infoWinOpen = !this.infoWinOpen;
      }
      //if different marker set infowindow to open and reset current marker index
      else {
        this.infoWinOpen = true;
        this.currentMidx = idx;
      }
    },
    getData(){
      const self = this
      this.apiLoading = true
      this.mapPoint = []
      this.searchStr = ''
      axios
      .get('https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json')
      .then(response => {
        this.originData = response.data.features
        this.setUserLocation()
      })
    },
    sortTotal(data){
      if(data){
        this.mapPoint.sort((a, b)=>{
          return parseInt(b.info.mask_child) - parseInt(a.info.mask_child);
        })
      }else{
        this.mapPoint.sort((a, b)=>{
          return parseInt(b.info.mask_adult) - parseInt(a.info.mask_adult);
        })
      }
    },
    getStreet(){
      axios
      .get('https://maps.googleapis.com/maps/api/geocode/json',
      { params: { 
          key: process.env.VUE_APP_MAP_KEY,
          language:'zh-TW',
          latlng:`${this.centerPoint.lat},${this.centerPoint.lng}`
        } 
      })
      .then(response => {
        let index = 0
        if(response.data.results[0] && response.data.results[0].address_components.length > 4)
            index = response.data.results[0].address_components.length - 4
        let userStreet = response.data.results[0].address_components[index].long_name || ''
        this.searchStr = userStreet
        this.quickSearch()
      })
    },
  },
  watch: {
    showOnlyHave(){
      this.quickSearch()
    },
    sortSwitch(data){
        this.sortTotal(data)
    }
  },
};
</script>
<style lang="scss" scoped>
$mainColor:#00897B;
#app{
  .app-title{
    text-align: center;
  }
  .content{
    border: 1px solid #bababa;
    border-radius: 5px;
    padding: 5px;
  }
  .control-area{
    height: 100px;
    .search-input{
      height: calc(100% - 50px);
    }
    .search-items{
      position: relative;
      height: 50px;
      display: flex;
      align-items: flex-end;
      .search-btn{
        position: absolute;
        right: 0;
      }
    }
  }
  .info-table{
    height: 380px;
    overflow: auto;
    font-family: 'Microsoft JhengHei';
    padding: 5px;
    .info-items{
      border: 1px solid #bababa;
      border-radius: 5px;
      margin-bottom: 10px;
      border-top: none;
      cursor: pointer;
      transition: all 0.3s;
      &:hover{
        box-shadow: -2px 2px 4px #707070;
      }
      .items-title{
        color: white;
        background-color: $mainColor;
        border-radius: 5px 5px 0px 0px;
        height: 35px;
        line-height: 35px;
      }
      .items-row{
        display: flex;
        padding-left: 5px;
        .row-title{
          width: 100px;
        }
        .row-content{
          width: calc(100% - 100px);
        }
      }
    }
    .item-active{
      .items-title{
        color: white;
        background-color: #00534b;
      }
      border-color: $mainColor;
    }
  }
  .total-response{
    font-size: 12px;
    height: 20px;
    width: 100%;
    display: flex;
    .left{
      padding-left: 5px;
      width: 180px;
      .sort-items{
        cursor: pointer;
        transition: all 0.3s;
        &:hover{
          color: $mainColor;
        }
      }
      .active{
        color: $mainColor;
        font-weight: bold;
      }
    }
    .right{
      width: calc(100% - 180px);
      text-align: right;
    }
  }
  .back-to-top{
    border-radius: 50px;
    background-color: hsla(0, 0%, 0%, 0.5);
    width: 35px;
    height: 35px;
    position: fixed;
    bottom: 10px;
    right: 10px;
    color: white;
    font-size: 12px;
    text-align: center;
    line-height: 35px;
    padding-bottom: 5px;
  }
}
@media only screen and (max-width: 600px){
    #app{
      .app-title{
        font-size: 20px;
      }
    }
}
</style>
<style lang="scss">
html{
  overflow-y: auto !important;
}
*{
  font-family: 'Microsoft JhengHei';
}
.cus-scrollbar{
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    border-radius: 10px;
    background-color: #e0e0e0;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: #a7a7a7;
  }
  &::-webkit-scrollbar-track:hover {
    border-radius: 10px;
    background-color: #f5f5f5;
  }
  &::-webkit-scrollbar-thumb:hover {
    border-radius: 10px;
    background-color: #bcbcbc;
  }
}
.ellipsis {
overflow:hidden;
white-space: nowrap;
text-overflow: ellipsis;
}

</style>