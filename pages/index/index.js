
let Parse = require('../../parse');
Page({
  data: {
    showLogin: false,
    loading: false,
  },
  onLoad: function () {
    if (Parse.User.current()) {
      this._init();
    } else {
      let app = getApp();
      let that = this;
      app.userReadyCallback = res => {
        console.log(`index:onLoad:userReadyCallback:${Parse.User.current().get('username')}`)
        that._init();
      }
    }
  },
  /**
   * 处理获取到的用户昵称和头像
   * 1、获取昵称和头像
   * 2、存入parse对象中
   * 3、延时跳转
   * @param {*} e 
   */
  onGetUserInfoTop: function (e) {
    console.log(`index:getUserInfo::${JSON.stringify(e)}`)
    //设置按钮loading
    this.setData({ loading: true });
    //1、获取昵称和头像
    let nickName = e.detail.userInfo.nickName;
    let avatarUrl = e.detail.userInfo.avatarUrl;
    console.log(`index:onGetUserInfoTop:nickName:${nickName} avatarUrl:${avatarUrl}`)
    if (nickName && avatarUrl) {
      //2、存入parse对象中
      let that = this;
      let user = Parse.User.current();
      user.set('nickName', nickName);
      user.set('avatarUrl', avatarUrl);
      user.save().then(function (user) {
        that.setData({
          showLogin: false,
          loading: false
        });
        // 3、延时跳转
        setTimeout(function () {
          wx.switchTab({
            url: '../games/games'
          });
        }, 1000);
      }).catch(function (error) {
        that.setData({
          showLogin: true,
          loading: false
        });
      });
    } else {
      this.setData({
        showLogin: true,
        loading: false
      });
    }
  },
  //
  /**
   * 1、判断是否已经设置过昵称和头像
   * 2、已经设置过 直接跳转
   * 3、没有设置，显示一个按扭 让登录
   */
  _init: function () {
    let user = Parse.User.current();
    //1、判断是否已经设置过昵称和头像
    if (!user.get('nickName') || !user.get('avatarUrl')) {
      //3、没有设置，显示一个按扭 让登录
      this.setData({ showLogin: true });
    } else {
      wx.switchTab({
        url: '../games/games'
      });
    }
  }
})
